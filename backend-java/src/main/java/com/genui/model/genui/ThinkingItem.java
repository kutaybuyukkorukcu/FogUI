package com.genui.model.genui;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Represents a thinking/reasoning step shown to the user
 * Aligns with frontend ThinkingItem
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ThinkingItem {

    @JsonProperty("message")
    @Builder.Default
    private String message = "";

    @JsonProperty("status")
    @Builder.Default
    private String status = "active"; // "active" or "complete"

    @JsonProperty("timestamp")
    @Builder.Default
    private String timestamp = Instant.now().toString();
}
