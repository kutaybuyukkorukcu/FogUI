package com.genui.controller;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.genui.model.openai.*;
import com.genui.service.ChatClientFactory;
import com.genui.service.TokenCostCalculator;
import com.genui.service.UIComponentPrompts;
import com.genui.service.UIResponseParser;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * OpenAI-compatible chat completions endpoint.
 * <p>
 * This is the main API endpoint for GenUI - users call this instead of OpenAI directly.
 * We inject our system prompts to transform LLM output into structured UI.
 */
@Slf4j
@RestController
@RequestMapping("/v1")
@RequiredArgsConstructor
public class ChatCompletionsController {

    private final ChatClientFactory chatClientFactory;
    private final UIResponseParser responseParser;
    private final TokenCostCalculator costCalculator;

    private final ObjectMapper objectMapper = new ObjectMapper()
            .setPropertyNamingStrategy(PropertyNamingStrategies.LOWER_CAMEL_CASE);

    private final ExecutorService executor = Executors.newCachedThreadPool();

    @Value("${genui.default-provider:openai}")
    private String defaultProvider;

    @Value("${spring.ai.openai.api-key:}")
    private String fallbackOpenAiKey;

    @Value("${spring.ai.azure.openai.api-key:}")
    private String fallbackAzureKey;

    @Value("${spring.ai.azure.openai.endpoint:}")
    private String fallbackAzureEndpoint;

    @Value("${spring.ai.azure.openai.chat.options.deployment-name:}")
    private String fallbackAzureDeployment;

    /**
     * POST /v1/chat/completions
     * OpenAI-compatible endpoint that returns GenUI-enhanced responses
     */
    @PostMapping("/chat/completions")
    public ResponseEntity<?> chatCompletions(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestHeader(value = "X-LLM-API-Key", required = false) String llmApiKey,
            @RequestHeader(value = "X-LLM-Provider", required = false) String llmProvider,
            @RequestHeader(value = "X-Azure-Endpoint", required = false) String azureEndpoint,
            @RequestHeader(value = "X-Azure-Deployment", required = false) String azureDeployment,
            @RequestBody ChatCompletionRequest request) {

        try {
            // BYOK: Try to get config from headers first
            var llmConfig = chatClientFactory.extractConfig(
                    llmApiKey,
                    request.getModel(),
                    llmProvider,
                    azureEndpoint,
                    azureDeployment);

            // Fallback: Use application config for local development
            if (llmConfig == null) {
                llmConfig = getFallbackConfig(request.getModel());
            }

            if (llmConfig == null) {
                return ResponseEntity.badRequest().body(
                        OpenAIErrorResponse.builder()
                                .error(OpenAIError.builder()
                                        .message("Missing LLM API key. Provide your API key in the X-LLM-API-Key header.")
                                        .type("invalid_request_error")
                                        .code("missing_api_key")
                                        .build())
                                .build()
                );
            }

            // Create chat client from user's credentials
            var chatClient = chatClientFactory.createClient(llmConfig);

            // Non-streaming response
            return nonStreamResponse(chatClient, request, llmConfig);

        } catch (Exception ex) {
            log.error("Error processing chat completion", ex);
            return ResponseEntity.status(500).body(
                    OpenAIErrorResponse.builder()
                            .error(OpenAIError.builder()
                                    .message("Internal server error: " + ex.getMessage())
                                    .type("server_error")
                                    .code("internal_error")
                                    .build())
                            .build()
            );
        }
    }

    /**
     * POST /v1/chat/completions/stream
     * Streaming endpoint using SSE
     */
    @PostMapping(value = "/chat/completions/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter chatCompletionsStream(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestHeader(value = "X-LLM-API-Key", required = false) String llmApiKey,
            @RequestHeader(value = "X-LLM-Provider", required = false) String llmProvider,
            @RequestHeader(value = "X-Azure-Endpoint", required = false) String azureEndpoint,
            @RequestHeader(value = "X-Azure-Deployment", required = false) String azureDeployment,
            @RequestBody ChatCompletionRequest request) {

        SseEmitter emitter = new SseEmitter(300000L); // 5 min timeout

        executor.execute(() -> {
            try {
                var llmConfig = chatClientFactory.extractConfig(
                        llmApiKey,
                        request.getModel(),
                        llmProvider,
                        azureEndpoint,
                        azureDeployment);

                if (llmConfig == null) {
                    llmConfig = getFallbackConfig(request.getModel());
                }

                if (llmConfig == null) {
                    emitter.send(SseEmitter.event()
                            .data("{\"error\": \"Missing API key\"}"));
                    emitter.complete();
                    return;
                }

                var chatClient = chatClientFactory.createClient(llmConfig);
                streamResponse(emitter, chatClient, request, llmConfig);

            } catch (Exception ex) {
                log.error("Error in streaming", ex);
                try {
                    emitter.send(SseEmitter.event()
                            .data("{\"error\": \"" + ex.getMessage() + "\"}"));
                    emitter.complete();
                } catch (IOException e) {
                    emitter.completeWithError(e);
                }
            }
        });

        return emitter;
    }

