package com.genui.service;

import com.genui.model.openai.LLMProvider;
import com.genui.model.openai.LLMProviderConfig;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.ai.openai.api.OpenAiApi;
import org.springframework.ai.azure.openai.AzureOpenAiChatModel;
import org.springframework.ai.azure.openai.AzureOpenAiChatOptions;
import org.springframework.stereotype.Service;
import com.azure.ai.openai.OpenAIClientBuilder;
import com.azure.core.credential.AzureKeyCredential;

/**
 * Factory for creating Spring AI ChatClient instances from user-provided API keys (BYOK).
 * This enables runtime configuration of LLM providers based on request headers.
 */
@Slf4j
@Service
public class ChatClientFactory {

    /**
     * Creates a ChatClient configured with the specified LLM provider and credentials
     */
    public ChatClient createClient(LLMProviderConfig config) {
        return switch (config.getProvider()) {
            case OPENAI -> createOpenAiClient(config);
            case AZURE_OPENAI -> createAzureOpenAiClient(config);
            case ANTHROPIC -> throw new UnsupportedOperationException(
                    "Anthropic support requires additional configuration. Use OpenAI-compatible endpoint.");
            case GOOGLE -> throw new UnsupportedOperationException(
                    "Google AI support requires additional configuration.");
        };
    }

    private ChatClient createOpenAiClient(LLMProviderConfig config) {
        log.info("Creating OpenAI client with model: {}", config.getModel());

        var api = new OpenAiApi(config.getApiKey());

        var options = OpenAiChatOptions.builder()
                .withModel(config.getModel())
                .withTemperature(0.7)
                .build();

        var chatModel = new OpenAiChatModel(api, options);

        return ChatClient.builder(chatModel).build();
    }

    private ChatClient createAzureOpenAiClient(LLMProviderConfig config) {
        if (config.getEndpoint() == null || config.getEndpoint().isEmpty()) {
            throw new IllegalArgumentException("Azure OpenAI requires endpoint");
        }
        if (config.getDeploymentName() == null || config.getDeploymentName().isEmpty()) {
            throw new IllegalArgumentException("Azure OpenAI requires deployment name");
        }

        log.info("Creating Azure OpenAI client with endpoint: {}, deployment: {}", 
                config.getEndpoint(), config.getDeploymentName());

        // Build Azure OpenAI client builder (not client) - Spring AI needs the builder
        var azureClientBuilder = new OpenAIClientBuilder()
                .endpoint(config.getEndpoint())
                .credential(new AzureKeyCredential(config.getApiKey()));

        var options = AzureOpenAiChatOptions.builder()
                .withDeploymentName(config.getDeploymentName())
                .withTemperature(0.7)
                .build();

        var chatModel = new AzureOpenAiChatModel(azureClientBuilder, options);

        return ChatClient.builder(chatModel).build();
    }

    /**
     * Extracts provider configuration from request headers
     */
    public LLMProviderConfig extractConfig(
            String llmApiKey,
            String model,
            String llmProvider,
            String azureEndpoint,
            String azureDeployment) {

        if (llmApiKey == null || llmApiKey.isEmpty()) {
            return null;
        }

        // Auto-detect provider from API key format if not specified
        var provider = detectProvider(llmApiKey, llmProvider);

        return LLMProviderConfig.builder()
                .provider(provider)
                .apiKey(llmApiKey)
                .model(model)
                .endpoint(azureEndpoint)
                .deploymentName(azureDeployment != null ? azureDeployment : model)
                .build();
    }

    private LLMProvider detectProvider(String apiKey, String providerHint) {
        // If provider explicitly specified
        if (providerHint != null && !providerHint.isEmpty()) {
            return switch (providerHint.toLowerCase()) {
                case "openai" -> LLMProvider.OPENAI;
                case "azure", "azureopenai", "azure-openai" -> LLMProvider.AZURE_OPENAI;
                case "anthropic", "claude" -> LLMProvider.ANTHROPIC;
                case "google", "gemini" -> LLMProvider.GOOGLE;
                default -> LLMProvider.OPENAI;
            };
        }

        // Auto-detect from key format
        if (apiKey.startsWith("sk-")) {
            return LLMProvider.OPENAI;
        }
        if (apiKey.startsWith("sk-ant-")) {
            return LLMProvider.ANTHROPIC;
        }

        // Default to OpenAI
        return LLMProvider.OPENAI;
    }
}
