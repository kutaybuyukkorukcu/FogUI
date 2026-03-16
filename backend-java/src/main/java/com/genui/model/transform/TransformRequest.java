package com.genui.model.transform;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * Request body for the /genui/transform endpoint.
 * Accepts raw LLM output and optional context hints.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransformRequest {

    /**
     * The raw LLM response text to transform into structured UI.
     * Required field.
     */
    private String content;

    /**
     * Optional context to help guide the transformation.
     */
    private TransformContext context;

    /**
     * Whether this is a partial/streaming chunk.
     * When true, the transformer will attempt to handle incomplete content.
     */
    @JsonProperty("streaming")
    @Builder.Default
    private boolean streaming = false;

    /**
     * When true, stream emits patch events as primary incremental updates.
     */
    @JsonProperty("preferPatches")
    @Builder.Default
    private boolean preferPatches = true;

    /**
     * When true, stream still emits raw chunk events for backward compatibility.
     */
    @JsonProperty("includeChunks")
    @Builder.Default
    private boolean includeChunks = true;

    /**
     * Optional session ID for maintaining state across streaming chunks.
     */
    private String sessionId;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TransformContext {
        /**
         * Hint about the user's intent (e.g., "weather_query", "data_analysis")
         */
        private String intent;

        /**
         * Preferred component types to use
         */
        private List<String> preferredComponents;

        /**
         * Expected data schema for structured data extraction
         */
        private Map<String, Object> dataSchema;

        /**
         * Custom instructions for the transformation
         */
        private String instructions;
    }
}
