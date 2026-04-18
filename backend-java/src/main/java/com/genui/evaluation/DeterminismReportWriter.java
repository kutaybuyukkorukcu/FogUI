package com.genui.evaluation;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DeterminismReportWriter {

    private static final DateTimeFormatter DIRECTORY_FORMAT = DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss")
            .withLocale(Locale.US)
            .withZone(ZoneOffset.UTC);

    private final ObjectMapper objectMapper;

    public Path writeReport(DeterminismEvaluationReport report, String outputDir) {
        Path reportDirectory = Path.of(outputDir, DIRECTORY_FORMAT.format(OffsetDateTime.now(ZoneOffset.UTC)));

        try {
            Files.createDirectories(reportDirectory);
            Files.writeString(
                    reportDirectory.resolve("report.json"),
                    objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(report),
                    StandardCharsets.UTF_8);
            Files.writeString(
                    reportDirectory.resolve("report.md"),
                    toMarkdown(report),
                    StandardCharsets.UTF_8);
            return reportDirectory;
        } catch (IOException ex) {
            throw new UncheckedIOException("Failed to write determinism evaluation report", ex);
        }
    }

    private String toMarkdown(DeterminismEvaluationReport report) {
        StringBuilder markdown = new StringBuilder();
        markdown.append("# Determinism Evaluation Report\n\n");
        markdown.append("- Generated at: ").append(report.getGeneratedAt()).append("\n");
        markdown.append("- Model: `").append(report.getModel()).append("`\n");
        markdown.append("- Provider: `").append(report.getProviderBaseUrl() == null ? "unknown" : report.getProviderBaseUrl()).append("`\n");
        markdown.append("- Repetitions: `").append(report.getRepetitions()).append("`\n\n");

        markdown.append("## Repeatability Benchmark\n\n");
        markdown.append("Measures stability when the exact same prompt is replayed across repetitions.\n\n");
        markdown.append("### Overall Mode Summary\n\n");
        markdown.append("| Mode | Runs | JSON Validity | Canonical Validity | Output Stability | Render Stability | Stream Snapshot Stability | Diagnostic Rate | Fallback Rate |\n");
        markdown.append("| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |\n");
        for (DeterminismSummary summary : report.getModeSummaries()) {
            markdown.append("| ")
                    .append(summary.getMode().name())
                    .append(" | ")
                    .append(summary.getRunCount())
                    .append(" | ")
                    .append(formatRate(summary.getJsonValidityRate()))
                    .append(" | ")
                    .append(formatRate(summary.getCanonicalValidityRate()))
                    .append(" | ")
                    .append(formatRate(summary.getNormalizedOutputStabilityRate()))
                    .append(" | ")
                    .append(formatRate(summary.getRenderStabilityRate()))
                    .append(" | ")
                    .append(formatRate(summary.getStreamFinalSnapshotStabilityRate()))
                    .append(" | ")
                    .append(formatRate(summary.getDiagnosticRate()))
                    .append(" | ")
                    .append(formatRate(summary.getFallbackRate()))
                    .append(" |\n");
        }

        markdown.append("\n### Operational Overhead By Mode\n\n");
        markdown.append("| Mode | P50 Latency | P95 Latency | Avg Prompt Tokens | Avg Output Tokens | Avg Total Tokens | Avg Cost |\n");
        markdown.append("| --- | ---: | ---: | ---: | ---: | ---: | ---: |\n");
        for (DeterminismSummary summary : report.getModeSummaries()) {
            markdown.append("| ")
                    .append(summary.getMode().name())
                    .append(" | ")
                    .append(formatDuration(summary.getP50ProcessingTimeMs()))
                    .append(" | ")
                    .append(formatDuration(summary.getP95ProcessingTimeMs()))
                    .append(" | ")
                    .append(formatNumber(summary.getAveragePromptTokens(), 1))
                    .append(" | ")
                    .append(formatNumber(summary.getAverageOutputTokens(), 1))
                    .append(" | ")
                    .append(formatNumber(summary.getAverageTotalTokens(), 1))
                    .append(" | ")
                    .append(formatCurrency(summary.getAverageEstimatedCostUsd()))
                    .append(" |\n");
        }

        appendOverheadSection(markdown, report.getOverheadSummary());

        markdown.append("\n### Publication Candidates\n\n");
        Set<String> publicationScenarioIds = report.getCatalog().getPromptScenarios().stream()
                .filter(DeterminismPromptScenario::isPublicationCandidate)
                .map(DeterminismPromptScenario::getId)
                .collect(Collectors.toSet());

        List<DeterminismSummary> publicationSummaries = report.getScenarioSummaries().stream()
                .filter(summary -> publicationScenarioIds.contains(summary.getScenarioId()))
                .sorted(Comparator
                        .comparing(DeterminismSummary::getScenarioTitle)
                        .thenComparing(summary -> summary.getMode().name()))
                .toList();

        for (DeterminismSummary summary : publicationSummaries) {
            markdown.append("### ")
                    .append(summary.getScenarioTitle())
                    .append(" — ")
                    .append(summary.getMode().name())
                    .append("\n\n");
            markdown.append("- JSON validity: ").append(formatRate(summary.getJsonValidityRate())).append("\n");
            markdown.append("- Canonical validity: ").append(formatRate(summary.getCanonicalValidityRate())).append("\n");
            markdown.append("- Normalized output stability: ").append(formatRate(summary.getNormalizedOutputStabilityRate())).append("\n");
            markdown.append("- Render stability: ").append(formatRate(summary.getRenderStabilityRate())).append("\n");
            markdown.append("- Stream final snapshot stability: ").append(formatRate(summary.getStreamFinalSnapshotStabilityRate())).append("\n");
            markdown.append("- Diagnostic rate: ").append(formatRate(summary.getDiagnosticRate())).append("\n");
                        markdown.append("- Fallback rate: ").append(formatRate(summary.getFallbackRate())).append("\n");
                        markdown.append("- P50 latency: ").append(formatDuration(summary.getP50ProcessingTimeMs())).append("\n");
                        markdown.append("- P95 latency: ").append(formatDuration(summary.getP95ProcessingTimeMs())).append("\n");
                        markdown.append("- Average total tokens: ").append(formatNumber(summary.getAverageTotalTokens(), 1)).append("\n");
                        markdown.append("- Average estimated cost: ").append(formatCurrency(summary.getAverageEstimatedCostUsd())).append("\n\n");
        }

        markdown.append("## Compatibility Fixtures\n\n");
        List<DeterminismSummary> compatibilitySummaries = report.getScenarioSummaries().stream()
                .filter(summary -> "compatibility".equals(summary.getScenarioFamily()))
                .sorted(Comparator.comparing(DeterminismSummary::getScenarioTitle))
                .toList();

        for (DeterminismSummary summary : compatibilitySummaries) {
            markdown.append("- ")
                    .append(summary.getScenarioTitle())
                    .append(": canonical validity=")
                    .append(formatRate(summary.getCanonicalValidityRate()))
                    .append(", render stability=")
                    .append(formatRate(summary.getRenderStabilityRate()))
                    .append(", stream snapshot stability=")
                    .append(formatRate(summary.getStreamFinalSnapshotStabilityRate()))
                    .append(", diagnostics=")
                    .append(formatRate(summary.getDiagnosticRate()))
                    .append(", fallback rate=")
                    .append(formatRate(summary.getFallbackRate()))
                    .append("\n");
        }

        markdown.append("\n## Notes\n\n");
        markdown.append("- Repeatability benchmark replays the exact same prompt text across repetitions.\n");
        markdown.append("- Render stability is computed from an adapter-agnostic canonical render plan derived from the content tree, ignoring thinking and transport metadata.\n");
        markdown.append("- Stream final snapshot stability is computed from the runtime-normalized canonical snapshot the backend stream route would emit after contract-version normalization.\n");
        markdown.append("- `DIRECT_A2UI_BASELINE` remains `n/a` for render and stream metrics because it does not produce canonical render input until compatibility translation is applied.\n");
        markdown.append("- `FOGUI_A2UI_COMPATIBILITY` uses the exact raw JSON emitted by `DIRECT_A2UI_BASELINE` for the same scenario and repetition.\n");
                markdown.append("- Token estimates use a `chars / 4` heuristic and cost uses a flat `$0.60 / 1M tokens` estimate for relative comparison only.\n");

        return markdown.toString();
    }

        private void appendOverheadSection(StringBuilder markdown, DeterminismOverheadSummary overheadSummary) {
                if (overheadSummary == null) {
                        return;
                }

                markdown.append("\n### Overhead Deltas\n\n");
                markdown.append("`FOGUI_TRANSFORM` vs `DIRECT_CANONICAL_BASELINE`:\n\n");
                markdown.append("- P50 latency delta: ")
                                .append(formatSignedDuration(overheadSummary.getTransformP50LatencyDeltaMs()))
                                .append("\n");
                markdown.append("- P95 latency delta: ")
                                .append(formatSignedDuration(overheadSummary.getTransformP95LatencyDeltaMs()))
                                .append("\n");
                markdown.append("- Average prompt token delta: ")
                                .append(formatSignedNumber(overheadSummary.getTransformAveragePromptTokenDelta(), 1))
                                .append("\n");
                markdown.append("- Average output token delta: ")
                                .append(formatSignedNumber(overheadSummary.getTransformAverageOutputTokenDelta(), 1))
                                .append("\n");
                markdown.append("- Average total token delta: ")
                                .append(formatSignedNumber(overheadSummary.getTransformAverageTotalTokenDelta(), 1))
                                .append("\n");
                markdown.append("- Average cost delta: ")
                                .append(formatSignedCurrency(overheadSummary.getTransformAverageEstimatedCostDeltaUsd()))
                                .append("\n\n");

                markdown.append("Fixed compatibility fixture translation overhead:\n\n");
                markdown.append("- Fixture runs: `")
                                .append(overheadSummary.getCompatibilityFixtureRunCount())
                                .append("`\n");
                markdown.append("- P50 translation latency: ")
                                .append(formatDuration(overheadSummary.getCompatibilityFixtureP50LatencyMs()))
                                .append("\n");
                markdown.append("- P95 translation latency: ")
                                .append(formatDuration(overheadSummary.getCompatibilityFixtureP95LatencyMs()))
                                .append("\n");
        }

    private String formatRate(Double value) {
        if (value == null) {
            return "n/a";
        }
        return String.format(Locale.US, "%.1f%%", value * 100.0);
    }

        private String formatDuration(Long value) {
                if (value == null) {
                        return "n/a";
                }
                return value + " ms";
        }

        private String formatSignedDuration(Long value) {
                if (value == null) {
                        return "n/a";
                }
                return (value >= 0 ? "+" : "") + value + " ms";
        }

        private String formatNumber(Double value, int scale) {
                if (value == null) {
                        return "n/a";
                }
                return BigDecimal.valueOf(value)
                                .setScale(scale, RoundingMode.HALF_UP)
                                .toPlainString();
        }

        private String formatSignedNumber(Double value, int scale) {
                if (value == null) {
                        return "n/a";
                }
                BigDecimal scaled = BigDecimal.valueOf(Math.abs(value))
                                .setScale(scale, RoundingMode.HALF_UP);
                return (value >= 0 ? "+" : "-") + scaled.toPlainString();
        }

        private String formatCurrency(Double value) {
                if (value == null) {
                        return "n/a";
                }
                return "$" + String.format(Locale.US, "%.6f", value);
        }

        private String formatSignedCurrency(Double value) {
                if (value == null) {
                        return "n/a";
                }
                return (value >= 0 ? "+$" : "-$") + String.format(Locale.US, "%.6f", Math.abs(value));
        }
}