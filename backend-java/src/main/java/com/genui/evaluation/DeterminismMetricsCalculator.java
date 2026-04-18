package com.genui.evaluation;

import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.function.Predicate;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class DeterminismMetricsCalculator {

    public static final String SCENARIO_FAMILY_PROMPT = "prompt";
        public static final String SCENARIO_FAMILY_COMPATIBILITY = "compatibility";

    public List<DeterminismSummary> buildModeSummaries(List<DeterminismRunArtifact> artifacts) {
        return artifacts.stream()
                .filter(DeterminismRunArtifact::isPromptDriven)
                .collect(Collectors.groupingBy(DeterminismRunArtifact::getMode))
                .entrySet()
                .stream()
                .map(entry -> summarize(
                        null,
                        null,
                        SCENARIO_FAMILY_PROMPT,
                        entry.getKey(),
                        entry.getValue()))
                .sorted(Comparator.comparing(summary -> summary.getMode().name()))
                .toList();
    }

    public List<DeterminismSummary> buildScenarioSummaries(List<DeterminismRunArtifact> artifacts) {
        return artifacts.stream()
                .collect(Collectors.groupingBy(artifact -> artifact.getScenarioId() + "::" + artifact.getMode().name()))
                .values()
                .stream()
                .map(group -> summarize(
                        group.getFirst().getScenarioId(),
                        group.getFirst().getScenarioTitle(),
                        group.getFirst().getScenarioFamily(),
                        group.getFirst().getMode(),
                        group))
                .sorted(Comparator
                        .comparing(DeterminismSummary::getScenarioFamily)
                        .thenComparing(DeterminismSummary::getScenarioTitle)
                        .thenComparing(summary -> summary.getMode().name()))
                .toList();
    }

    public DeterminismOverheadSummary buildOverheadSummary(List<DeterminismRunArtifact> artifacts) {
        DeterminismSummary directCanonical = summarizeMatching(
                artifacts,
                artifact -> artifact.isPromptDriven()
                        && artifact.getMode() == DeterminismEvaluationMode.DIRECT_CANONICAL_BASELINE);
        DeterminismSummary fogUiTransform = summarizeMatching(
                artifacts,
                artifact -> artifact.isPromptDriven()
                        && artifact.getMode() == DeterminismEvaluationMode.FOGUI_TRANSFORM);

        List<DeterminismRunArtifact> compatibilityFixtures = artifacts.stream()
                .filter(artifact -> !artifact.isPromptDriven())
                .filter(artifact -> SCENARIO_FAMILY_COMPATIBILITY.equals(artifact.getScenarioFamily()))
                .filter(artifact -> artifact.getMode() == DeterminismEvaluationMode.FOGUI_A2UI_COMPATIBILITY)
                .toList();
        List<Long> compatibilityFixtureLatencies = nonNullValues(
                compatibilityFixtures,
                DeterminismRunArtifact::getProcessingTimeMs);

        return DeterminismOverheadSummary.builder()
                .transformP50LatencyDeltaMs(delta(
                        fogUiTransform == null ? null : fogUiTransform.getP50ProcessingTimeMs(),
                        directCanonical == null ? null : directCanonical.getP50ProcessingTimeMs()))
                .transformP95LatencyDeltaMs(delta(
                        fogUiTransform == null ? null : fogUiTransform.getP95ProcessingTimeMs(),
                        directCanonical == null ? null : directCanonical.getP95ProcessingTimeMs()))
                .transformAveragePromptTokenDelta(delta(
                        fogUiTransform == null ? null : fogUiTransform.getAveragePromptTokens(),
                        directCanonical == null ? null : directCanonical.getAveragePromptTokens()))
                .transformAverageOutputTokenDelta(delta(
                        fogUiTransform == null ? null : fogUiTransform.getAverageOutputTokens(),
                        directCanonical == null ? null : directCanonical.getAverageOutputTokens()))
                .transformAverageTotalTokenDelta(delta(
                        fogUiTransform == null ? null : fogUiTransform.getAverageTotalTokens(),
                        directCanonical == null ? null : directCanonical.getAverageTotalTokens()))
                .transformAverageEstimatedCostDeltaUsd(delta(
                        fogUiTransform == null ? null : fogUiTransform.getAverageEstimatedCostUsd(),
                        directCanonical == null ? null : directCanonical.getAverageEstimatedCostUsd()))
                .compatibilityFixtureRunCount(compatibilityFixtures.size())
                .compatibilityFixtureP50LatencyMs(percentile(compatibilityFixtureLatencies, 0.50d))
                .compatibilityFixtureP95LatencyMs(percentile(compatibilityFixtureLatencies, 0.95d))
                .build();
    }

    private DeterminismSummary summarize(
            String scenarioId,
            String scenarioTitle,
            String scenarioFamily,
            DeterminismEvaluationMode mode,
            List<DeterminismRunArtifact> artifacts
    ) {
        List<String> normalizedHashes = nonBlankStringValues(artifacts, DeterminismRunArtifact::getNormalizedOutputHash);
        List<String> renderHashes = nonBlankStringValues(artifacts, DeterminismRunArtifact::getRenderHash);
        List<String> streamHashes = nonBlankStringValues(artifacts, DeterminismRunArtifact::getStreamFinalSnapshotHash);
        List<Long> processingTimes = nonNullValues(artifacts, DeterminismRunArtifact::getProcessingTimeMs);
        List<Integer> promptTokens = nonNullValues(artifacts, DeterminismRunArtifact::getEstimatedPromptTokens);
        List<Integer> outputTokens = nonNullValues(artifacts, DeterminismRunArtifact::getEstimatedOutputTokens);
        List<Integer> totalTokens = nonNullValues(artifacts, DeterminismRunArtifact::getEstimatedTotalTokens);
        List<Double> estimatedCosts = nonNullValues(artifacts, DeterminismRunArtifact::getEstimatedCostUsd);

        List<DeterminismRunArtifact> canonicalEligible = artifacts.stream()
                .filter(artifact -> artifact.getCanonicalValid() != null)
                .toList();
        List<DeterminismRunArtifact> diagnosticEligible = artifacts.stream()
                .filter(artifact -> artifact.getTranslationErrorCount() != null || artifact.getValidationErrorCount() != null)
                .toList();
        List<DeterminismRunArtifact> fallbackEligible = artifacts.stream()
                .filter(artifact -> artifact.getFallbackComponentCount() != null)
                .toList();

        return DeterminismSummary.builder()
                .scenarioId(scenarioId)
                .scenarioTitle(scenarioTitle)
                .scenarioFamily(scenarioFamily)
                .mode(mode)
                .runCount(artifacts.size())
                .jsonValidityRate(rate((int) artifacts.stream().filter(DeterminismRunArtifact::isValidJson).count(), artifacts.size()))
                .canonicalValidityRate(rateOrNull(
                        (int) canonicalEligible.stream().filter(artifact -> Boolean.TRUE.equals(artifact.getCanonicalValid())).count(),
                        canonicalEligible.size()))
                .normalizedOutputStabilityRate(modalRate(normalizedHashes))
                .renderStabilityRate(modalRate(renderHashes))
                .streamFinalSnapshotStabilityRate(modalRate(streamHashes))
                .diagnosticRate(rateOrNull(
                        (int) diagnosticEligible.stream().filter(this::hasDiagnostics).count(),
                        diagnosticEligible.size()))
                .fallbackRate(rateOrNull(
                        (int) fallbackEligible.stream().filter(this::hasFallbacks).count(),
                        fallbackEligible.size()))
                .distinctNormalizedOutputs(distinctCount(normalizedHashes))
                .distinctRenderHashes(distinctCount(renderHashes))
                .distinctStreamSnapshots(distinctCount(streamHashes))
                .p50ProcessingTimeMs(percentile(processingTimes, 0.50d))
                .p95ProcessingTimeMs(percentile(processingTimes, 0.95d))
                .averagePromptTokens(average(promptTokens))
                .averageOutputTokens(average(outputTokens))
                .averageTotalTokens(average(totalTokens))
                .averageEstimatedCostUsd(average(estimatedCosts))
                .build();
    }

    private DeterminismSummary summarizeMatching(
            List<DeterminismRunArtifact> artifacts,
            Predicate<DeterminismRunArtifact> predicate
    ) {
        List<DeterminismRunArtifact> filtered = artifacts.stream()
                .filter(predicate)
                .toList();
        if (filtered.isEmpty()) {
            return null;
        }

        DeterminismRunArtifact first = filtered.getFirst();
        return summarize(null, null, first.getScenarioFamily(), first.getMode(), filtered);
    }

    private boolean hasDiagnostics(DeterminismRunArtifact artifact) {
        return valueOrZero(artifact.getTranslationErrorCount()) > 0
                || valueOrZero(artifact.getValidationErrorCount()) > 0;
    }

    private boolean hasFallbacks(DeterminismRunArtifact artifact) {
        return valueOrZero(artifact.getFallbackComponentCount()) > 0;
    }

    private int valueOrZero(Integer value) {
        return value == null ? 0 : value;
    }

    private int distinctCount(List<String> hashes) {
        return (int) hashes.stream().distinct().count();
    }

        private List<String> nonBlankStringValues(
                        List<DeterminismRunArtifact> artifacts,
                        Function<DeterminismRunArtifact, String> extractor
        ) {
        return artifacts.stream()
                .map(extractor)
                .filter(Objects::nonNull)
                .filter(value -> !value.isBlank())
                .toList();
    }

        private <T> List<T> nonNullValues(List<DeterminismRunArtifact> artifacts, Function<DeterminismRunArtifact, T> extractor) {
                return artifacts.stream()
                                .map(extractor)
                                .filter(Objects::nonNull)
                                .toList();
        }

    private Double modalRate(List<String> hashes) {
        if (hashes.isEmpty()) {
            return null;
        }

        long modalCount = hashes.stream()
                .collect(Collectors.groupingBy(Function.identity(), Collectors.counting()))
                .values()
                .stream()
                .max(Long::compareTo)
                .orElse(0L);

        return rate((int) modalCount, hashes.size());
    }

    private Double rateOrNull(int numerator, int denominator) {
        if (denominator == 0) {
            return null;
        }
        return rate(numerator, denominator);
    }

    private double rate(int numerator, int denominator) {
        if (denominator == 0) {
            return 0.0;
        }
        return (double) numerator / denominator;
    }

        private Long percentile(List<Long> values, double percentile) {
                if (values.isEmpty()) {
                        return null;
                }

                List<Long> sorted = values.stream()
                                .sorted()
                                .toList();
                if (sorted.size() == 1) {
                        return sorted.getFirst();
                }

                double position = percentile * (sorted.size() - 1);
                int lowerIndex = (int) Math.floor(position);
                int upperIndex = (int) Math.ceil(position);
                long lower = sorted.get(lowerIndex);
                long upper = sorted.get(upperIndex);
                double fraction = position - lowerIndex;
                return Math.round(lower + ((upper - lower) * fraction));
        }

        private Double average(List<? extends Number> values) {
                if (values.isEmpty()) {
                        return null;
                }
                return values.stream()
                                .mapToDouble(Number::doubleValue)
                                .average()
                                .orElse(0.0d);
        }

        private Long delta(Long left, Long right) {
                if (left == null || right == null) {
                        return null;
                }
                return left - right;
        }

        private Double delta(Double left, Double right) {
                if (left == null || right == null) {
                        return null;
                }
                return left - right;
        }
}