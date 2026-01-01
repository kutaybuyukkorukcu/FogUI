package com.genui.model.openai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Configuration for creating an LLM client from user's key
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LLMProviderConfig {

    private LLMProvider provider;

    @Builder.Default
    private String apiKey = "";

    @Builder.Default
    private String model = "";

    // Azure-specific
    private String endpoint;
    private String deploymentName;
}
