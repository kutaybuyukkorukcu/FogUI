package com.genui.service;

import com.genui.starter.policy.FogUiGenerationPolicy;
import com.genui.starter.policy.FogUiGenerationPolicyService;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.api.Advisor;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Objects;

/**
 * Factory for creating Spring AI ChatClient instances.
 * This backend is configured to use OpenAI-compatible providers only.
 */
@Slf4j
@Service
public class ChatClientFactory {

    private final OpenAiChatModel openAiChatModel;
    private final FogUiGenerationPolicyService generationPolicyService;
    private final List<Advisor> defaultAdvisors;

    @Value("${spring.ai.openai.chat.options.model:gpt-4.1-nano}")
    private String openAiModel;

    @Value("${spring.ai.openai.base-url:https://api.openai.com}")
    private String openAiBaseUrl;

    public ChatClientFactory(
            OpenAiChatModel openAiChatModel,
            FogUiGenerationPolicyService generationPolicyService,
            ObjectProvider<List<Advisor>> advisorProvider
    ) {
        this.openAiChatModel = openAiChatModel;
        this.generationPolicyService = generationPolicyService;
        this.defaultAdvisors = advisorProvider.getIfAvailable(List::of);
        log.info("ChatClientFactory initialized - OpenAI model available: {}", openAiChatModel != null);
    }

    /**
     * Creates a ChatClient using the configured OpenAI-compatible provider.
     */
    public ChatClient createClient() {
        return createClientInternal(true);
    }

    /**
     * Creates a ChatClient without default advisors.
     * Useful for evaluation baselines that should skip the FogUI trust layer.
     */
    public ChatClient createClientWithoutAdvisors() {
        return createClientInternal(false);
    }

    private ChatClient createClientInternal(boolean includeDefaultAdvisors) {
        if (openAiChatModel == null) {
            throw new IllegalStateException("OpenAI provider not configured. Set OPENAI_API_KEY and OPENAI_MODEL.");
        }

        log.info(
                "Creating ChatClient with model: {} and {} default advisors (enabled={})",
                getActiveModelName(),
                defaultAdvisors.size(),
                includeDefaultAdvisors);

        ChatClient.Builder builder = ChatClient.builder(Objects.requireNonNull(openAiChatModel));
        if (includeDefaultAdvisors) {
            builder.defaultAdvisors(Objects.requireNonNull(defaultAdvisors));
        }

        return builder.build();
    }

    /**
     * Applies deterministic generation policy to a request spec.
     */
    public void applyDeterministicOptions(ChatClient.ChatClientRequestSpec requestSpec) {
        requestSpec.options(Objects.requireNonNull(buildDeterministicOptions()));
    }

    public OpenAiChatOptions buildDeterministicOptions() {
        FogUiGenerationPolicy policy = generationPolicyService.resolve(getActiveModelName());
        OpenAiChatOptions options = OpenAiChatOptions.builder()
                .model(policy.getModel())
                .build();

        options.setTemperature(policy.getTemperature());
        options.setTopP(policy.getTopP());
        options.setSeed(policy.getSeed());
        options.setMaxTokens(policy.getMaxTokens());
        options.setMaxCompletionTokens(policy.getMaxCompletionTokens());
        return options;
    }

    /**
     * Returns the name of the currently active model.
     */
    public String getActiveModelName() {
        return openAiModel;
    }

    /**
     * Returns the currently configured OpenAI-compatible provider base URL.
     */
    public String getActiveProviderBaseUrl() {
        return openAiBaseUrl;
    }

    @PostConstruct
    void logDeterministicPolicy() {
        FogUiGenerationPolicy policy = generationPolicyService.resolve(getActiveModelName());
        log.info(
                "Deterministic generation policy active: model={}, temperature={}, topP={}, seed={}, maxTokens={}, maxCompletionTokens={}, skipped={}",
                policy.getModel(),
                policy.getTemperature(),
                policy.getTopP(),
                policy.getSeed(),
                policy.getMaxTokens(),
                policy.getMaxCompletionTokens(),
                policy.getSkippedOptions());
    }
}
