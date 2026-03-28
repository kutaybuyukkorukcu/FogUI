package com.genui.controller;

import com.genui.entity.User;
import com.genui.model.genui.ContentBlock;
import com.genui.model.genui.GenerativeUIResponse;
import com.genui.model.transform.TransformRequest;
import com.genui.model.transform.TransformResponse;
import com.genui.repository.UserRepository;
import com.genui.security.ApiKeyUserDetails;
import com.genui.starter.advisor.FogUiAdvisorException;
import com.genui.service.ChatClientFactory;
import com.genui.service.RequestCorrelationService;
import com.genui.service.StreamPatchReconciler;
import com.genui.service.UIResponseParser;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import reactor.core.publisher.Flux;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.atLeast;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@DisplayName("TransformController Unit")
class TransformControllerUnitTest {

    private ChatClientFactory chatClientFactory;
    private UIResponseParser responseParser;
    private StreamPatchReconciler streamPatchReconciler;
    private UserRepository userRepository;
    private RequestCorrelationService requestCorrelationService;
    private TransformController controller;

    @BeforeEach
    void setUp() {
        chatClientFactory = Mockito.mock(ChatClientFactory.class);
        responseParser = Mockito.mock(UIResponseParser.class);
        streamPatchReconciler = Mockito.mock(StreamPatchReconciler.class);
        userRepository = Mockito.mock(UserRepository.class);
        requestCorrelationService = Mockito.mock(RequestCorrelationService.class);
        when(requestCorrelationService.resolveRequestId(anyString())).thenReturn("req-unit-1");
        when(requestCorrelationService.resolveRequestId(null)).thenReturn("req-unit-1");

        when(streamPatchReconciler.reconcile(any(), any())).thenAnswer(invocation -> invocation.getArgument(1));
        controller = new TransformController(
                chatClientFactory,
                responseParser,
                streamPatchReconciler,
                userRepository,
                requestCorrelationService);
    }

    @Test
    @DisplayName("transform should return 500 when entity returns null")
    void transformShouldReturn500WhenEntityReturnsNull() {
        mockSyncChatClient(null);

        TransformRequest request = new TransformRequest();
        request.setContent("hello");

        ResponseEntity<?> response = controller.transform(null, null, request);

        assertEquals(500, response.getStatusCode().value());
    }

    @Test
    @DisplayName("transform should return deterministic envelope on advisor failure")
    void transformShouldReturnDeterministicEnvelopeOnAdvisorFailure() {
        mockSyncChatClientFailure(new FogUiAdvisorException(
                "Canonical validation failed",
                "CANONICAL_VALIDATION_FAILED",
                Map.of("diagnostics", List.of(Map.of("code", "MISSING_CONTENT")))));

        TransformRequest request = new TransformRequest();
        request.setContent("hello");

        ResponseEntity<?> response = controller.transform(null, null, request);

        assertEquals(422, response.getStatusCode().value());
        TransformResponse body = (TransformResponse) response.getBody();
        assertNotNull(body);
        assertEquals("CANONICAL_VALIDATION_FAILED", body.getErrorCode());
        assertEquals("req-unit-1", body.getRequestId());
    }

