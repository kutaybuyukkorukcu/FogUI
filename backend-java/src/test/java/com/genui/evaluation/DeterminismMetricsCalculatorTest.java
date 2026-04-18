package com.genui.evaluation;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

@DisplayName("DeterminismMetricsCalculator")
class DeterminismMetricsCalculatorTest {

    private final DeterminismMetricsCalculator calculator = new DeterminismMetricsCalculator();

    @Test
    void shouldBuildScenarioSummaryRatesFromArtifacts() {
        List<DeterminismRunArtifact> artifacts = List.of(
            artifact(1, true, true, "hash-a", "render-a", "stream-a", 0, 0, 100L, 10, 20, 30, 0.0010),
            artifact(2, true, true, "hash-a", "render-a", "stream-a", 0, 0, 140L, 10, 24, 34, 0.0012),
            artifact(3, true, false, "hash-b", "render-b", "stream-b", 1, 1, 300L, 10, 28, 38, 0.0014),
            artifact(4, false, null, null, null, null, null, null, 400L, null, null, null, null)
        );

        DeterminismSummary summary = calculator.buildScenarioSummaries(artifacts).getFirst();

        assertEquals(4, summary.getRunCount());
        assertEquals(0.75, summary.getJsonValidityRate());
        assertEquals(2.0 / 3.0, summary.getCanonicalValidityRate());
        assertEquals(2.0 / 3.0, summary.getNormalizedOutputStabilityRate());
        assertEquals(2.0 / 3.0, summary.getRenderStabilityRate());
        assertEquals(2.0 / 3.0, summary.getStreamFinalSnapshotStabilityRate());
        assertEquals(0.25, summary.getDiagnosticRate());
        assertEquals(1.0 / 3.0, summary.getFallbackRate());
        assertEquals(2, summary.getDistinctNormalizedOutputs());
        assertEquals(2, summary.getDistinctRenderHashes());
        assertEquals(2, summary.getDistinctStreamSnapshots());
        assertEquals(220L, summary.getP50ProcessingTimeMs());
        assertEquals(385L, summary.getP95ProcessingTimeMs());
        assertEquals(10.0, summary.getAveragePromptTokens(), 0.000001);
        assertEquals(24.0, summary.getAverageOutputTokens(), 0.000001);
        assertEquals(34.0, summary.getAverageTotalTokens(), 0.000001);
        assertEquals(0.0012, summary.getAverageEstimatedCostUsd(), 0.000001);
    }

    @Test
    void modeSummariesShouldIgnoreNonPromptArtifacts() {
        List<DeterminismRunArtifact> artifacts = List.of(
            artifact(1, true, true, "hash-a", null, null, 0, 0, 120L, 12, 18, 30, 0.0010),
                compatibilityArtifact(false)
        );

        DeterminismSummary summary = calculator.buildModeSummaries(artifacts).getFirst();

        assertEquals(1, summary.getRunCount());
        assertNull(summary.getRenderStabilityRate());
        assertNull(summary.getStreamFinalSnapshotStabilityRate());
        assertEquals(120L, summary.getP50ProcessingTimeMs());
        assertEquals(120L, summary.getP95ProcessingTimeMs());
    }

    @Test
    void shouldBuildOverheadSummary() {
        List<DeterminismRunArtifact> artifacts = List.of(
                benchmarkArtifact(DeterminismEvaluationMode.DIRECT_CANONICAL_BASELINE, true, "prompt", 100L, 40, 24, 64, 0.0008),
                benchmarkArtifact(DeterminismEvaluationMode.DIRECT_CANONICAL_BASELINE, true, "prompt", 120L, 40, 28, 68, 0.0009),
                benchmarkArtifact(DeterminismEvaluationMode.FOGUI_TRANSFORM, true, "prompt", 150L, 40, 30, 70, 0.0010),
                benchmarkArtifact(DeterminismEvaluationMode.FOGUI_TRANSFORM, true, "prompt", 190L, 40, 34, 74, 0.0011),
                benchmarkArtifact(DeterminismEvaluationMode.FOGUI_A2UI_COMPATIBILITY, false, "compatibility", 5L, 0, 0, 0, 0.0),
                benchmarkArtifact(DeterminismEvaluationMode.FOGUI_A2UI_COMPATIBILITY, false, "compatibility", 9L, 0, 0, 0, 0.0),
                benchmarkArtifact(DeterminismEvaluationMode.FOGUI_A2UI_COMPATIBILITY, false, "compatibility", 13L, 0, 0, 0, 0.0)
        );

        DeterminismOverheadSummary overheadSummary = calculator.buildOverheadSummary(artifacts);

        assertEquals(60L, overheadSummary.getTransformP50LatencyDeltaMs());
        assertEquals(69L, overheadSummary.getTransformP95LatencyDeltaMs());
        assertEquals(0.0, overheadSummary.getTransformAveragePromptTokenDelta(), 0.000001);
        assertEquals(6.0, overheadSummary.getTransformAverageOutputTokenDelta(), 0.000001);
        assertEquals(6.0, overheadSummary.getTransformAverageTotalTokenDelta(), 0.000001);
        assertEquals(0.0002, overheadSummary.getTransformAverageEstimatedCostDeltaUsd(), 0.000001);
        assertEquals(3, overheadSummary.getCompatibilityFixtureRunCount());
        assertEquals(9L, overheadSummary.getCompatibilityFixtureP50LatencyMs());
        assertEquals(13L, overheadSummary.getCompatibilityFixtureP95LatencyMs());
    }

