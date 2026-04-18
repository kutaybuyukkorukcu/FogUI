package com.genui.evaluation;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeterminismRunArtifact {

    private String scenarioId;
    private String scenarioTitle;
    private String scenarioFamily;
    private boolean promptDriven;
    private DeterminismEvaluationMode mode;
    private int repetition;
    private String rawOutput;
    private String normalizedOutput;
    private String normalizedOutputHash;
    private boolean validJson;
    private Boolean canonicalParseSucceeded;
    private Boolean canonicalValid;
    private Integer translationErrorCount;
    private Integer validationErrorCount;
    private Integer fallbackComponentCount;
    private String renderHash;
    private String streamFinalSnapshotHash;
    private Long processingTimeMs;
    private Integer estimatedPromptTokens;
    private Integer estimatedOutputTokens;
    private Integer estimatedTotalTokens;
    private Double estimatedCostUsd;
    @Builder.Default
    private List<String> notes = new ArrayList<>();
}