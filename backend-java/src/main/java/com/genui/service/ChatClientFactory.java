package com.genui.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.vertexai.gemini.VertexAiGeminiChatModel;
import org.springframework.ai.vertexai.gemini.VertexAiGeminiChatOptions;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Factory for creating Spring AI ChatClient instances.
 * Simplified to Gemini-only support - the primary LLM for FogUI backend.
 */
@Slf4j
@Service
public class ChatClientFactory {

    private final VertexAiGeminiChatModel geminiChatModel;

    @Value("${spring.ai.vertex.ai.gemini.model:gemini-2.5-flash-lite}")
    private String defaultModel;

    @Autowired
    public ChatClientFactory(VertexAiGeminiChatModel geminiChatModel) {
        this.geminiChatModel = geminiChatModel;
        log.info("ChatClientFactory initialized with Gemini support");
    }

    /**
     * Creates a ChatClient configured with Gemini.
     * Uses the auto-configured VertexAiGeminiChatModel from Spring AI.
     */
    public ChatClient createClient() {
        log.info("Creating Gemini ChatClient with model: {}", defaultModel);
        return ChatClient.builder(geminiChatModel).build();
    }

    /**
     * Creates a ChatClient with custom options.
     * 
     * @param model       The Gemini model to use (e.g., "gemini-2.5-flash-lite",
     *                    "gemini-2.5-pro")
     * @param temperature The temperature for response generation (0.0 - 1.0)
     */
    public ChatClient createClient(String model, Double temperature) {
        log.info("Creating Gemini ChatClient with model: {}, temperature: {}", model, temperature);

        var options = VertexAiGeminiChatOptions.builder()
                .withModel(model != null ? model : defaultModel)
                .withTemperature(temperature != null ? temperature : 0.7)
                .build();

        // Create a new model with custom options
        // Note: In production, you might want to cache these instances
        return ChatClient.builder(geminiChatModel)
                .defaultOptions(options)
                .build();
    }
}
