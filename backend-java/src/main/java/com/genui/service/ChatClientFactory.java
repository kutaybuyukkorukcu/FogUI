package com.genui.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Factory for creating Spring AI ChatClient instances.
 * This backend is configured to use OpenAI-compatible providers only.
 */
@Slf4j
@Service
public class ChatClientFactory {

    private final OpenAiChatModel openAiChatModel;

    @Value("${spring.ai.openai.chat.options.model:gpt-4.1-nano}")
    private String openAiModel;

    public ChatClientFactory(OpenAiChatModel openAiChatModel) {
        this.openAiChatModel = openAiChatModel;
        log.info("ChatClientFactory initialized - OpenAI model available: {}", openAiChatModel != null);
    }

    /**
     * Creates a ChatClient using the configured OpenAI-compatible provider.
     */
    public ChatClient createClient() {
        if (openAiChatModel == null) {
            throw new IllegalStateException("OpenAI provider not configured. Set OPENAI_API_KEY and OPENAI_MODEL.");
        }

        log.info("Creating ChatClient with model: {}", getActiveModelName());
        return ChatClient.builder(openAiChatModel).build();
    }

    /**
     * Returns the name of the currently active model.
     */
    public String getActiveModelName() {
        return openAiModel;
    }
}
