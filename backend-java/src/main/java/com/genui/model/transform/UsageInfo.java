package com.genui.model.transform;

import lombok.Builder;
import lombok.Data;

/**
 * Represents comprehensive usage details.
 */
@Data
@Builder
public class UsageInfo {
    private int promptTokens;
    private int completionTokens;
    private int totalTokens;
    private CostInfo estimatedCost;
}