    private ResponseEntity<ChatCompletionResponse> nonStreamResponse(
            org.springframework.ai.chat.client.ChatClient chatClient,
            ChatCompletionRequest request,
            LLMProviderConfig config) {

        var messages = buildMessages(request.getMessages());
        var prompt = new Prompt(messages);

        var response = chatClient.prompt(prompt).call();
        var content = response.content();

        var genUIResponse = responseParser.parse(content);

        var chatResponse = ChatCompletionResponse.builder()
                .id("chatcmpl-" + UUID.randomUUID().toString().replace("-", ""))
                .model(request.getModel())
                .created(Instant.now().getEpochSecond())
                .choices(List.of(
                        ChatChoice.builder()
                                .index(0)
                                .message(ChatMessage.builder()
                                        .role("assistant")
                                        .content(content)
                                        .build())
                                .finishReason("stop")
                                .build()
                ))
                .genui(genUIResponse)
                .build();

        return ResponseEntity.ok(chatResponse);
    }

    private void streamResponse(
            SseEmitter emitter,
            org.springframework.ai.chat.client.ChatClient chatClient,
            ChatCompletionRequest request,
            LLMProviderConfig config) {

        var messages = buildMessages(request.getMessages());
        var prompt = new Prompt(messages);

        var completionId = "chatcmpl-" + UUID.randomUUID().toString().replace("-", "");
        var created = Instant.now().getEpochSecond();
        var fullContent = new StringBuilder();

        try {
            chatClient.prompt(prompt)
                    .stream()
                    .content()
                    .doOnNext(chunk -> {
                        fullContent.append(chunk);

                        var streamChunk = ChatCompletionChunk.builder()
                                .id(completionId)
                                .created(created)
                                .model(request.getModel())
                                .choices(List.of(
                                        StreamChoice.builder()
                                                .index(0)
                                                .delta(ChatMessageDelta.builder()
                                                        .content(chunk)
                                                        .build())
                                                .build()
                                ))
                                .build();

                        try {
                            emitter.send(SseEmitter.event()
                                    .data(objectMapper.writeValueAsString(streamChunk)));
                        } catch (Exception e) {
                            log.error("Error sending chunk", e);
                        }
                    })
                    .doOnComplete(() -> {
                        try {
                            // Final chunk
                            var finalChunk = ChatCompletionChunk.builder()
                                    .id(completionId)
                                    .created(created)
                                    .model(request.getModel())
                                    .choices(List.of(
                                            StreamChoice.builder()
                                                    .index(0)
                                                    .delta(new ChatMessageDelta())
                                                    .finishReason("stop")
                                                    .build()
                                    ))
                                    .build();
                            emitter.send(SseEmitter.event()
                                    .data(objectMapper.writeValueAsString(finalChunk)));

                            // GenUI response
                            var genUIResponse = responseParser.parse(fullContent.toString());
                            if (genUIResponse != null) {
                                emitter.send(SseEmitter.event()
                                        .name("genui")
                                        .data(objectMapper.writeValueAsString(genUIResponse)));
                            }

                            // Usage info
                            var promptText = request.getMessages().stream()
                                    .map(ChatMessage::getContent)
                                    .reduce("", (a, b) -> a + " " + b);
                            var promptTokens = TokenCostCalculator.estimateTokenCount(
                                    promptText + UIComponentPrompts.SYSTEM_PROMPT);
                            var completionTokens = TokenCostCalculator.estimateTokenCount(fullContent.toString());
                            var usage = costCalculator.buildUsageInfo(config.getModel(), promptTokens, completionTokens);
                            emitter.send(SseEmitter.event()
                                    .name("usage")
                                    .data(objectMapper.writeValueAsString(usage)));

                            log.info("Request completed: {} prompt + {} completion = ${}",
                                    usage.getPromptTokens(),
                                    usage.getCompletionTokens(),
                                    usage.getEstimatedCost() != null ? usage.getEstimatedCost().getTotalCost() : "N/A");

                            // Done marker
                            emitter.send(SseEmitter.event().data("[DONE]"));
                            emitter.complete();

                        } catch (Exception e) {
                            log.error("Error completing stream", e);
                            emitter.completeWithError(e);
                        }
                    })
                    .doOnError(error -> {
                        log.error("Stream error", error);
                        emitter.completeWithError(error);
                    })
                    .subscribe();

        } catch (Exception e) {
            log.error("Error starting stream", e);
            emitter.completeWithError(e);
        }
    }

    private List<Message> buildMessages(List<ChatMessage> messages) {
        var result = new ArrayList<Message>();
        result.add(new SystemMessage(UIComponentPrompts.SYSTEM_PROMPT));

        for (var msg : messages) {
            switch (msg.getRole().toLowerCase()) {
                case "system" -> result.add(new SystemMessage(msg.getContent()));
                case "user" -> result.add(new UserMessage(msg.getContent()));
                case "assistant" -> result.add(new AssistantMessage(msg.getContent()));
            }
        }

        return result;
    }

    private LLMProviderConfig getFallbackConfig(String model) {
        if ("openai".equalsIgnoreCase(defaultProvider) && !fallbackOpenAiKey.isBlank()) {
            return LLMProviderConfig.builder()
                    .provider(LLMProvider.OPENAI)
                    .apiKey(fallbackOpenAiKey)
                    .model(model)
                    .build();
        }

        if ("azureopenai".equalsIgnoreCase(defaultProvider) && !fallbackAzureKey.isBlank()) {
            return LLMProviderConfig.builder()
                    .provider(LLMProvider.AZURE_OPENAI)
                    .apiKey(fallbackAzureKey)
                    .endpoint(fallbackAzureEndpoint)
                    .deploymentName(fallbackAzureDeployment.isBlank() ? model : fallbackAzureDeployment)
                    .model(model)
                    .build();
        }

        log.warn("No fallback LLM provider configured");
        return null;
    }
}
