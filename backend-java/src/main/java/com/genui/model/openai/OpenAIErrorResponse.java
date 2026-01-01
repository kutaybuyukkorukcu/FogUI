package com.genui.model.openai;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Error response in OpenAI format
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OpenAIErrorResponse {

    @JsonProperty("error")
    @Builder.Default
    private OpenAIError error = new OpenAIError();
}
