package com.genui.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;

/**
 * Unit tests for ChatClientFactory.
 * Tests OpenAI-only client creation logic.
 */
@DisplayName("ChatClientFactory")
@ExtendWith(MockitoExtension.class)
class ChatClientFactoryTest {

    @Nested
    @DisplayName("getActiveModelName")
    class GetActiveModelName {

        @Test
        @DisplayName("should return configured OpenAI model")
        void shouldReturnConfiguredOpenAiModel() {
            OpenAiChatModel mockOpenAiModel = mock(OpenAiChatModel.class);
            ChatClientFactory factory = new ChatClientFactory(mockOpenAiModel);
            ReflectionTestUtils.setField(factory, "openAiModel", "gpt-4.1-nano");

            String modelName = factory.getActiveModelName();

            assertEquals("gpt-4.1-nano", modelName);
        }
    }

    @Nested
    @DisplayName("createClient")
    class CreateClientSuccess {

        @Test
        @DisplayName("should create ChatClient with OpenAI model")
        void shouldCreateChatClientWithOpenAiModel() {
            OpenAiChatModel mockOpenAiModel = mock(OpenAiChatModel.class);
            ChatClientFactory factory = new ChatClientFactory(mockOpenAiModel);
            ReflectionTestUtils.setField(factory, "openAiModel", "gpt-4.1-nano");

            ChatClient client = factory.createClient();

            assertNotNull(client);
        }
    }

    @Nested
    @DisplayName("error handling")
    class ErrorHandling {

        @Test
        @DisplayName("should throw when OpenAI model is not configured")
        void shouldThrowWhenOpenAiNotConfigured() {
            ChatClientFactory factory = new ChatClientFactory(null);

            assertThrows(IllegalStateException.class, factory::createClient);
        }

        @Test
        @DisplayName("should throw with helpful message")
        void shouldThrowWithAppropriateMessageForOpenAi() {
            ChatClientFactory factory = new ChatClientFactory(null);

            IllegalStateException exception = assertThrows(
                    IllegalStateException.class,
                    factory::createClient
            );

            assertTrue(exception.getMessage().contains("OpenAI"));
        }
    }
}