    private DeterminismRunArtifact artifact(
            int repetition,
            boolean validJson,
            Boolean canonicalValid,
            String outputHash,
            String renderHash,
            String streamHash,
            Integer validationErrors,
            Integer fallbackCount,
            Long processingTimeMs,
            Integer estimatedPromptTokens,
            Integer estimatedOutputTokens,
            Integer estimatedTotalTokens,
            Double estimatedCostUsd
    ) {
        return DeterminismRunArtifact.builder()
                .scenarioId("scenario-1")
                .scenarioTitle("Scenario 1")
                .scenarioFamily("prompt")
                .promptDriven(true)
                .mode(DeterminismEvaluationMode.FOGUI_TRANSFORM)
                .repetition(repetition)
                .validJson(validJson)
                .canonicalParseSucceeded(canonicalValid != null)
                .canonicalValid(canonicalValid)
                .normalizedOutputHash(outputHash)
                .renderHash(renderHash)
                .streamFinalSnapshotHash(streamHash)
                .translationErrorCount(0)
                .validationErrorCount(validationErrors)
                .fallbackComponentCount(fallbackCount)
                .processingTimeMs(processingTimeMs)
                .estimatedPromptTokens(estimatedPromptTokens)
                .estimatedOutputTokens(estimatedOutputTokens)
                .estimatedTotalTokens(estimatedTotalTokens)
                .estimatedCostUsd(estimatedCostUsd)
                .build();
    }

    private DeterminismRunArtifact compatibilityArtifact(boolean validJson) {
        return DeterminismRunArtifact.builder()
                .scenarioId("compat-1")
                .scenarioTitle("Compatibility")
                .scenarioFamily("compatibility")
                .promptDriven(false)
                .mode(DeterminismEvaluationMode.FOGUI_A2UI_COMPATIBILITY)
                .repetition(1)
                .validJson(validJson)
                .canonicalParseSucceeded(true)
                .canonicalValid(true)
                .normalizedOutputHash("compat-hash")
                .translationErrorCount(0)
                .validationErrorCount(0)
                .fallbackComponentCount(0)
                .processingTimeMs(4L)
                .estimatedPromptTokens(0)
                .estimatedOutputTokens(0)
                .estimatedTotalTokens(0)
                .estimatedCostUsd(0.0d)
                .build();
    }

            private DeterminismRunArtifact benchmarkArtifact(
                DeterminismEvaluationMode mode,
                boolean promptDriven,
                String scenarioFamily,
                Long processingTimeMs,
                Integer estimatedPromptTokens,
                Integer estimatedOutputTokens,
                Integer estimatedTotalTokens,
                Double estimatedCostUsd
            ) {
            return DeterminismRunArtifact.builder()
                .scenarioId(promptDriven ? "scenario-1" : "compat-1")
                .scenarioTitle(promptDriven ? "Scenario 1" : "Compatibility")
                .scenarioFamily(scenarioFamily)
                .promptDriven(promptDriven)
                .mode(mode)
                .repetition(1)
                .validJson(true)
                .canonicalParseSucceeded(true)
                .canonicalValid(true)
                .normalizedOutputHash("hash")
                .renderHash(promptDriven ? "render" : null)
                .streamFinalSnapshotHash(promptDriven ? "stream" : null)
                .translationErrorCount(0)
                .validationErrorCount(0)
                .fallbackComponentCount(0)
                .processingTimeMs(processingTimeMs)
                .estimatedPromptTokens(estimatedPromptTokens)
                .estimatedOutputTokens(estimatedOutputTokens)
                .estimatedTotalTokens(estimatedTotalTokens)
                .estimatedCostUsd(estimatedCostUsd)
                .build();
            }
}