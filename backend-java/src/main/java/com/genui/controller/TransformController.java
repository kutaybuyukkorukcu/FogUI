package com.genui.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.genui.entity.User;
import com.genui.model.transform.TransformRequest;
import com.genui.model.transform.TransformResponse;
import com.genui.repository.UserRepository;
import com.genui.security.ApiKeyUserDetails;
import com.genui.service.ChatClientFactory;
import com.genui.service.StreamPatchGenerator;
import com.genui.service.TransformPrompts;
import com.genui.service.UIResponseParser;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Transform endpoint - the core FogUI middleware API.
 * <p>
 * This endpoint transforms raw LLM output into structured UI components.
 * Unlike /chat/completions, this doesn't call the customer's LLM.
 * Instead, customers call their own LLM and send the output here for
 * transformation.
 * <p>
 * Flow:
 * 1. Customer calls their LLM (with their own API key)
 * 2. Customer sends raw LLM response to POST /fogui/transform
 * 3. We use our LLM to restructure the content into UI components
 * 4. Customer renders using the FogUI SDK
 */
@Slf4j
@RestController
@RequestMapping("/fogui")
@RequiredArgsConstructor
public class TransformController {

    private static final String ERROR_KEY = "error";

    private final ChatClientFactory chatClientFactory;
    private final UIResponseParser responseParser;
    private final StreamPatchGenerator streamPatchGenerator;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final ExecutorService executor = Executors.newCachedThreadPool();

    /**
     * POST /genui/transform
     * Transform raw LLM text into structured UI components.
     * Requires API key authentication.
     */
    @PostMapping("/transform")
    public ResponseEntity<TransformResponse> transform(
            @AuthenticationPrincipal ApiKeyUserDetails userDetails,
            @RequestBody TransformRequest request) {

        User user = userDetails != null ? userDetails.getUser() : null;

        if (request.getContent() == null || request.getContent().isBlank()) {
            return ResponseEntity.badRequest()
                    .body(TransformResponse.error("Content is required"));
        }

        long startTime = System.currentTimeMillis();

        try {
            var chatClient = chatClientFactory.createClient();

            // Build context hints from request
            String contextHints = null;
            if (request.getContext() != null) {
                var ctx = request.getContext();
                var hints = new StringBuilder();
                if (ctx.getIntent() != null)
                    hints.append("Intent: ").append(ctx.getIntent()).append(". ");
                if (ctx.getPreferredComponents() != null) {
                    hints.append("Preferred components: ").append(String.join(", ", ctx.getPreferredComponents()))
                            .append(". ");
                }
                if (ctx.getInstructions() != null)
                    hints.append(ctx.getInstructions());
                contextHints = hints.toString();
            }

            // Create the transformation prompt
            var prompt = new Prompt(
                    new SystemMessage(TransformPrompts.TRANSFORM_SYSTEM_PROMPT),
                    new UserMessage(TransformPrompts.buildTransformPrompt(request.getContent(), contextHints)));
            var response = chatClient.prompt(prompt).call();
            var content = response.content();

            // Parse the UI response
            var uiResponse = responseParser.parse(content);

            if (uiResponse == null) {
                return ResponseEntity.status(500)
                        .body(TransformResponse.error("Failed to parse transformation result"));
            }

            // Calculate usage
            long processingTime = System.currentTimeMillis() - startTime;
            int estimatedTokens = (request.getContent().length() / 4) + (content.length() / 4);
            BigDecimal estimatedCost = new BigDecimal(estimatedTokens)
                    .divide(new BigDecimal("1000000"), 6, RoundingMode.HALF_UP)
                    .multiply(new BigDecimal("0.60")); // Approximate cost

            var usage = TransformResponse.TransformUsage.builder()
                    .transformTokens(estimatedTokens)
                    .model(chatClientFactory.getActiveModelName())
                    .processingTimeMs(processingTime)
                    .estimatedCost(estimatedCost)
                    .build();

            // Increment user's usage counter
            if (user != null) {
                user.incrementUsage();
                userRepository.save(user);
                log.debug("Usage incremented for user: {} ({}/{})",
                        user.getEmail(), user.getUsedThisMonth(), user.getMonthlyQuota());
            }

            log.info("Transform completed in {}ms, ~{} tokens", processingTime, estimatedTokens);

            return ResponseEntity.ok(TransformResponse.success(uiResponse, usage));

        } catch (Exception ex) {
            log.error("Transform error", ex);
            return ResponseEntity.status(500)
                    .body(TransformResponse.error("Transformation failed: " + ex.getMessage()));
        }
    }

    /**
     * POST /genui/transform/stream
     * Streaming version - transforms content and returns SSE events.
     * Useful for real-time transformation as content arrives.
     */
    @PostMapping(value = "/transform/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter transformStream(@RequestBody TransformRequest request) {
        SseEmitter emitter = new SseEmitter(120000L); // 2 min timeout
        executor.execute(() -> processStreamRequest(request, emitter));
        return emitter;
    }