    @Test
    @DisplayName("transform should not save usage without authenticated user")
    void transformShouldNotSaveUsageWithoutAuthenticatedUser() {
        GenerativeUIResponse uiResponse = GenerativeUIResponse.builder()
                .content(List.of(ContentBlock.text("ok")))
                .build();
        mockSyncChatClient(uiResponse);
        when(chatClientFactory.getActiveModelName()).thenReturn("gpt-test");

        TransformRequest request = new TransformRequest();
        request.setContent("hello");

        ResponseEntity<?> response = controller.transform(null, null, request);

        assertEquals(200, response.getStatusCode().value());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("transform should save usage with authenticated user")
    void transformShouldSaveUsageWithAuthenticatedUser() {
        GenerativeUIResponse uiResponse = GenerativeUIResponse.builder()
                .content(List.of(ContentBlock.text("ok")))
                .build();
        mockSyncChatClient(uiResponse);
        when(chatClientFactory.getActiveModelName()).thenReturn("gpt-test");

        User user = User.builder()
                .email("unit@example.com")
                .passwordHash("hash")
                .build();
        ApiKeyUserDetails userDetails = new ApiKeyUserDetails(user);

        TransformRequest request = new TransformRequest();
        request.setContent("hello");

        ResponseEntity<?> response = controller.transform(null, userDetails, request);

        assertEquals(200, response.getStatusCode().value());
        verify(userRepository).save(user);
    }

    @Test
    @DisplayName("validateRequest should reject blank content")
    void validateRequestShouldRejectBlankContent() {
        TransformRequest request = new TransformRequest();
        request.setContent("   ");
        SseEmitter emitter = Mockito.mock(SseEmitter.class);

        boolean valid = ReflectionTestUtils.invokeMethod(controller, "validateRequest", request, emitter, "req-unit-1");

        assertFalse(valid);
        verify(emitter).complete();
    }

    @Test
    @DisplayName("validateRequest should allow non blank content")
    void validateRequestShouldAllowNonBlankContent() {
        TransformRequest request = new TransformRequest();
        request.setContent("hello");
        SseEmitter emitter = Mockito.mock(SseEmitter.class);

        boolean valid = ReflectionTestUtils.invokeMethod(controller, "validateRequest", request, emitter, "req-unit-1");

        assertTrue(valid);
    }

    @Test
    @DisplayName("extractContextHints should return instructions when present")
    void extractContextHintsShouldReturnInstructionsWhenPresent() {
        TransformRequest.TransformContext context = new TransformRequest.TransformContext();
        context.setInstructions("Use concise UI");

        TransformRequest request = new TransformRequest();
        request.setContent("hello");
        request.setContext(context);

        String hints = ReflectionTestUtils.invokeMethod(controller, "extractContextHints", request);
        assertEquals("Use concise UI", hints);
    }

    @Test
    @DisplayName("extractContextHints should return null when context missing")
    void extractContextHintsShouldReturnNullWhenContextMissing() {
        TransformRequest request = new TransformRequest();
        request.setContent("hello");

        String hints = ReflectionTestUtils.invokeMethod(controller, "extractContextHints", request);
        assertNull(hints);
    }

    @Test
    @DisplayName("emitPartialResult should no-op when partial is null")
    void emitPartialResultShouldNoOpWhenPartialIsNull() {
        when(responseParser.tryParsePartial(any(String.class))).thenReturn(null);

        StringBuilder fullContent = new StringBuilder("chunk");
        SseEmitter emitter = Mockito.mock(SseEmitter.class);
        AtomicReference<GenerativeUIResponse> previous = new AtomicReference<>(null);

        ReflectionTestUtils.invokeMethod(controller, "emitPartialResult", fullContent, emitter, previous);

        assertNull(previous.get());
    }

    @Test
    @DisplayName("emitPartialResult should send result event and update previous response")
    void emitPartialResultShouldSendResultEventAndUpdatePreviousResponse() throws IOException {
        GenerativeUIResponse partial = GenerativeUIResponse.builder()
                .content(List.of(ContentBlock.text("A")))
                .build();
        when(responseParser.tryParsePartial(any(String.class))).thenReturn(partial);

        StringBuilder fullContent = new StringBuilder("chunk");
        SseEmitter emitter = Mockito.mock(SseEmitter.class);
        AtomicReference<GenerativeUIResponse> previous = new AtomicReference<>(null);

        ReflectionTestUtils.invokeMethod(controller, "emitPartialResult", fullContent, emitter, previous);

        assertNotNull(previous.get());
        verify(emitter).send(any(SseEmitter.SseEventBuilder.class));
    }

    @Test
    @DisplayName("sendErrorAndComplete should complete with error when send fails")
    void sendErrorAndCompleteShouldCompleteWithErrorWhenSendFails() throws IOException {
        SseEmitter emitter = Mockito.mock(SseEmitter.class);
        doThrow(new IOException("io")).when(emitter).send(any(SseEmitter.SseEventBuilder.class));

        ReflectionTestUtils.invokeMethod(
                controller,
                "sendErrorAndComplete",
                emitter,
                "bad",
                "STREAM_FAILED",
                "req-unit-1",
                null);

        verify(emitter).completeWithError(any(IOException.class));
    }

    @Test
    @DisplayName("processStreamRequest should handle stream completion path")
    void processStreamRequestShouldHandleStreamCompletionPath() throws IOException {
        mockStreamingChatClient(Flux.just("{\"thinking\":[],\"content\":[{\"type\":\"text\",\"value\":\"Hello\"}]}"));

        GenerativeUIResponse partial = GenerativeUIResponse.builder()
                .content(List.of(ContentBlock.text("Hello")))
                .build();
        when(responseParser.tryParsePartial(any(String.class))).thenReturn(partial);

        TransformRequest request = new TransformRequest();
        request.setContent("hello");

        SseEmitter emitter = Mockito.mock(SseEmitter.class);

        ReflectionTestUtils.invokeMethod(controller, "processStreamRequest", request, emitter, "req-unit-1");

        ArgumentCaptor<SseEmitter.SseEventBuilder> eventCaptor = ArgumentCaptor.forClass(SseEmitter.SseEventBuilder.class);
        verify(emitter, atLeast(3)).send(eventCaptor.capture());
        verify(emitter).complete();

        List<String> eventNames = eventCaptor.getAllValues()
                .stream()
                .map(TransformControllerUnitTest::extractEventName)
                .toList();

        String payload = eventCaptor.getAllValues()
                .stream()
                .map(TransformControllerUnitTest::flattenEventPayload)
                .collect(Collectors.joining("\n"));
        assertTrue(payload.contains("event:result"));
        assertTrue(payload.contains("event:usage"));
        assertTrue(payload.contains("event:done"));
        assertEquals("done", eventNames.getLast());
        assertEquals(1L, eventNames.stream().filter("done"::equals).count());
        assertEquals(0L, eventNames.stream().filter("error"::equals).count());
    }

    @Test
    @DisplayName("processStreamRequest should handle stream errors")
    void processStreamRequestShouldHandleStreamErrors() throws IOException {
        mockStreamingChatClient(Flux.error(new RuntimeException("stream failed")));

        TransformRequest request = new TransformRequest();
        request.setContent("hello");

        SseEmitter emitter = Mockito.mock(SseEmitter.class);

        ReflectionTestUtils.invokeMethod(controller, "processStreamRequest", request, emitter, "req-unit-1");

        ArgumentCaptor<SseEmitter.SseEventBuilder> eventCaptor = ArgumentCaptor.forClass(SseEmitter.SseEventBuilder.class);
        verify(emitter, atLeastOnce()).send(eventCaptor.capture());
        verify(emitter).complete();

        List<String> eventNames = eventCaptor.getAllValues()
                .stream()
                .map(TransformControllerUnitTest::extractEventName)
                .toList();

        String payload = eventCaptor.getAllValues()
                .stream()
                .map(TransformControllerUnitTest::flattenEventPayload)
                .collect(Collectors.joining("\n"));
        assertTrue(payload.contains("event:error"));
        assertTrue(payload.contains("\"code\":\"STREAM_FAILED\""));
        assertTrue(payload.contains("\"requestId\":\"req-unit-1\""));
        assertEquals(1L, eventNames.stream().filter("error"::equals).count());
        assertEquals(0L, eventNames.stream().filter("done"::equals).count());
    }

    @Test
    @DisplayName("processStreamRequest should surface advisor error envelope deterministically")
    void processStreamRequestShouldSurfaceAdvisorErrorEnvelopeDeterministically() throws IOException {
        mockStreamingChatClient(Flux.error(new FogUiAdvisorException(
                "Canonical validation failed",
                "CANONICAL_VALIDATION_FAILED",
                Map.of("diagnostics", List.of(Map.of("code", "MISSING_CONTENT"))))));

        TransformRequest request = new TransformRequest();
        request.setContent("hello");

        SseEmitter emitter = Mockito.mock(SseEmitter.class);
        ReflectionTestUtils.invokeMethod(controller, "processStreamRequest", request, emitter, "req-unit-1");

        ArgumentCaptor<SseEmitter.SseEventBuilder> eventCaptor = ArgumentCaptor.forClass(SseEmitter.SseEventBuilder.class);
        verify(emitter, atLeastOnce()).send(eventCaptor.capture());
        verify(emitter).complete();

        String payload = eventCaptor.getAllValues()
                .stream()
                .map(TransformControllerUnitTest::flattenEventPayload)
                .collect(Collectors.joining("\n"));

        assertTrue(payload.contains("event:error"));
        assertTrue(payload.contains("\"code\":\"CANONICAL_VALIDATION_FAILED\""));
        assertTrue(payload.contains("\"requestId\":\"req-unit-1\""));
        assertTrue(payload.contains("diagnostics"));
    }

    @Test
    @DisplayName("processStreamRequest should handle client creation exceptions")
    void processStreamRequestShouldHandleClientCreationExceptions() throws IOException {
        when(chatClientFactory.createClient()).thenThrow(new RuntimeException("boom"));

        TransformRequest request = new TransformRequest();
        request.setContent("hello");

        SseEmitter emitter = Mockito.mock(SseEmitter.class);

        ReflectionTestUtils.invokeMethod(controller, "processStreamRequest", request, emitter, "req-unit-1");

        ArgumentCaptor<SseEmitter.SseEventBuilder> eventCaptor = ArgumentCaptor.forClass(SseEmitter.SseEventBuilder.class);
        verify(emitter, atLeastOnce()).send(eventCaptor.capture());
        verify(emitter).complete();

        List<String> eventNames = eventCaptor.getAllValues()
                .stream()
                .map(TransformControllerUnitTest::extractEventName)
                .toList();

        String payload = eventCaptor.getAllValues()
                .stream()
                .map(TransformControllerUnitTest::flattenEventPayload)
                .collect(Collectors.joining("\n"));
        assertTrue(payload.contains("event:error"));
        assertTrue(payload.contains("\"code\":\"STREAM_FAILED\""));
        assertTrue(payload.contains("\"requestId\":\"req-unit-1\""));
        assertEquals(1L, eventNames.stream().filter("error"::equals).count());
        assertEquals(0L, eventNames.stream().filter("done"::equals).count());
    }

    private void mockSyncChatClient(GenerativeUIResponse response) {
        ChatClient mockClient = Mockito.mock(ChatClient.class);
        ChatClient.ChatClientRequestSpec mockRequestSpec = Mockito.mock(ChatClient.ChatClientRequestSpec.class);
        ChatClient.CallResponseSpec mockCallSpec = Mockito.mock(ChatClient.CallResponseSpec.class);

        when(chatClientFactory.createClient()).thenReturn(mockClient);
        when(mockClient.prompt(any(org.springframework.ai.chat.prompt.Prompt.class))).thenReturn(mockRequestSpec);
        when(mockRequestSpec.call()).thenReturn(mockCallSpec);
        when(mockCallSpec.entity(GenerativeUIResponse.class)).thenReturn(response);
    }

    private void mockSyncChatClientFailure(RuntimeException exception) {
        ChatClient mockClient = Mockito.mock(ChatClient.class);
        ChatClient.ChatClientRequestSpec mockRequestSpec = Mockito.mock(ChatClient.ChatClientRequestSpec.class);
        ChatClient.CallResponseSpec mockCallSpec = Mockito.mock(ChatClient.CallResponseSpec.class);

        when(chatClientFactory.createClient()).thenReturn(mockClient);
        when(mockClient.prompt(any(org.springframework.ai.chat.prompt.Prompt.class))).thenReturn(mockRequestSpec);
        when(mockRequestSpec.call()).thenReturn(mockCallSpec);
        when(mockCallSpec.entity(GenerativeUIResponse.class)).thenThrow(exception);
    }

    private void mockStreamingChatClient(Flux<String> flux) {
        ChatClient mockClient = Mockito.mock(ChatClient.class);
        ChatClient.ChatClientRequestSpec mockRequestSpec = Mockito.mock(ChatClient.ChatClientRequestSpec.class);
        ChatClient.StreamResponseSpec mockStreamSpec = Mockito.mock(ChatClient.StreamResponseSpec.class);

        when(chatClientFactory.createClient()).thenReturn(mockClient);
        when(mockClient.prompt(any(org.springframework.ai.chat.prompt.Prompt.class))).thenReturn(mockRequestSpec);
        when(mockRequestSpec.stream()).thenReturn(mockStreamSpec);
        when(mockStreamSpec.content()).thenReturn(flux);
    }

    private static String flattenEventPayload(SseEmitter.SseEventBuilder eventBuilder) {
        return eventBuilder.build().stream()
                .map(part -> String.valueOf(part.getData()))
                .collect(Collectors.joining());
    }

    private static String extractEventName(SseEmitter.SseEventBuilder eventBuilder) {
        return Arrays.stream(flattenEventPayload(eventBuilder).split("\n"))
                .map(String::trim)
                .filter(line -> line.startsWith("event:"))
                .findFirst()
                .map(line -> line.substring("event:".length()))
                .orElse("");
    }
}
