package com.genui.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.genui.entity.User;
import com.genui.model.transform.TransformRequest;
import com.genui.model.transform.TransformResponse;
import com.genui.repository.UserRepository;
import com.genui.security.ApiKeyUserDetails;
import com.genui.service.ChatClientFactory;
import com.genui.service.TransformPrompts;
import com.genui.service.UIResponseParser;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
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

    private final ChatClientFactory chatClientFactory;
    private final UIResponseParser responseParser;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final ExecutorService executor = Executors.newCachedThreadPool();

    @Value("${spring.ai.vertex.ai.gemini.model:gemini-2.5-flash-lite}")
    private String geminiModel;

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
                    .model(geminiModel)
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

        executor.execute(() -> {
            try {
                if (request.getContent() == null || request.getContent().isBlank()) {
                    emitter.send(SseEmitter.event()
                            .name("error")
                            .data("{\"error\": \"Content is required\"}"));
                    emitter.complete();
                    return;
                }

                long startTime = System.currentTimeMillis();
                var chatClient = chatClientFactory.createClient();

                String contextHints = null;
                if (request.getContext() != null && request.getContext().getInstructions() != null) {
                    contextHints = request.getContext().getInstructions();
                }

                var prompt = new Prompt(
                        new SystemMessage(TransformPrompts.TRANSFORM_SYSTEM_PROMPT),
                        new UserMessage(TransformPrompts.buildTransformPrompt(request.getContent(), contextHints)));
                var fullContent = new StringBuilder();

                chatClient.prompt(prompt)
                        .stream()
                        .content()
                        .doOnNext(chunk -> {
                            fullContent.append(chunk);
                            try {
                                emitter.send(SseEmitter.event()
                                        .name("chunk")
                                        .data(chunk));
                            } catch (IOException e) {
                                log.error("Error sending chunk", e);
                            }
                        })
                        .doOnComplete(() -> {
                            try {
                                // Parse and send final result
                                var uiResponse = responseParser.parse(fullContent.toString());
                                if (uiResponse != null) {
                                    emitter.send(SseEmitter.event()
                                            .name("result")
                                            .data(objectMapper.writeValueAsString(uiResponse)));
                                }

                                // Send usage
                                long processingTime = System.currentTimeMillis() - startTime;
                                int tokens = (request.getContent().length() + fullContent.length()) / 4;
                                emitter.send(SseEmitter.event()
                                        .name("usage")
                                        .data("{\"transformTokens\":" + tokens + ",\"processingTimeMs\":"
                                                + processingTime + "}"));

                                emitter.send(SseEmitter.event().data("[DONE]"));
                                emitter.complete();

                            } catch (Exception e) {
                                log.error("Error completing stream", e);
                                emitter.completeWithError(e);
                            }
                        })
                        .doOnError(error -> {
                            log.error("Stream error", error);
                            emitter.completeWithError(error);
                        })
                        .subscribe();

            } catch (Exception ex) {
                log.error("Transform stream error", ex);
                try {
                    emitter.send(SseEmitter.event()
                            .name("error")
                            .data("{\"error\": \"" + ex.getMessage() + "\"}"));
                    emitter.complete();
                } catch (IOException e) {
                    emitter.completeWithError(e);
                }
            }
        });

        return emitter;
    }

}
