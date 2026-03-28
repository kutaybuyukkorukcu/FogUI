package com.genui.controller;

import com.genui.contract.FogUiCanonicalContract;
import com.genui.entity.User;
import com.genui.model.genui.GenerativeUIResponse;
import com.genui.model.transform.TransformRequest;
import com.genui.model.transform.TransformResponse;
import com.genui.repository.UserRepository;
import com.genui.security.ApiKeyUserDetails;
import com.genui.starter.advisor.FogUiAdvisorContextKeys;
import com.genui.starter.advisor.FogUiAdvisorException;
import com.genui.service.ChatClientFactory;
import com.genui.service.RequestCorrelationService;
import com.genui.service.TransformErrorCodes;
import com.genui.service.TransformPrompts;
import com.genui.service.TransformStreamProcessor;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
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

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Map;

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
@Tag(name = "Transform", description = "Transform raw LLM output into FogUI structured responses")
public class TransformController {

    private final ChatClientFactory chatClientFactory;
    private final UserRepository userRepository;
    private final RequestCorrelationService requestCorrelationService;
    private final TransformStreamProcessor transformStreamProcessor;

    /**
     * POST /fogui/transform
     * Transform raw LLM text into structured UI components.
     * Requires API key authentication.
     */
    @PostMapping("/transform")
    @Operation(summary = "Transform content", description = "Converts raw model text into structured FogUI response")
    public ResponseEntity<TransformResponse> transform(
            @RequestHeader(value = RequestCorrelationService.REQUEST_ID_HEADER, required = false) String requestIdHeader,
            @AuthenticationPrincipal ApiKeyUserDetails userDetails,
            @RequestBody TransformRequest request) {

        String requestId = requestCorrelationService.resolveRequestId(requestIdHeader);
        User user = userDetails != null ? userDetails.getUser() : null;

        if (request.getContent() == null || request.getContent().isBlank()) {
            return ResponseEntity.badRequest()
                    .header(RequestCorrelationService.REQUEST_ID_HEADER, requestId)
                    .body(TransformResponse.error(
                            "Content is required",
                            TransformErrorCodes.CONTENT_REQUIRED,
                            null,
                            requestId));
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
            // Structured output: model is constrained to emit valid GenerativeUIResponse JSON
            var requestSpec = chatClient.prompt(prompt);
            requestSpec.advisors(spec -> spec
                    .param(FogUiAdvisorContextKeys.REQUEST_ID, requestId)
                    .param(FogUiAdvisorContextKeys.ROUTE_MODE, FogUiAdvisorContextKeys.ROUTE_TRANSFORM));
            var uiResponse = requestSpec
                    .call()
                    .entity(GenerativeUIResponse.class);

            if (uiResponse == null) {
                return ResponseEntity.status(500)
                        .header(RequestCorrelationService.REQUEST_ID_HEADER, requestId)
                        .body(TransformResponse.error(
                                "Failed to parse transformation result",
                                TransformErrorCodes.TRANSFORM_PARSE_FAILED,
                                null,
                                requestId));
            }
            FogUiCanonicalContract.ensureContractVersionMetadata(uiResponse);

            // Calculate usage
            long processingTime = System.currentTimeMillis() - startTime;
            int estimatedTokens = request.getContent().length() / 4;
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

            return ResponseEntity.ok()
                    .header(RequestCorrelationService.REQUEST_ID_HEADER, requestId)
                    .body(TransformResponse.success(uiResponse, usage, requestId));

        } catch (FogUiAdvisorException ex) {
            log.warn("Transform deterministic advisor failure", ex);
            return ResponseEntity.unprocessableEntity()
                    .header(RequestCorrelationService.REQUEST_ID_HEADER, requestId)
                    .body(TransformResponse.error(
                            ex.getMessage(),
                            ex.getErrorCode(),
                            ex.getDetails(),
                            requestId));
        } catch (Exception ex) {
            log.error("Transform error", ex);
            return ResponseEntity.status(500)
                    .header(RequestCorrelationService.REQUEST_ID_HEADER, requestId)
                    .body(TransformResponse.error(
                            "Transformation failed: " + ex.getMessage(),
                            TransformErrorCodes.TRANSFORM_FAILED,
                            Map.of("exceptionType", ex.getClass().getSimpleName()),
                            requestId));
        }
    }

    /**
     * POST /fogui/transform/stream
     * Streaming version - transforms content and returns SSE events.
     * Useful for real-time transformation as content arrives.
     */
    @PostMapping(value = "/transform/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Operation(summary = "Transform content (SSE)", description = "Streams incremental FogUI transform events over Server-Sent Events")
    public ResponseEntity<SseEmitter> transformStream(
            @RequestHeader(value = RequestCorrelationService.REQUEST_ID_HEADER, required = false) String requestIdHeader,
            @RequestBody TransformRequest request
    ) {
        String requestId = requestCorrelationService.resolveRequestId(requestIdHeader);
        SseEmitter emitter = new SseEmitter(120000L); // 2 min timeout
        transformStreamProcessor.processStreamRequest(request, emitter, requestId);
        return ResponseEntity.ok()
                .header(RequestCorrelationService.REQUEST_ID_HEADER, requestId)
                .contentType(MediaType.TEXT_EVENT_STREAM)
                .body(emitter);
    }

}
