package com.genui.starter.advisor;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.genui.contract.CanonicalValidationError;
import com.genui.contract.FogUiCanonicalValidator;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.client.ChatClientRequest;
import org.springframework.ai.chat.client.ChatClientResponse;
import org.springframework.ai.chat.client.advisor.api.CallAdvisor;
import org.springframework.ai.chat.client.advisor.api.CallAdvisorChain;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.Generation;
import org.springframework.ai.chat.prompt.Prompt;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

@DisplayName("CanonicalValidationAdvisor")
class CanonicalValidationAdvisorTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void shouldStampContractVersionForValidCanonicalResponse() {
        CanonicalValidationAdvisor advisor = new CanonicalValidationAdvisor(
                new FogUiCanonicalValidator(),
                objectMapper,
                true);

        FixedCallChain chain = new FixedCallChain(responseWithJson("{\"thinking\":[],\"content\":[]}"));
        ChatClientRequest request = requestWithContext("req-1", FogUiAdvisorContextKeys.ROUTE_TRANSFORM);

        ChatClientResponse response = assertDoesNotThrow(() -> advisor.adviseCall(request, chain));
        String outputText = response.chatResponse().getResult().getOutput().getText();

        assertThat(outputText).contains("\"contractVersion\":\"fogui/1.0\"");
    }

    @Test
    void shouldFailFastWithStableDiagnosticsOnValidationFailure() {
        CanonicalValidationAdvisor advisor = new CanonicalValidationAdvisor(
                new FogUiCanonicalValidator(),
                objectMapper,
                true);

        FixedCallChain chain = new FixedCallChain(
                responseWithJson("{\"thinking\":[],\"content\":[{\"type\":\"unknown\"}]}"));
        ChatClientRequest request = requestWithContext("req-validation", FogUiAdvisorContextKeys.ROUTE_TRANSFORM);

        FogUiAdvisorException exception = assertThrows(
                FogUiAdvisorException.class,
                () -> advisor.adviseCall(request, chain));

        assertThat(exception.getErrorCode()).isEqualTo(FogUiAdvisorErrorCodes.CANONICAL_VALIDATION_FAILED);
        assertThat(exception.getDetails()).isInstanceOf(Map.class);

        @SuppressWarnings("unchecked")
        Map<String, Object> details = (Map<String, Object>) exception.getDetails();
        assertThat(details.get("requestId")).isEqualTo("req-validation");
        assertThat(details.get("routeMode")).isEqualTo(FogUiAdvisorContextKeys.ROUTE_TRANSFORM);
        assertThat(details.get("expectedContractVersion")).isEqualTo("fogui/1.0");

        @SuppressWarnings("unchecked")
        List<CanonicalValidationError> diagnostics = (List<CanonicalValidationError>) details.get("diagnostics");
        assertThat(diagnostics).isNotEmpty();
        assertThat(diagnostics.getFirst().getCode()).isEqualTo("UNSUPPORTED_TYPE");
    }

    @Test
    void shouldFailFastOnMalformedJson() {
        CanonicalValidationAdvisor advisor = new CanonicalValidationAdvisor(
                new FogUiCanonicalValidator(),
                objectMapper,
                true);

        FixedCallChain chain = new FixedCallChain(responseWithJson("{not-json"));
        ChatClientRequest request = requestWithContext("req-parse", FogUiAdvisorContextKeys.ROUTE_TRANSFORM);

        FogUiAdvisorException exception = assertThrows(
                FogUiAdvisorException.class,
                () -> advisor.adviseCall(request, chain));

        assertThat(exception.getErrorCode()).isEqualTo(FogUiAdvisorErrorCodes.CANONICAL_PARSE_FAILED);
    }

    @Test
    void shouldNotThrowWhenFailFastDisabled() {
        CanonicalValidationAdvisor advisor = new CanonicalValidationAdvisor(
                new FogUiCanonicalValidator(),
                objectMapper,
                false);

        FixedCallChain chain = new FixedCallChain(
                responseWithJson("{\"thinking\":[],\"content\":[{\"type\":\"unknown\"}]}"));
        ChatClientRequest request = requestWithContext("req-soft", FogUiAdvisorContextKeys.ROUTE_TRANSFORM);

        assertDoesNotThrow(() -> advisor.adviseCall(request, chain));
    }

    private ChatClientRequest requestWithContext(String requestId, String route) {
        return ChatClientRequest.builder()
                .prompt(new Prompt("transform"))
                .context(Map.of(
                        FogUiAdvisorContextKeys.REQUEST_ID, requestId,
                        FogUiAdvisorContextKeys.ROUTE_MODE, route))
                .build();
    }

    private ChatClientResponse responseWithJson(String json) {
        AssistantMessage message = new AssistantMessage(json);
        ChatResponse chatResponse = new ChatResponse(List.of(new Generation(message)));
        return ChatClientResponse.builder()
                .chatResponse(chatResponse)
                .context(Map.of())
                .build();
    }

    private static final class FixedCallChain implements CallAdvisorChain {
        private final ChatClientResponse response;

        private FixedCallChain(ChatClientResponse response) {
            this.response = response;
        }

        @Override
        public ChatClientResponse nextCall(ChatClientRequest chatClientRequest) {
            return response;
        }

        @Override
        public List<CallAdvisor> getCallAdvisors() {
            return List.of();
        }
    }
}
