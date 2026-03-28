package com.genui.model.transform;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.genui.model.genui.GenerativeUIResponse;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Response body for the /fogui/transform endpoint.
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
     * Stable machine-readable error code.
     */
    private String errorCode;

    /**
     * Optional structured error diagnostics.
     */
    private Object errorDetails;

    /**
     * Usage statistics for the transformation
     */
    private TransformUsage usage;

    /**
     * Session ID for streaming continuity
     */
    private String sessionId;

    /**
     * Request correlation ID.
     */
    private String requestId;

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
    public static TransformResponse success(
            GenerativeUIResponse result,
            TransformUsage usage,
            String requestId
    ) {
        return TransformResponse.builder()
                .success(true)
                .result(result)
                .usage(usage)
                .requestId(requestId)
                .build();
    }

    /**
     * Create an error response
     */
    public static TransformResponse error(String message, String errorCode, Object errorDetails, String requestId) {
        return TransformResponse.builder()
                .success(false)
                .error(message)
                .errorCode(errorCode)
                .errorDetails(errorDetails)
                .requestId(requestId)
                .build();
    }
}
