package com.genui.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Factory for creating Spring AI ChatClient instances.
 * Uses OpenAI-compatible API (supports Groq, OpenRouter, OpenAI, etc.)
 */
@Slf4j
@Service
public class ChatClientFactory {

    private final OpenAiChatModel chatModel;

    @Value("${spring.ai.openai.chat.options.model:llama-3.3-70b-versatile}")
    private String defaultModel;

    @Autowired
    public ChatClientFactory(OpenAiChatModel chatModel) {
        this.chatModel = chatModel;
        log.info("ChatClientFactory initialized with OpenAI-compatible API support (Groq, OpenRouter, etc.)");
    }

    /**
     * Creates a ChatClient configured with the default model.
     * Uses the auto-configured OpenAiChatModel from Spring AI.
     */
    public ChatClient createClient() {
        log.info("Creating ChatClient with model: {}", defaultModel);
        return ChatClient.builder(chatModel).build();
    }

    /**
     * Creates a ChatClient with custom options.
     * 
     * @param model       The model to use (e.g., "llama-3.3-70b-versatile", "gpt-4o")
     * @param temperature The temperature for response generation (0.0 - 1.0)
     */
    public ChatClient createClient(String model, Double temperature) {
        log.info("Creating ChatClient with model: {}, temperature: {}", model, temperature);

        var options = OpenAiChatOptions.builder()
                .model(model != null ? model : defaultModel)
                .temperature(temperature != null ? temperature : 0.7)
                .build();

        // Create a new client with custom options
        return ChatClient.builder(chatModel)
                .defaultOptions(options)
                .build();
    }
}
