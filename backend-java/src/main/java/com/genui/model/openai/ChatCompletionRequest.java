package com.genui.model.openai;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * OpenAI-compatible chat completion request.
 * Users can send requests in the same format they'd send to OpenAI.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatCompletionRequest {

    /**
     * Model to use (we map this to our supported providers)
     */
    @JsonProperty("model")
    @Builder.Default
    private String model = "gpt-4o-mini";

    /**
     * Conversation history
     */
    @JsonProperty("messages")
    @Builder.Default
    private List<ChatMessage> messages = new ArrayList<>();

    /**
     * Whether to stream the response
     */
    @JsonProperty("stream")
    @Builder.Default
    private boolean stream = false;

    /**
     * Sampling temperature (0-2)
     */
    @JsonProperty("temperature")
    private Double temperature;

    /**
     * Maximum tokens to generate
     */
    @JsonProperty("max_tokens")
    private Integer maxTokens;

    /**
     * Nucleus sampling parameter
     */
    @JsonProperty("top_p")
    private Double topP;

    /**
     * Stop sequences
     */
    @JsonProperty("stop")
    private Object stop;

    /**
     * User identifier for tracking
     */
    @JsonProperty("user")
    private String user;
}