    private void processStreamRequest(TransformRequest request, SseEmitter emitter) {
        if (!validateRequest(request, emitter)) {
            return;
        }

        long startTime = System.currentTimeMillis();
        try {
            var chatClient = chatClientFactory.createClient();
            var prompt = buildStreamPrompt(request);
            var fullContent = new StringBuilder();
            var previousResponse = new AtomicReference<GenerativeUIResponse>(null);
            boolean includeChunks = request.isIncludeChunks();
            boolean preferPatches = request.isPreferPatches();

            chatClient.prompt(prompt)
                    .stream()
                    .content()
                    .doOnNext(chunk -> {
                        if (includeChunks) {
                            handleStreamChunk(chunk, emitter, fullContent);
                        } else {
                            fullContent.append(chunk);
                        }

                        if (preferPatches) {
                            emitPatchesFromPartial(fullContent, emitter, previousResponse);
                        }
                    })
                    .doOnComplete(() -> handleStreamComplete(emitter, fullContent, request, startTime))
                    .doOnError(error -> handleStreamError(error, emitter))
                    .subscribe();

        } catch (Exception ex) {
            handleProcessError(ex, emitter);
        }
    }

    private boolean validateRequest(TransformRequest request, SseEmitter emitter) {
        if (request.getContent() == null || request.getContent().isBlank()) {
            sendErrorAndComplete(emitter, "Content is required");
            return false;
        }
        return true;
    }

    private void sendErrorAndComplete(SseEmitter emitter, String errorMessage) {
        try {
            var errorJson = objectMapper.createObjectNode();
            errorJson.put(ERROR_KEY, errorMessage);
            emitter.send(SseEmitter.event()
                    .name(ERROR_KEY)
                    .data(objectMapper.writeValueAsString(errorJson)));
            emitter.complete();
        } catch (IOException e) {
            emitter.completeWithError(e);
        }
    }

    private Prompt buildStreamPrompt(TransformRequest request) {
        String contextHints = extractContextHints(request);
        return new Prompt(
                new SystemMessage(TransformPrompts.TRANSFORM_SYSTEM_PROMPT),
                new UserMessage(TransformPrompts.buildTransformPrompt(request.getContent(), contextHints)));
    }

    private String extractContextHints(TransformRequest request) {
        if (request.getContext() != null && request.getContext().getInstructions() != null) {
            return request.getContext().getInstructions();
        }
        return null;
    }

    private void handleStreamChunk(String chunk, SseEmitter emitter, StringBuilder fullContent) {
        fullContent.append(chunk);
        try {
            emitter.send(SseEmitter.event()
                    .name("chunk")
                    .data(chunk));
        } catch (IOException e) {
            log.error("Error sending chunk", e);
        }
    }

    private void emitPatchesFromPartial(
            StringBuilder fullContent,
            SseEmitter emitter,
            AtomicReference<com.genui.model.genui.GenerativeUIResponse> previousResponse
    ) {
        var partial = responseParser.tryParsePartial(fullContent.toString());
        if (partial == null) {
            return;
        }

        List<StreamPatchOperation> patches = streamPatchGenerator.generatePatches(previousResponse.get(), partial);
        if (patches.isEmpty()) {
            return;
        }

        previousResponse.set(partial);

        try {
            emitter.send(SseEmitter.event()
                    .name("patch")
                    .data(objectMapper.writeValueAsString(patches)));
        } catch (IOException e) {
            log.error("Error sending patch", e);
        }
    }

    private void handleStreamComplete(SseEmitter emitter, StringBuilder fullContent, TransformRequest request, long startTime) {
        try {
            sendStreamResult(emitter, fullContent.toString());
            sendStreamUsage(emitter, request, fullContent, startTime);
            emitter.send(SseEmitter.event().name("done").data("[DONE]"));
            emitter.complete();
        } catch (Exception e) {
            log.error("Error completing stream", e);
            emitter.completeWithError(e);
        }
    }

    private void sendStreamResult(SseEmitter emitter, String content) throws IOException {
        var uiResponse = responseParser.parse(content);
        if (uiResponse != null) {
            emitter.send(SseEmitter.event()
                    .name("result")
                    .data(objectMapper.writeValueAsString(uiResponse)));
        }
    }

    private void sendStreamUsage(SseEmitter emitter, TransformRequest request, StringBuilder fullContent, long startTime) throws IOException {
        long processingTime = System.currentTimeMillis() - startTime;
        int tokens = (request.getContent().length() + fullContent.length()) / 4;
        var usageJson = objectMapper.createObjectNode();
        usageJson.put("transformTokens", tokens);
        usageJson.put("processingTimeMs", processingTime);
        emitter.send(SseEmitter.event()
                .name("usage")
                .data(objectMapper.writeValueAsString(usageJson)));
    }

    private void handleStreamError(Throwable error, SseEmitter emitter) {
        log.error("Stream error", error);
        try {
            var errorJson = objectMapper.createObjectNode();
            errorJson.put(ERROR_KEY, error.getMessage() != null ? error.getMessage() : "Stream processing failed");
            emitter.send(SseEmitter.event()
                    .name(ERROR_KEY)
                    .data(objectMapper.writeValueAsString(errorJson)));
            emitter.complete();
        } catch (IOException ioException) {
            emitter.completeWithError(ioException);
        }
    }

    private void handleProcessError(Exception ex, SseEmitter emitter) {
        log.error("Transform stream error", ex);
        sendErrorAndComplete(emitter, ex.getMessage());
    }

}
