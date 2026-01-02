package com.genui.model.openai;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Streaming chunk response (SSE format)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatCompletionChunk {

    @JsonProperty("id")
    @Builder.Default
    private String id = "chatcmpl-" + UUID.randomUUID().toString().replace("-", "");

    @JsonProperty("object")
    @Builder.Default
    private String object = "chat.completion.chunk";

    @JsonProperty("created")
    @Builder.Default
    private long created = Instant.now().getEpochSecond();

    @JsonProperty("model")
    @Builder.Default
    private String model = "";

    @JsonProperty("choices")
    @Builder.Default
    private List<StreamChoice> choices = new ArrayList<>();
}
