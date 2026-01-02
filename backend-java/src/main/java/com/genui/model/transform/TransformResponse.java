package com.genui.model.transform;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.genui.model.genui.GenerativeUIResponse;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Response body for the /genui/transform endpoint.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransformResponse {

    /**
     * Whether the transformation was successful
     */
    private boolean success;

    /**
     * The transformed UI structure
     */
    private GenerativeUIResponse result;

    /**
     * Error message if transformation failed
     */
    private String error;

    /**
     * Usage statistics for the transformation
     */
    private TransformUsage usage;

    /**
     * Session ID for streaming continuity
     */
    private String sessionId;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TransformUsage {
        /**
         * Tokens used for the transformation
         */
        @JsonProperty("transformTokens")
        private int transformTokens;

        /**
         * Model used for transformation
         */
        private String model;

        /**
         * Estimated cost in USD
         */
        @JsonProperty("estimatedCost")
        private BigDecimal estimatedCost;

        /**
         * Processing time in milliseconds
         */
        @JsonProperty("processingTimeMs")
        private long processingTimeMs;
    }

    /**
     * Create a successful response
     */
    public static TransformResponse success(GenerativeUIResponse result, TransformUsage usage) {
        return TransformResponse.builder()
                .success(true)
                .result(result)
                .usage(usage)
                .build();
    }

    /**
     * Create an error response
     */
    public static TransformResponse error(String message) {
        return TransformResponse.builder()
                .success(false)
                .error(message)
                .build();
    }
}
