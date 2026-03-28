package com.genui.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.genui.contract.FogUiCanonicalContract;
import com.genui.model.genui.GenerativeUIResponse;
import com.genui.model.transform.TransformRequest;
import com.genui.starter.advisor.FogUiAdvisorContextKeys;
import com.genui.starter.advisor.FogUiAdvisorException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import reactor.core.publisher.Flux;

import java.io.IOException;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.atomic.AtomicReference;

@Slf4j
@Service
@RequiredArgsConstructor
public class TransformStreamProcessor {

    private static final String ERROR_KEY = "error";

    private final ChatClientFactory chatClientFactory;
    private final UIResponseParser responseParser;
    private final StreamPatchReconciler streamPatchReconciler;
    private final ObjectMapper objectMapper;

    public void processStreamRequest(TransformRequest request, SseEmitter emitter, String requestId) {
        if (!validateRequest(request, emitter, requestId)) {
            return;
        }

        long startTime = System.currentTimeMillis();
        try {
            var chatClient = chatClientFactory.createClient();
            var prompt = buildStreamPrompt(request);
            var fullContent = new StringBuilder();
            var previousResponse = new AtomicReference<GenerativeUIResponse>(null);

            var requestSpec = chatClient.prompt(prompt);
            requestSpec.advisors(spec -> spec
                    .param(FogUiAdvisorContextKeys.REQUEST_ID, requestId)
                    .param(FogUiAdvisorContextKeys.ROUTE_MODE, FogUiAdvisorContextKeys.ROUTE_TRANSFORM_STREAM));
            requestSpec
                    .stream()
                    .content()
                    .doOnNext(chunk -> {
                        fullContent.append(chunk);
                        emitPartialResult(fullContent, emitter, previousResponse);
                    })
                    .doOnComplete(() -> handleStreamComplete(emitter, fullContent, request, startTime, requestId))
                    .doOnError(error -> handleStreamError(error, emitter, requestId))
                    .onErrorResume(error -> Flux.empty())
                    .subscribe();

        } catch (Exception ex) {
            handleProcessError(ex, emitter, requestId);
        }
    }

    private boolean validateRequest(TransformRequest request, SseEmitter emitter, String requestId) {
        if (request == null || request.getContent() == null || request.getContent().isBlank()) {
            sendErrorAndComplete(emitter, "Content is required", TransformErrorCodes.CONTENT_REQUIRED, requestId, null);
            return false;
        }
        return true;
    }

    private void sendErrorAndComplete(
            SseEmitter emitter,
            String errorMessage,
            String errorCode,
            String requestId,
            Object details
    ) {
        try {
            sendStreamErrorEvent(emitter, errorMessage, errorCode, requestId, details);
            emitter.complete();
        } catch (IOException e) {
            emitter.completeWithError(e);
        }
    }

    private void sendStreamErrorEvent(
            SseEmitter emitter,
            String errorMessage,
            String errorCode,
            String requestId,
            Object details
    ) throws IOException {
        var errorJson = objectMapper.createObjectNode();
        errorJson.put(ERROR_KEY, errorMessage);
        errorJson.put("code", errorCode);
        errorJson.put("requestId", requestId);
        if (details != null) {
            errorJson.set("details", objectMapper.valueToTree(details));
        }
        emitter.send(SseEmitter.event()
                .name(ERROR_KEY)
                .data(objectMapper.writeValueAsString(errorJson)));
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

    private void emitPartialResult(
            StringBuilder fullContent,
            SseEmitter emitter,
            AtomicReference<GenerativeUIResponse> previousResponse
    ) {
        var partial = responseParser.tryParsePartial(fullContent.toString());
        var reconciled = streamPatchReconciler.reconcile(previousResponse.get(), partial);
        FogUiCanonicalContract.ensureContractVersionMetadata(reconciled);
        if (reconciled == null || Objects.equals(reconciled, previousResponse.get())) {
            return;
        }

        previousResponse.set(reconciled);

        try {
            emitter.send(SseEmitter.event()
                    .name("result")
                    .data(objectMapper.writeValueAsString(reconciled)));
        } catch (IOException e) {
            log.error("Error sending partial result", e);
        }
    }

    private void handleStreamComplete(
            SseEmitter emitter,
            StringBuilder fullContent,
            TransformRequest request,
            long startTime,
            String requestId
    ) {
        try {
            sendStreamResult(emitter, fullContent.toString());
            sendStreamUsage(emitter, request, fullContent, startTime, requestId);
            emitter.send(SseEmitter.event().name("done").data("[DONE]"));
            emitter.complete();
        } catch (Exception e) {
            log.error("Error completing stream", e);
            emitter.completeWithError(e);
        }
    }

    private void sendStreamResult(SseEmitter emitter, String content) throws IOException {
        try {
            var uiResponse = objectMapper.readValue(content, GenerativeUIResponse.class);
            FogUiCanonicalContract.ensureContractVersionMetadata(uiResponse);
            emitter.send(SseEmitter.event()
                    .name("result")
                    .data(objectMapper.writeValueAsString(uiResponse)));
        } catch (Exception e) {
            log.warn("Could not deserialize stream final content: {}", e.getMessage());
        }
    }

    private void sendStreamUsage(
            SseEmitter emitter,
            TransformRequest request,
            StringBuilder fullContent,
            long startTime,
            String requestId
    ) throws IOException {
        long processingTime = System.currentTimeMillis() - startTime;
        int tokens = (request.getContent().length() + fullContent.length()) / 4;
        var usageJson = objectMapper.createObjectNode();
        usageJson.put("transformTokens", tokens);
        usageJson.put("processingTimeMs", processingTime);
        usageJson.put("model", chatClientFactory.getActiveModelName());
        usageJson.put("requestId", requestId);
        emitter.send(SseEmitter.event()
                .name("usage")
                .data(objectMapper.writeValueAsString(usageJson)));
    }

    private void handleStreamError(Throwable error, SseEmitter emitter, String requestId) {
        log.error("Stream error", error);
        try {
            String errorCode = TransformErrorCodes.STREAM_FAILED;
            Object details = Map.of("exceptionType", error.getClass().getSimpleName());
            if (error instanceof FogUiAdvisorException advisorException) {
                errorCode = advisorException.getErrorCode();
                details = advisorException.getDetails();
            }

            sendStreamErrorEvent(
                    emitter,
                    error.getMessage() != null ? error.getMessage() : "Stream processing failed",
                    errorCode,
                    requestId,
                    details);
            emitter.complete();
        } catch (IOException ioException) {
            emitter.completeWithError(ioException);
        }
    }

    private void handleProcessError(Exception ex, SseEmitter emitter, String requestId) {
        log.error("Transform stream error", ex);
        String errorCode = TransformErrorCodes.STREAM_FAILED;
        Object details = Map.of("exceptionType", ex.getClass().getSimpleName());
        if (ex instanceof FogUiAdvisorException advisorException) {
            errorCode = advisorException.getErrorCode();
            details = advisorException.getDetails();
        }
        sendErrorAndComplete(
                emitter,
                ex.getMessage(),
                errorCode,
                requestId,
                details);
    }
}