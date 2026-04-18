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
public class DeterminismEvaluationReport {

    private String generatedAt;
    private int repetitions;
    private String model;
    private String providerBaseUrl;
    private DeterminismEvaluationCatalog catalog;
    private DeterminismOverheadSummary overheadSummary;
    @Builder.Default
    private List<DeterminismSummary> modeSummaries = new ArrayList<>();
    @Builder.Default
    private List<DeterminismSummary> scenarioSummaries = new ArrayList<>();
    @Builder.Default
    private List<DeterminismRunArtifact> artifacts = new ArrayList<>();
}