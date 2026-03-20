package com.genui.controller;

import com.genui.entity.User;
import com.genui.model.genui.ContentBlock;
import com.genui.model.genui.GenerativeUIResponse;
import com.genui.model.transform.TransformRequest;
import com.genui.repository.UserRepository;
import com.genui.security.ApiKeyUserDetails;
import com.genui.service.ChatClientFactory;
import com.genui.service.StreamPatchReconciler;
import com.genui.service.UIResponseParser;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import reactor.core.publisher.Flux;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
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
    private TransformController controller;

    @BeforeEach
    void setUp() {
        chatClientFactory = Mockito.mock(ChatClientFactory.class);
        responseParser = Mockito.mock(UIResponseParser.class);
        streamPatchReconciler = Mockito.mock(StreamPatchReconciler.class);
        userRepository = Mockito.mock(UserRepository.class);

        when(streamPatchReconciler.reconcile(any(), any())).thenAnswer(invocation -> invocation.getArgument(1));
        controller = new TransformController(chatClientFactory, responseParser, streamPatchReconciler, userRepository);
    }

    @Test
    @DisplayName("transform should return 500 when entity returns null")
    void transformShouldReturn500WhenEntityReturnsNull() {
        mockSyncChatClient(null);

        TransformRequest request = new TransformRequest();
        request.setContent("hello");

        ResponseEntity<?> response = controller.transform(null, request);

        assertEquals(500, response.getStatusCode().value());
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

        ResponseEntity<?> response = controller.transform(null, request);

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

        ResponseEntity<?> response = controller.transform(userDetails, request);

        assertEquals(200, response.getStatusCode().value());
        verify(userRepository).save(user);
    }

    @Test
    @DisplayName("validateRequest should reject blank content")
    void validateRequestShouldRejectBlankContent() {
        TransformRequest request = new TransformRequest();
        request.setContent("   ");
        SseEmitter emitter = Mockito.mock(SseEmitter.class);

        boolean valid = ReflectionTestUtils.invokeMethod(controller, "validateRequest", request, emitter);

        assertFalse(valid);
        verify(emitter).complete();
    }

    @Test
    @DisplayName("validateRequest should allow non blank content")
    void validateRequestShouldAllowNonBlankContent() {
        TransformRequest request = new TransformRequest();
        request.setContent("hello");
        SseEmitter emitter = Mockito.mock(SseEmitter.class);

        boolean valid = ReflectionTestUtils.invokeMethod(controller, "validateRequest", request, emitter);

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

        ReflectionTestUtils.invokeMethod(controller, "sendErrorAndComplete", emitter, "bad");

        verify(emitter).completeWithError(any(IOException.class));
    }

    @Test
    @DisplayName("processStreamRequest should handle stream completion path")
    void processStreamRequestShouldHandleStreamCompletionPath() {
        mockStreamingChatClient(Flux.just("{\"thinking\":[],\"content\":[{\"type\":\"text\",\"value\":\"Hello\"}]}"));

        GenerativeUIResponse partial = GenerativeUIResponse.builder()
                .content(List.of(ContentBlock.text("Hello")))
                .build();
        when(responseParser.tryParsePartial(any(String.class))).thenReturn(partial);

        TransformRequest request = new TransformRequest();
        request.setContent("hello");

        SseEmitter emitter = Mockito.mock(SseEmitter.class);

        ReflectionTestUtils.invokeMethod(controller, "processStreamRequest", request, emitter);

        verify(emitter).complete();
    }

    @Test
    @DisplayName("processStreamRequest should handle stream errors")
    void processStreamRequestShouldHandleStreamErrors() {
        mockStreamingChatClient(Flux.error(new RuntimeException("stream failed")));

        TransformRequest request = new TransformRequest();
        request.setContent("hello");

        SseEmitter emitter = Mockito.mock(SseEmitter.class);

        ReflectionTestUtils.invokeMethod(controller, "processStreamRequest", request, emitter);

        verify(emitter).complete();
    }

    @Test
    @DisplayName("processStreamRequest should handle client creation exceptions")
    void processStreamRequestShouldHandleClientCreationExceptions() {
        when(chatClientFactory.createClient()).thenThrow(new RuntimeException("boom"));

        TransformRequest request = new TransformRequest();
        request.setContent("hello");

        SseEmitter emitter = Mockito.mock(SseEmitter.class);

        ReflectionTestUtils.invokeMethod(controller, "processStreamRequest", request, emitter);

        verify(emitter).complete();
    }

    private void mockSyncChatClient(GenerativeUIResponse response) {
        ChatClient mockClient = Mockito.mock(ChatClient.class);
        ChatClient.ChatClientRequestSpec mockRequestSpec = Mockito.mock(ChatClient.ChatClientRequestSpec.class);
        ChatClient.CallResponseSpec mockCallSpec = Mockito.mock(ChatClient.CallResponseSpec.class);

        when(chatClientFactory.createClient()).thenReturn(mockClient);
        when(mockClient.prompt(any(org.springframework.ai.chat.prompt.Prompt.class))).thenReturn(mockRequestSpec);
        when(mockRequestSpec.options(any())).thenReturn(mockRequestSpec);
        when(mockRequestSpec.call()).thenReturn(mockCallSpec);
        when(mockCallSpec.entity(GenerativeUIResponse.class)).thenReturn(response);
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
}
