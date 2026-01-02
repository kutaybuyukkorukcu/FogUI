package com.genui.model.openai;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatChoice {

    @JsonProperty("index")
    @Builder.Default
    private int index = 0;

    @JsonProperty("message")
    @Builder.Default
    private ChatMessage message = new ChatMessage();

    @JsonProperty("finish_reason")
    @Builder.Default
    private String finishReason = "stop";
}
