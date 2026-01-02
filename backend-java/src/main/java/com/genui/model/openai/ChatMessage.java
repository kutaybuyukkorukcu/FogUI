package com.genui.model.openai;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Chat message in OpenAI format
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessage {

    @JsonProperty("role")
    @Builder.Default
    private String role = "user";

    @JsonProperty("content")
    @Builder.Default
    private String content = "";

    @JsonProperty("name")
    private String name;
}
