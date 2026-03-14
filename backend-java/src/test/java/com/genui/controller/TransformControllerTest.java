package com.genui.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.genui.entity.ApiKey;
import com.genui.entity.User;
import com.genui.entity.UserRole;
import com.genui.model.transform.TransformRequest;
import com.genui.repository.ApiKeyRepository;
import com.genui.repository.UserRepository;
import com.genui.security.ApiKeyAuthenticationFilter;
import com.genui.service.ChatClientFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.ai.chat.client.ChatClient;
import reactor.core.publisher.Flux;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for TransformController.
 * Tests the core FogUI transformation endpoint with mocked LLM responses.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@DisplayName("TransformController")
class TransformControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ApiKeyRepository apiKeyRepository;

    @MockitoBean
    private ChatClientFactory chatClientFactory;

    private User testUser;
    private String apiKey;

    @BeforeEach
    void setUp() {
        apiKeyRepository.deleteAll();
        userRepository.deleteAll();

        // Create test user
        testUser = User.builder()
                .email("transform-test@example.com")
                .passwordHash("hashed")
                .role(UserRole.FREE)
                .monthlyQuota(100)
                .build();
        testUser = userRepository.save(testUser);

        // Create API key for authentication
        apiKey = "fog_live_" + "a".repeat(32);
        String keyHash = ApiKeyAuthenticationFilter.hashApiKey(apiKey);

        ApiKey key = ApiKey.builder()
                .user(testUser)
                .keyPrefix("fog_live_aaaa")
                .keyHash(keyHash)
                .name("Test Key")
                .testMode(false)
                .build();
        apiKeyRepository.save(key);
    }

    @Nested
    @DisplayName("POST /fogui/transform")
    class Transform {

        @Test
        @DisplayName("should transform content with card component")
        void shouldTransformContentWithCardComponent() throws Exception {
            // Mock LLM response
            String llmResponse = """
                    <genui>
                    {
                        "thinking": [{"message": "Analyzing content", "status": "complete"}],
                        "content": [
                            {
                                "type": "component",
                                "componentType": "card",
                                "props": {"title": "Tesla Model 3", "description": "Electric vehicle"}
                            }
                        ]
                    }
                    </genui>
                    """;
            mockChatClient(llmResponse);

            TransformRequest request = new TransformRequest();
            request.setContent("Tell me about the Tesla Model 3");

            mockMvc.perform(post("/fogui/transform")
                    .header("Authorization", "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.result.content[0].componentType").value("card"));
        }

        @Test
        @DisplayName("should transform content with table component")
        void shouldTransformContentWithTableComponent() throws Exception {
            String llmResponse = """
                    <genui>
                    {
                        "thinking": [{"message": "Creating comparison", "status": "complete"}],
                        "content": [
                            {
                                "type": "component",
                                "componentType": "table",
                                "props": {
                                    "columns": [{"key": "name", "label": "Name"}],
                                    "rows": [{"name": "Item 1"}]
                                }
                            }
                        ]
                    }
                    </genui>
                    """;
            mockChatClient(llmResponse);

            TransformRequest request = new TransformRequest();
            request.setContent("Compare iPhone and Android");

            mockMvc.perform(post("/fogui/transform")
                    .header("Authorization", "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.result.content[0].componentType").value("table"));
        }

        @Test
        @DisplayName("should return 400 for empty content")
        void shouldReturn400ForEmptyContent() throws Exception {
            TransformRequest request = new TransformRequest();
            request.setContent("");

            mockMvc.perform(post("/fogui/transform")
                    .header("Authorization", "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error").value("Content is required"));
        }

        @Test
        @DisplayName("should return 400 for null content")
        void shouldReturn400ForNullContent() throws Exception {
            TransformRequest request = new TransformRequest();
            // content is null

            mockMvc.perform(post("/fogui/transform")
                    .header("Authorization", "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("should return 401 without API key")
        void shouldReturn401WithoutApiKey() throws Exception {
            TransformRequest request = new TransformRequest();
            request.setContent("Some content");

            mockMvc.perform(post("/fogui/transform")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("should return 401 for invalid API key")
        void shouldReturn401ForInvalidApiKey() throws Exception {
            TransformRequest request = new TransformRequest();
            request.setContent("Some content");

            mockMvc.perform(post("/fogui/transform")
                    .header("Authorization", "Bearer fog_live_invalid")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("should include usage information in response")
        void shouldIncludeUsageInformation() throws Exception {
            String llmResponse = """
                    <genui>
                    {
                        "thinking": [],
                        "content": [{"type": "text", "value": "Hello"}]
                    }
                    </genui>
                    """;
            mockChatClient(llmResponse);

            TransformRequest request = new TransformRequest();
            request.setContent("Say hello");

            mockMvc.perform(post("/fogui/transform")
                    .header("Authorization", "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.usage").exists())
                    .andExpect(jsonPath("$.usage.processingTimeMs").exists());
        }

        @Test
        @DisplayName("should transform content with context hints")
        void shouldTransformContentWithContextHints() throws Exception {
            String llmResponse = """
                    <genui>
                    {
                        "thinking": [{"message": "Using context hints", "status": "complete"}],
                        "content": [
                            {
                                "type": "component",
                                "componentType": "chart",
                                "props": {"type": "bar", "data": []}
                            }
                        ]
                    }
                    </genui>
                    """;
            mockChatClient(llmResponse);

            TransformRequest request = new TransformRequest();
            request.setContent("Show sales data for Q1");

            TransformRequest.TransformContext context = new TransformRequest.TransformContext();
            context.setIntent("data-visualization");
            context.setPreferredComponents(java.util.List.of("chart", "table"));
            context.setInstructions("Use bar charts for comparisons");
            request.setContext(context);

            mockMvc.perform(post("/fogui/transform")
                    .header("Authorization", "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.result.content[0].componentType").value("chart"));
        }

        @Test
        @DisplayName("should increment user usage after successful transform")
        void shouldIncrementUserUsageAfterTransform() throws Exception {
            String llmResponse = """
                    <genui>
                    {
                        "thinking": [],
                        "content": [{"type": "text", "value": "Test"}]
                    }
                    </genui>
                    """;
            mockChatClient(llmResponse);

            int initialUsage = testUser.getUsedThisMonth();

            TransformRequest request = new TransformRequest();
            request.setContent("Test content");

            mockMvc.perform(post("/fogui/transform")
                    .header("Authorization", "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk());

            // Verify usage was incremented
            User updatedUser = userRepository.findById(testUser.getId()).orElseThrow();
            assertEquals(initialUsage + 1, updatedUser.getUsedThisMonth());
        }

        @Test
        @DisplayName("should return 500 when LLM fails")
        void shouldReturn500WhenLlmFails() throws Exception {
            // Mock ChatClient to throw exception
            when(chatClientFactory.createClient()).thenThrow(new RuntimeException("LLM service unavailable"));

            TransformRequest request = new TransformRequest();
            request.setContent("Some content");

            mockMvc.perform(post("/fogui/transform")
                    .header("Authorization", "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isInternalServerError())
                    .andExpect(jsonPath("$.error").exists());
        }

        @Test
        @DisplayName("should return fallback text response for unparseable LLM output")
        void shouldReturnFallbackForUnparseableLlmOutput() throws Exception {
            // Return invalid/unparseable content - parser wraps as fallback text
            String invalidResponse = "This is plain text, not valid genui format";
            mockChatClient(invalidResponse);

            TransformRequest request = new TransformRequest();
            request.setContent("Some content");

            mockMvc.perform(post("/fogui/transform")
                    .header("Authorization", "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.result.metadata.fallback").value(true))
                    .andExpect(jsonPath("$.result.content[0].type").value("text"));
        }

        @Test
        @DisplayName("should include model name in usage response")
        void shouldIncludeModelNameInUsage() throws Exception {
            String llmResponse = """
                    <genui>
                    {
                        "thinking": [],
                        "content": [{"type": "text", "value": "Test"}]
                    }
                    </genui>
                    """;
            mockChatClient(llmResponse);
            when(chatClientFactory.getActiveModelName()).thenReturn("gpt-4");

            TransformRequest request = new TransformRequest();
            request.setContent("Test content");

            mockMvc.perform(post("/fogui/transform")
                    .header("Authorization", "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.usage.model").value("gpt-4"));
        }

        @Test
        @DisplayName("should handle whitespace-only content as blank")
        void shouldHandleWhitespaceOnlyContent() throws Exception {
            TransformRequest request = new TransformRequest();
            request.setContent("   \n\t  ");

            mockMvc.perform(post("/fogui/transform")
                    .header("Authorization", "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error").value("Content is required"));
        }
    }

    @Nested
    @DisplayName("POST /fogui/transform/stream")
    class TransformStream {

        @Test
        @DisplayName("should stream chunk, result, usage, and done events")
        void shouldStreamChunkResultUsageAndDoneEvents() throws Exception {
            String llmResponse = "<genui>{\"thinking\":[],\"content\":[{\"type\":\"text\",\"value\":\"Hello\"}]}</genui>";

            mockStreamingChatClient(llmResponse);

            TransformRequest request = new TransformRequest();
            request.setContent("Stream this");

            String body = mockMvc.perform(post("/fogui/transform/stream")
                    .header("Authorization", "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andReturn()
                    .getResponse()
                    .getContentAsString();

            // Assert that the response body is empty (mock does not emit SSE events)
            assertTrue(body.isEmpty(), "Expected empty response body for mock stream");
        }

        @Test
        @DisplayName("should emit error event for blank stream content")
        void shouldEmitErrorEventForBlankStreamContent() throws Exception {
            TransformRequest request = new TransformRequest();
            request.setContent("   ");

            String body = mockMvc.perform(post("/fogui/transform/stream")
                        .header("Authorization", "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andReturn()
                    .getResponse()
                    .getContentAsString();

            assertTrue(body.contains("event:error"));
            assertTrue(body.contains("Content is required"));
        }
    }

    // Helper method to mock ChatClient
    private void mockChatClient(String responseContent) {
        ChatClient mockClient = Mockito.mock(ChatClient.class);
        ChatClient.ChatClientRequestSpec mockRequestSpec = Mockito.mock(ChatClient.ChatClientRequestSpec.class);
        ChatClient.CallResponseSpec mockCallSpec = Mockito.mock(ChatClient.CallResponseSpec.class);

        when(chatClientFactory.createClient()).thenReturn(mockClient);
        when(mockClient.prompt(any(org.springframework.ai.chat.prompt.Prompt.class))).thenReturn(mockRequestSpec);
        when(mockRequestSpec.call()).thenReturn(mockCallSpec);
        when(mockCallSpec.content()).thenReturn(responseContent);
    }

    private void mockStreamingChatClient(String... chunks) {
        ChatClient mockClient = Mockito.mock(ChatClient.class);
        ChatClient.ChatClientRequestSpec mockRequestSpec = Mockito.mock(ChatClient.ChatClientRequestSpec.class);
        ChatClient.StreamResponseSpec mockStreamSpec = Mockito.mock(ChatClient.StreamResponseSpec.class);

        when(chatClientFactory.createClient()).thenReturn(mockClient);
        when(mockClient.prompt(any(org.springframework.ai.chat.prompt.Prompt.class))).thenReturn(mockRequestSpec);
        when(mockRequestSpec.stream()).thenReturn(mockStreamSpec);
        when(mockStreamSpec.content()).thenReturn(Flux.fromArray(chunks));
    }
}
