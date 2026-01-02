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
public class StreamChoice {

    @JsonProperty("index")
    @Builder.Default
    private int index = 0;

    @JsonProperty("delta")
    @Builder.Default
    private ChatMessageDelta delta = new ChatMessageDelta();

    @JsonProperty("finish_reason")
    private String finishReason;
}
