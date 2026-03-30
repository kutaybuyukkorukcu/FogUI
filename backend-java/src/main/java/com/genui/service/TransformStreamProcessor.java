package com.genui.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.genui.contract.CanonicalValidationContext;
import com.genui.contract.CanonicalValidationError;
import com.genui.contract.FogUiCanonicalContract;
import com.genui.contract.FogUiCanonicalValidator;
import com.genui.model.genui.GenerativeUIResponse;
import com.genui.model.transform.TransformRequest;
import com.genui.starter.advisor.FogUiAdvisorContextKeys;
import com.genui.starter.advisor.FogUiAdvisorErrorCodes;
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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.atomic.AtomicReference;

@Slf4j
@Service
@RequiredArgsConstructor
public class TransformStreamProcessor {

    private static final String ERROR_KEY = "error";
    private static final String REQUEST_ID_KEY = "requestId";
    private static final String EXCEPTION_TYPE_KEY = "exceptionType";

    private final ChatClientFactory chatClientFactory;
    private final UIResponseParser responseParser;
    private final StreamPatchReconciler streamPatchReconciler;
    private final FogUiCanonicalValidator canonicalValidator;
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
            String advisorRequestId = requestId == null ? "" : requestId;

            var requestSpec = chatClient.prompt(Objects.requireNonNull(prompt));
            requestSpec.advisors(spec -> spec
                .param(FogUiAdvisorContextKeys.REQUEST_ID, advisorRequestId)
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
        errorJson.put(REQUEST_ID_KEY, requestId == null ? "" : requestId);
        if (details != null) {
            errorJson.set("details", objectMapper.valueToTree(details));
        }
        emitter.send(SseEmitter.event()
                .name(ERROR_KEY)
            .data(Objects.requireNonNull(objectMapper.writeValueAsString(errorJson))));
    }

    private Prompt buildStreamPrompt(TransformRequest request) {
        String contextHints = extractContextHints(request);
        return new Prompt(
                new SystemMessage(TransformPrompts.TRANSFORM_SYSTEM_PROMPT),
                new UserMessage(Objects.requireNonNull(TransformPrompts.buildTransformPrompt(request.getContent(), contextHints))));
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
        var normalized = normalizeCanonicalResponse(reconciled, false, null);
        if (normalized == null || Objects.equals(normalized, previousResponse.get())) {
            return;
        }

        previousResponse.set(normalized);

        try {
            emitter.send(SseEmitter.event()
                    .name("result")
                    .data(Objects.requireNonNull(objectMapper.writeValueAsString(normalized))));
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
            sendStreamResult(emitter, fullContent.toString(), requestId);
            sendStreamUsage(emitter, request, fullContent, startTime, requestId);
            emitter.send(SseEmitter.event().name("done").data("[DONE]"));
            emitter.complete();
        } catch (Exception e) {
            handleStreamError(e, emitter, requestId);
        }
    }

    private void sendStreamResult(SseEmitter emitter, String content, String requestId) throws IOException {
        emitter.send(SseEmitter.event()
                .name("result")
            .data(Objects.requireNonNull(objectMapper.writeValueAsString(parseAndNormalizeFinalResponse(content, requestId)))));
    }

    private GenerativeUIResponse parseAndNormalizeFinalResponse(String content, String requestId) {
        if (content == null || content.isBlank()) {
            throw missingResponseException(requestId, "Assistant content is empty");
        }

        try {
            GenerativeUIResponse response = objectMapper.readValue(content, GenerativeUIResponse.class);
            return normalizeCanonicalResponse(response, true, requestId);
        } catch (FogUiAdvisorException ex) {
            throw ex;
        } catch (Exception ex) {
            throw parseException(requestId, ex);
        }
    }

    private GenerativeUIResponse normalizeCanonicalResponse(
            GenerativeUIResponse response,
            boolean failOnInvalid,
            String requestId
    ) {
        if (response == null) {
            return null;
        }

        List<CanonicalValidationError> diagnostics = validateCanonicalResponse(response);
        if (!diagnostics.isEmpty()) {
            if (failOnInvalid) {
                throw validationException(requestId, diagnostics);
            }
            return null;
        }

        return FogUiCanonicalContract.ensureContractVersionMetadata(response);
    }

    private List<CanonicalValidationError> validateCanonicalResponse(GenerativeUIResponse response) {
        String declaredContractVersion = FogUiCanonicalContract.readContractVersion(response);
        if (declaredContractVersion == null || declaredContractVersion.isBlank()) {
            return canonicalValidator.validate(response, CanonicalValidationContext.empty());
        }

        return canonicalValidator.validate(
                response,
                CanonicalValidationContext.builder()
                        .expectedContractVersion(FogUiCanonicalContract.CURRENT_CONTRACT_VERSION)
                        .build());
    }

    private FogUiAdvisorException missingResponseException(String requestId, String reason) {
        Map<String, Object> details = baseDetails(requestId);
        details.put("reason", reason);
        return new FogUiAdvisorException(
                "Canonical response is missing",
                FogUiAdvisorErrorCodes.CANONICAL_RESPONSE_MISSING,
                details);
    }

    private FogUiAdvisorException parseException(String requestId, Exception ex) {
        Map<String, Object> details = baseDetails(requestId);
        details.put(EXCEPTION_TYPE_KEY, ex.getClass().getSimpleName());
        details.put("reason", ex.getMessage());
        return new FogUiAdvisorException(
                "Canonical response parsing failed",
                FogUiAdvisorErrorCodes.CANONICAL_PARSE_FAILED,
                details);
    }

    private FogUiAdvisorException validationException(String requestId, List<CanonicalValidationError> diagnostics) {
        Map<String, Object> details = baseDetails(requestId);
        details.put("diagnostics", diagnostics);
        return new FogUiAdvisorException(
                "Canonical validation failed",
                FogUiAdvisorErrorCodes.CANONICAL_VALIDATION_FAILED,
                details);
    }

    private Map<String, Object> baseDetails(String requestId) {
        Map<String, Object> details = new LinkedHashMap<>();
        details.put("expectedContractVersion", FogUiCanonicalContract.CURRENT_CONTRACT_VERSION);
        details.put("routeMode", FogUiAdvisorContextKeys.ROUTE_TRANSFORM_STREAM);
        if (requestId != null) {
            details.put("requestId", requestId);
        }
        return details;
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
        usageJson.put(REQUEST_ID_KEY, requestId == null ? "" : requestId);
        emitter.send(SseEmitter.event()
                .name("usage")
            .data(Objects.requireNonNull(objectMapper.writeValueAsString(usageJson))));
    }

    private void handleStreamError(Throwable error, SseEmitter emitter, String requestId) {
        log.error("Stream error", error);
        try {
            String errorCode = TransformErrorCodes.STREAM_FAILED;
            Object details = Map.of(EXCEPTION_TYPE_KEY, error.getClass().getSimpleName());
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
        Object details = Map.of(EXCEPTION_TYPE_KEY, ex.getClass().getSimpleName());
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