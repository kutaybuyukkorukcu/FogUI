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
public class OpenAIError {

    @JsonProperty("message")
    @Builder.Default
    private String message = "";

    @JsonProperty("type")
    @Builder.Default
    private String type = "invalid_request_error";

    @JsonProperty("param")
    private String param;

    @JsonProperty("code")
    private String code;
}
