package com.genui.evaluation;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeterminismSummary {

    private String scenarioId;
    private String scenarioTitle;
    private String scenarioFamily;
    private DeterminismEvaluationMode mode;
    private int runCount;
    private double jsonValidityRate;
    private Double canonicalValidityRate;
    private Double normalizedOutputStabilityRate;
    private Double renderStabilityRate;
    private Double streamFinalSnapshotStabilityRate;
    private Double diagnosticRate;
    private Double fallbackRate;
    private int distinctNormalizedOutputs;
    private int distinctRenderHashes;
    private int distinctStreamSnapshots;
    private Long p50ProcessingTimeMs;
    private Long p95ProcessingTimeMs;
    private Double averagePromptTokens;
    private Double averageOutputTokens;
    private Double averageTotalTokens;
    private Double averageEstimatedCostUsd;
}