package com.genui.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.google.genai.GoogleGenAiChatModel;
import org.springframework.ai.google.genai.GoogleGenAiChatOptions;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Factory for creating Spring AI ChatClient instances.
 * Simplified to Gemini-only support via Google AI Studio API.
 */
@Slf4j
@Service
public class ChatClientFactory {

    private final GoogleGenAiChatModel chatModel;

    @Value("${spring.ai.google.genai.chat.options.model:gemini-2.0-flash}")
    private String defaultModel;

    @Autowired
    public ChatClientFactory(GoogleGenAiChatModel chatModel) {
        this.chatModel = chatModel;
        log.info("ChatClientFactory initialized with Google GenAI (Google AI Studio) support");
    }

    /**
     * Creates a ChatClient configured with Google GenAI (Gemini).
     * Uses the auto-configured GoogleGenAiChatModel from Spring AI.
     */
    public ChatClient createClient() {
        log.info("Creating Google GenAI ChatClient with model: {}", defaultModel);
        return ChatClient.builder(chatModel).build();
    }

    /**
     * Creates a ChatClient with custom options.
     * 
     * @param model       The Gemini model to use (e.g., "gemini-2.0-flash",
     *                    "gemini-2.0-flash-lite")
     * @param temperature The temperature for response generation (0.0 - 1.0)
     */
    public ChatClient createClient(String model, Double temperature) {
        log.info("Creating Google GenAI ChatClient with model: {}, temperature: {}", model, temperature);

        var options = GoogleGenAiChatOptions.builder()
                .model(model != null ? model : defaultModel)
                .temperature(temperature != null ? temperature : 0.7)
                .build();

        // Create a new client with custom options
        return ChatClient.builder(chatModel)
                .defaultOptions(options)
                .build();
    }
}
