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
import com.genui.service.TransformStreamProcessor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@DisplayName("TransformController Unit")
class TransformControllerUnitTest {

    private ChatClientFactory chatClientFactory;
    private UserRepository userRepository;
    private RequestCorrelationService requestCorrelationService;
    private TransformStreamProcessor transformStreamProcessor;
    private TransformController controller;

    @BeforeEach
    void setUp() {
        chatClientFactory = Mockito.mock(ChatClientFactory.class);
        userRepository = Mockito.mock(UserRepository.class);
        requestCorrelationService = Mockito.mock(RequestCorrelationService.class);
        transformStreamProcessor = Mockito.mock(TransformStreamProcessor.class);
        when(requestCorrelationService.resolveRequestId(anyString())).thenReturn("req-unit-1");
        when(requestCorrelationService.resolveRequestId(null)).thenReturn("req-unit-1");

        controller = new TransformController(
                chatClientFactory,
                userRepository,
                requestCorrelationService,
                transformStreamProcessor);
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
    @DisplayName("transform should return 400 for blank content")
    void transformShouldReturn400ForBlankContent() {
        TransformRequest request = new TransformRequest();
        request.setContent("   ");

        ResponseEntity<?> response = controller.transform(null, null, request);

        assertEquals(400, response.getStatusCode().value());
    }

    @Test
    @DisplayName("transformStream should delegate processing to TransformStreamProcessor")
    void transformStreamShouldDelegateProcessingToStreamProcessor() {
        TransformRequest request = new TransformRequest();
        request.setContent("hello");
        ResponseEntity<SseEmitter> response = controller.transformStream(null, request);

        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());

        ArgumentCaptor<SseEmitter> emitterCaptor = ArgumentCaptor.forClass(SseEmitter.class);
        verify(transformStreamProcessor, timeout(1000)).processStreamRequest(eq(request), emitterCaptor.capture(), eq("req-unit-1"));
        assertEquals(response.getBody(), emitterCaptor.getValue());
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
}
