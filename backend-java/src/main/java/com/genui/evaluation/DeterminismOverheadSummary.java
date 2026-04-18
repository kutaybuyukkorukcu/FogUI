package com.genui.evaluation;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeterminismOverheadSummary {

    private Long transformP50LatencyDeltaMs;
    private Long transformP95LatencyDeltaMs;
    private Double transformAveragePromptTokenDelta;
    private Double transformAverageOutputTokenDelta;
    private Double transformAverageTotalTokenDelta;
    private Double transformAverageEstimatedCostDeltaUsd;
    private int compatibilityFixtureRunCount;
    private Long compatibilityFixtureP50LatencyMs;
    private Long compatibilityFixtureP95LatencyMs;
}