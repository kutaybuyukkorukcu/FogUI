package com.genui.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.google.genai.GoogleGenAiChatModel;
import org.springframework.ai.google.genai.GoogleGenAiChatOptions;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Factory for creating Spring AI ChatClient instances.
 * Supports multiple providers: OpenAI-compatible (Groq, OpenRouter, OpenAI) and Google Gemini.
 */
@Slf4j
@Service
public class ChatClientFactory {

    private final OpenAiChatModel openAiChatModel;
    private final GoogleGenAiChatModel geminiChatModel;

    @Value("${fogui.ai.provider:openai}")
    private String provider;

    @Value("${spring.ai.openai.chat.options.model:llama-3.3-70b-versatile}")
    private String openAiModel;

    @Value("${spring.ai.google.genai.chat.options.model:gemini-2.5-flash}")
    private String geminiModel;

    @Autowired
    public ChatClientFactory(
            @Autowired(required = false) OpenAiChatModel openAiChatModel,
            @Autowired(required = false) GoogleGenAiChatModel geminiChatModel) {
        this.openAiChatModel = openAiChatModel;
        this.geminiChatModel = geminiChatModel;
        log.info("ChatClientFactory initialized - OpenAI: {}, Gemini: {}",
                openAiChatModel != null ? "available" : "not configured",
                geminiChatModel != null ? "available" : "not configured");
    }

    /**
     * Creates a ChatClient using the configured provider.
     */
    public ChatClient createClient() {
        ChatModel model = getActiveModel();
        String modelName = getActiveModelName();
        log.info("Creating ChatClient with provider: {}, model: {}", provider, modelName);
        return ChatClient.builder(model).build();
    }

    /**
     * Creates a ChatClient with custom options.
     *
     * @param model       The model to use
     * @param temperature The temperature for response generation (0.0 - 1.0)
     */
    public ChatClient createClient(String model, Double temperature) {
        log.info("Creating ChatClient with provider: {}, model: {}, temperature: {}", provider, model, temperature);

        if ("gemini".equalsIgnoreCase(provider)) {
            return createGeminiClient(model, temperature);
        } else {
            return createOpenAiClient(model, temperature);
        }
    }

    /**
     * Returns the name of the currently active model.
     */
    public String getActiveModelName() {
        return "gemini".equalsIgnoreCase(provider) ? geminiModel : openAiModel;
    }

    /**
     * Returns the currently active provider name.
     */
    public String getActiveProvider() {
        return provider;
    }

    private ChatModel getActiveModel() {
        if ("gemini".equalsIgnoreCase(provider)) {
            if (geminiChatModel == null) {
                throw new IllegalStateException("Gemini provider selected but GOOGLE_AI_API_KEY not configured");
            }
            return geminiChatModel;
        } else {
            if (openAiChatModel == null) {
                throw new IllegalStateException("OpenAI provider selected but OPENAI_API_KEY/GROQ_API_KEY not configured");
            }
            return openAiChatModel;
        }
    }

    private ChatClient createOpenAiClient(String model, Double temperature) {
        if (openAiChatModel == null) {
            throw new IllegalStateException("OpenAI provider not configured");
        }
        var options = OpenAiChatOptions.builder()
                .model(model != null ? model : openAiModel)
                .temperature(temperature != null ? temperature : 0.7)
                .build();
        return ChatClient.builder(openAiChatModel)
                .defaultOptions(options)
                .build();
    }

    private ChatClient createGeminiClient(String model, Double temperature) {
        if (geminiChatModel == null) {
            throw new IllegalStateException("Gemini provider not configured");
        }
        var options = GoogleGenAiChatOptions.builder()
                .model(model != null ? model : geminiModel)
                .temperature(temperature != null ? temperature : 0.7)
                .build();
        return ChatClient.builder(geminiChatModel)
                .defaultOptions(options)
                .build();
    }
}
