package com.genui.evaluation;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.genui.contract.CanonicalValidationContext;
import com.genui.contract.CanonicalValidationError;
import com.genui.contract.FogUiCanonicalContract;
import com.genui.contract.FogUiCanonicalValidator;
import com.genui.contract.a2ui.A2UiInboundTranslator;
import com.genui.contract.a2ui.A2UiTranslationResult;
import com.genui.model.genui.ContentBlock;
import com.genui.model.genui.GenerativeUIResponse;
import com.genui.service.ChatClientFactory;
import com.genui.service.TransformPrompts;
import com.genui.starter.advisor.FogUiAdvisorContextKeys;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.file.Path;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class DeterminismEvaluationService {

    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {
    };
    private static final String PROMPT_FAMILY = "prompt";
    private static final String COMPATIBILITY_FAMILY = "compatibility";
    private static final int TOKEN_ESTIMATE_DIVISOR = 4;
    private static final BigDecimal COST_PER_MILLION_TOKENS_USD = new BigDecimal("0.60");

    private final ChatClientFactory chatClientFactory;
    private final ObjectMapper objectMapper;
    private final A2UiInboundTranslator a2UiInboundTranslator;
    private final FogUiCanonicalValidator fogUiCanonicalValidator;
    private final DeterminismEvaluationCatalogLoader catalogLoader;
    private final DeterminismJsonNormalizer jsonNormalizer;
    private final DeterminismMetricsCalculator metricsCalculator;
    private final DeterminismReportWriter reportWriter;
    private final DeterminismRuntimeStabilityAnalyzer runtimeStabilityAnalyzer;
    private final DeterminismEvaluationProperties properties;

    public Path runEvaluation() {
        DeterminismEvaluationCatalog catalog = catalogLoader.load(properties.getCatalogLocation());
        int repetitions = properties.getRepetitions() > 0
                ? properties.getRepetitions()
                : catalog.getDefaultRepetitions();

        List<DeterminismRunArtifact> artifacts = new ArrayList<>();
        runRepeatabilityBenchmarks(catalog, repetitions, artifacts);
        runCompatibilityFixtures(catalog, artifacts);

        DeterminismEvaluationReport report = DeterminismEvaluationReport.builder()
                .generatedAt(OffsetDateTime.now(ZoneOffset.UTC).toString())
                .repetitions(repetitions)
                .model(chatClientFactory.getActiveModelName())
                .providerBaseUrl(chatClientFactory.getActiveProviderBaseUrl())
                .catalog(catalog)
                .artifacts(artifacts)
                .modeSummaries(metricsCalculator.buildModeSummaries(artifacts))
                .scenarioSummaries(metricsCalculator.buildScenarioSummaries(artifacts))
            .overheadSummary(metricsCalculator.buildOverheadSummary(artifacts))
                .build();

        return reportWriter.writeReport(report, properties.getOutputDir());
    }

    private void runRepeatabilityBenchmarks(
            DeterminismEvaluationCatalog catalog,
            int repetitions,
            List<DeterminismRunArtifact> artifacts
    ) {
        for (DeterminismPromptScenario scenario : catalog.getPromptScenarios()) {
            log.info("Running determinism prompt scenario {} ({})", scenario.getId(), scenario.getTitle());
            for (int repetition = 1; repetition <= repetitions; repetition++) {
                artifacts.add(runDirectCanonicalBaseline(scenario, repetition));
                DeterminismRunArtifact directA2Ui = runDirectA2UiBaseline(scenario, repetition);
                artifacts.add(directA2Ui);
                artifacts.add(runFogUiTransform(scenario, repetition));
                artifacts.add(runCompatibilityFromBaseline(scenario, repetition, directA2Ui.getRawOutput()));
            }
        }
    }

    private void runCompatibilityFixtures(
            DeterminismEvaluationCatalog catalog,
            List<DeterminismRunArtifact> artifacts
    ) {
        if (!properties.isIncludeCompatibilityFixtures()) {
            return;
        }

        for (DeterminismA2UiScenario scenario : catalog.getCompatibilityScenarios()) {
            log.info("Running fixed compatibility scenario {} ({})", scenario.getId(), scenario.getTitle());
            artifacts.add(runFixedCompatibilityScenario(scenario));
        }
    }

    private DeterminismRunArtifact runDirectCanonicalBaseline(DeterminismPromptScenario scenario, int repetition) {
        ScenarioExecutionContext context = promptScenarioContext(
                scenario,
                DeterminismEvaluationMode.DIRECT_CANONICAL_BASELINE,
                repetition);
        PreparedPrompt preparedPrompt = buildTransformPrompt(scenario, scenario.getPrompt());
        long startedAt = System.nanoTime();

        try {
            PromptExecutionResult execution = executePrompt(
                preparedPrompt,
                    false,
                    requestId(context, "canonical"),
                    null);
            return analyzeCanonicalOutput(context, execution, List.of());
        } catch (Exception ex) {
            return failedArtifact(
                context,
                "Model call failed: " + ex.getMessage(),
                elapsedMillis(startedAt),
                preparedPrompt.estimatedPromptTokens());
        }
    }

    private DeterminismRunArtifact runDirectA2UiBaseline(DeterminismPromptScenario scenario, int repetition) {
        ScenarioExecutionContext context = promptScenarioContext(
                scenario,
                DeterminismEvaluationMode.DIRECT_A2UI_BASELINE,
                repetition);
        PreparedPrompt preparedPrompt = buildDirectA2UiPrompt(scenario, scenario.getPrompt());
        long startedAt = System.nanoTime();

        try {
            PromptExecutionResult execution = executePrompt(
                preparedPrompt,
                    false,
                    requestId(context, "a2ui"),
                    null);
            return analyzeA2UiRawOutput(context, execution, List.of());
        } catch (Exception ex) {
            return failedArtifact(
                context,
                "Model call failed: " + ex.getMessage(),
                elapsedMillis(startedAt),
                preparedPrompt.estimatedPromptTokens());
        }
    }

    private DeterminismRunArtifact runFogUiTransform(DeterminismPromptScenario scenario, int repetition) {
        ScenarioExecutionContext context = promptScenarioContext(
                scenario,
                DeterminismEvaluationMode.FOGUI_TRANSFORM,
                repetition);
        PreparedPrompt preparedPrompt = buildTransformPrompt(scenario, scenario.getPrompt());
        long startedAt = System.nanoTime();

        try {
            PromptExecutionResult execution = executePrompt(
                preparedPrompt,
                    true,
                    requestId(context, "fogui-transform"),
                    FogUiAdvisorContextKeys.ROUTE_TRANSFORM);
            return analyzeCanonicalOutput(context, execution, List.of());
        } catch (Exception ex) {
            return failedArtifact(
                context,
                "FogUI transform call failed: " + ex.getMessage(),
                elapsedMillis(startedAt),
                preparedPrompt.estimatedPromptTokens());
        }
    }

    private DeterminismRunArtifact runCompatibilityFromBaseline(
            DeterminismPromptScenario scenario,
            int repetition,
            String rawA2UiOutput
    ) {
        ScenarioExecutionContext context = promptScenarioContext(
                scenario,
                DeterminismEvaluationMode.FOGUI_A2UI_COMPATIBILITY,
                repetition);
        List<String> notes = new ArrayList<>();
        notes.add("Derived from DIRECT_A2UI_BASELINE output for the same scenario and repetition.");
        return translateA2UiPayload(context, rawA2UiOutput, notes);
    }

    private DeterminismRunArtifact runFixedCompatibilityScenario(DeterminismA2UiScenario scenario) {
        ScenarioExecutionContext context = compatibilityScenarioContext(scenario);
        long startedAt = System.nanoTime();
        try {
            String rawPayload = objectMapper.writeValueAsString(scenario.getPayload());
            List<String> notes = new ArrayList<>();
            notes.add("Fixed compatibility fixture payload.");
            return translateA2UiPayload(context, rawPayload, notes);
        } catch (JsonProcessingException ex) {
            return failedArtifact(
                    context,
                    "Failed to serialize fixed compatibility payload: " + ex.getMessage(),
                    elapsedMillis(startedAt),
                    0);
        }
    }

    private PromptExecutionResult executePrompt(
            PreparedPrompt preparedPrompt,
            boolean includeAdvisors,
            String requestId,
            String routeMode
    ) {
        var chatClient = includeAdvisors
                ? chatClientFactory.createClient()
                : chatClientFactory.createClientWithoutAdvisors();

        var requestSpec = chatClient.prompt(Objects.requireNonNull(preparedPrompt.prompt()));
        if (!includeAdvisors && properties.isApplyDeterministicOptionsToBaselines()) {
            chatClientFactory.applyDeterministicOptions(requestSpec);
        }
        if (includeAdvisors) {
            requestSpec.advisors(spec -> spec
                    .param(FogUiAdvisorContextKeys.REQUEST_ID, Objects.requireNonNull(requestId))
                    .param(FogUiAdvisorContextKeys.ROUTE_MODE, Objects.requireNonNull(routeMode)));
        }

        long startedAt = System.nanoTime();
        String rawOutput = requestSpec.call().content();
        int estimatedOutputTokens = estimateTokens(rawOutput);
        int estimatedTotalTokens = preparedPrompt.estimatedPromptTokens() + estimatedOutputTokens;

        return new PromptExecutionResult(
                rawOutput,
                elapsedMillis(startedAt),
                preparedPrompt.estimatedPromptTokens(),
                estimatedOutputTokens,
                estimatedTotalTokens,
                estimateCostUsd(estimatedTotalTokens));
    }

    private PreparedPrompt buildTransformPrompt(DeterminismPromptScenario scenario, String promptTextInput) {
        String contextHints = buildContextHints(scenario);
        String promptText = TransformPrompts.buildTransformPrompt(Objects.requireNonNullElse(promptTextInput, ""), contextHints);
        String systemPrompt = TransformPrompts.TRANSFORM_SYSTEM_PROMPT;
        return new PreparedPrompt(
                new Prompt(
                        new SystemMessage(systemPrompt),
                        new UserMessage(Objects.requireNonNull(promptText))),
                estimateTokens(systemPrompt) + estimateTokens(promptText));
    }

    private PreparedPrompt buildDirectA2UiPrompt(DeterminismPromptScenario scenario, String promptTextInput) {
        String contextHints = buildContextHints(scenario);
        String promptText = DeterminismEvaluationPrompts.buildDirectA2UiPrompt(Objects.requireNonNullElse(promptTextInput, ""), contextHints);
        String systemPrompt = DeterminismEvaluationPrompts.DIRECT_A2UI_SYSTEM_PROMPT;
        return new PreparedPrompt(
                new Prompt(
                        new SystemMessage(systemPrompt),
                        new UserMessage(Objects.requireNonNull(promptText))),
                estimateTokens(systemPrompt) + estimateTokens(promptText));
    }

    private String buildContextHints(DeterminismPromptScenario scenario) {
        StringBuilder hints = new StringBuilder();
        if (scenario.getIntent() != null && !scenario.getIntent().isBlank()) {
            hints.append("Intent: ").append(scenario.getIntent()).append(". ");
        }
        if (scenario.getPreferredComponents() != null && !scenario.getPreferredComponents().isEmpty()) {
            hints.append("Preferred UI component families: ")
                    .append(String.join(", ", scenario.getPreferredComponents()))
                    .append(". ");
        }
        if (scenario.getInstructions() != null && !scenario.getInstructions().isBlank()) {
            hints.append(scenario.getInstructions());
        }
        return hints.toString();
    }

    private DeterminismRunArtifact analyzeCanonicalOutput(
            ScenarioExecutionContext context,
            PromptExecutionResult execution,
            List<String> initialNotes
    ) {
        List<String> notes = new ArrayList<>(initialNotes);
        JsonNode parsed = tryReadTree(execution.rawOutput(), notes);
        String normalizedOutput = parsed == null ? null : jsonNormalizer.normalizeJson(parsed);

        Boolean canonicalParseSucceeded = null;
        Boolean canonicalValid = null;
        Integer validationErrorCount = null;
        Integer fallbackComponentCount = null;
        DeterminismRuntimeStabilityAnalyzer.RuntimeHashes runtimeHashes = DeterminismRuntimeStabilityAnalyzer.RuntimeHashes.empty();

        if (parsed != null) {
            try {
                GenerativeUIResponse response = objectMapper.treeToValue(parsed, GenerativeUIResponse.class);
                canonicalParseSucceeded = true;
                List<CanonicalValidationError> validationErrors = validateCanonical(response);
                canonicalValid = validationErrors.isEmpty();
                validationErrorCount = validationErrors.size();
                fallbackComponentCount = countFallbackComponents(response);
                runtimeHashes = runtimeStabilityAnalyzer.analyzeCanonicalResponse(response);
            } catch (JsonProcessingException ex) {
                canonicalParseSucceeded = false;
                notes.add("Canonical parse failed: " + ex.getOriginalMessage());
            }
        }

        return DeterminismRunArtifact.builder()
                .scenarioId(context.scenarioId())
                .scenarioTitle(context.scenarioTitle())
                .scenarioFamily(context.scenarioFamily())
                .promptDriven(context.promptDriven())
                .mode(context.mode())
                .repetition(context.repetition())
                .rawOutput(execution.rawOutput())
                .normalizedOutput(normalizedOutput)
                .normalizedOutputHash(jsonNormalizer.hash(normalizedOutput))
                .validJson(parsed != null)
                .canonicalParseSucceeded(canonicalParseSucceeded)
                .canonicalValid(canonicalValid)
                .translationErrorCount(null)
                .validationErrorCount(validationErrorCount)
                .fallbackComponentCount(fallbackComponentCount)
                .renderHash(runtimeHashes.renderHash())
                .streamFinalSnapshotHash(runtimeHashes.streamFinalSnapshotHash())
                .processingTimeMs(execution.processingTimeMs())
                .estimatedPromptTokens(execution.estimatedPromptTokens())
                .estimatedOutputTokens(execution.estimatedOutputTokens())
                .estimatedTotalTokens(execution.estimatedTotalTokens())
                .estimatedCostUsd(execution.estimatedCostUsd())
                .notes(notes)
                .build();
    }

    private DeterminismRunArtifact analyzeA2UiRawOutput(
            ScenarioExecutionContext context,
            PromptExecutionResult execution,
            List<String> initialNotes
    ) {
        List<String> notes = new ArrayList<>(initialNotes);
        JsonNode parsed = tryReadTree(execution.rawOutput(), notes);
        if (parsed != null && !parsed.isObject()) {
            notes.add("Expected an object root for A2UI baseline output.");
        }

        String normalizedOutput = parsed == null ? null : jsonNormalizer.normalizeJson(parsed);
        return DeterminismRunArtifact.builder()
                .scenarioId(context.scenarioId())
                .scenarioTitle(context.scenarioTitle())
                .scenarioFamily(context.scenarioFamily())
                .promptDriven(context.promptDriven())
                .mode(context.mode())
                .repetition(context.repetition())
                .rawOutput(execution.rawOutput())
                .normalizedOutput(normalizedOutput)
                .normalizedOutputHash(jsonNormalizer.hash(normalizedOutput))
                .validJson(parsed != null)
                .canonicalParseSucceeded(null)
                .canonicalValid(null)
                .translationErrorCount(null)
                .validationErrorCount(null)
                .fallbackComponentCount(null)
                .renderHash(null)
                .streamFinalSnapshotHash(null)
                .processingTimeMs(execution.processingTimeMs())
                .estimatedPromptTokens(execution.estimatedPromptTokens())
                .estimatedOutputTokens(execution.estimatedOutputTokens())
                .estimatedTotalTokens(execution.estimatedTotalTokens())
                .estimatedCostUsd(execution.estimatedCostUsd())
                .notes(notes)
                .build();
    }

    private DeterminismRunArtifact translateA2UiPayload(
            ScenarioExecutionContext context,
            String rawA2UiOutput,
            List<String> initialNotes
    ) {
        List<String> notes = new ArrayList<>(initialNotes);
        long startedAt = System.nanoTime();
        JsonNode parsed = tryReadTree(rawA2UiOutput, notes);
        if (parsed == null || !parsed.isObject()) {
            notes.add("FogUI compatibility could not run because the A2UI baseline output was not a valid JSON object.");
            return DeterminismRunArtifact.builder()
                .scenarioId(context.scenarioId())
                .scenarioTitle(context.scenarioTitle())
                .scenarioFamily(context.scenarioFamily())
                .promptDriven(context.promptDriven())
                .mode(context.mode())
                .repetition(context.repetition())
                    .rawOutput(null)
                    .normalizedOutput(null)
                    .normalizedOutputHash(null)
                    .validJson(false)
                    .canonicalParseSucceeded(null)
                    .canonicalValid(null)
                    .translationErrorCount(null)
                    .validationErrorCount(null)
                    .fallbackComponentCount(null)
                    .renderHash(null)
                    .streamFinalSnapshotHash(null)
                    .processingTimeMs(elapsedMillis(startedAt))
                    .estimatedPromptTokens(0)
                    .estimatedOutputTokens(0)
                    .estimatedTotalTokens(0)
                    .estimatedCostUsd(0.0d)
                    .notes(notes)
                    .build();
        }

        try {
            Map<String, Object> payload = objectMapper.readValue(rawA2UiOutput, MAP_TYPE);
            A2UiTranslationResult translation = a2UiInboundTranslator.translate(payload);
            List<CanonicalValidationError> validationErrors = validateCanonical(translation.getResponse());
            String canonicalOutput = objectMapper.writeValueAsString(translation.getResponse());
            String normalizedOutput = jsonNormalizer.normalizeJson(canonicalOutput);
            DeterminismRuntimeStabilityAnalyzer.RuntimeHashes runtimeHashes = runtimeStabilityAnalyzer
                    .analyzeCanonicalResponse(translation.getResponse());

            return DeterminismRunArtifact.builder()
                    .scenarioId(context.scenarioId())
                    .scenarioTitle(context.scenarioTitle())
                    .scenarioFamily(context.scenarioFamily())
                    .promptDriven(context.promptDriven())
                    .mode(context.mode())
                    .repetition(context.repetition())
                    .rawOutput(canonicalOutput)
                    .normalizedOutput(normalizedOutput)
                    .normalizedOutputHash(jsonNormalizer.hash(normalizedOutput))
                    .validJson(true)
                    .canonicalParseSucceeded(true)
                    .canonicalValid(validationErrors.isEmpty())
                    .translationErrorCount(translation.getErrors().size())
                    .validationErrorCount(validationErrors.size())
                    .fallbackComponentCount(countFallbackComponents(translation.getResponse()))
                    .renderHash(runtimeHashes.renderHash())
                    .streamFinalSnapshotHash(runtimeHashes.streamFinalSnapshotHash())
                    .processingTimeMs(elapsedMillis(startedAt))
                    .estimatedPromptTokens(0)
                    .estimatedOutputTokens(0)
                    .estimatedTotalTokens(0)
                    .estimatedCostUsd(0.0d)
                    .notes(notes)
                    .build();
        } catch (Exception ex) {
            notes.add("FogUI compatibility translation failed: " + ex.getMessage());
            return DeterminismRunArtifact.builder()
                    .scenarioId(context.scenarioId())
                    .scenarioTitle(context.scenarioTitle())
                    .scenarioFamily(context.scenarioFamily())
                    .promptDriven(context.promptDriven())
                    .mode(context.mode())
                    .repetition(context.repetition())
                    .rawOutput(null)
                    .normalizedOutput(null)
                    .normalizedOutputHash(null)
                    .validJson(false)
                    .canonicalParseSucceeded(false)
                    .canonicalValid(false)
                    .translationErrorCount(null)
                    .validationErrorCount(null)
                    .fallbackComponentCount(null)
                    .renderHash(null)
                    .streamFinalSnapshotHash(null)
                        .processingTimeMs(elapsedMillis(startedAt))
                        .estimatedPromptTokens(0)
                        .estimatedOutputTokens(0)
                        .estimatedTotalTokens(0)
                        .estimatedCostUsd(0.0d)
                    .notes(notes)
                    .build();
        }
    }

                private DeterminismRunArtifact failedArtifact(
                    ScenarioExecutionContext context,
                    String note,
                    Long processingTimeMs,
                    Integer estimatedPromptTokens
                ) {
        return DeterminismRunArtifact.builder()
                .scenarioId(context.scenarioId())
                .scenarioTitle(context.scenarioTitle())
                .scenarioFamily(context.scenarioFamily())
                .promptDriven(context.promptDriven())
                .mode(context.mode())
                .repetition(context.repetition())
                .rawOutput(null)
                .normalizedOutput(null)
                .normalizedOutputHash(null)
                .validJson(false)
                .canonicalParseSucceeded(null)
                .canonicalValid(null)
                .translationErrorCount(null)
                .validationErrorCount(null)
                .fallbackComponentCount(null)
                .renderHash(null)
                .streamFinalSnapshotHash(null)
                .processingTimeMs(processingTimeMs)
                .estimatedPromptTokens(estimatedPromptTokens)
                .estimatedOutputTokens(null)
                .estimatedTotalTokens(null)
                .estimatedCostUsd(null)
                .notes(List.of(note))
                .build();
    }

    private ScenarioExecutionContext promptScenarioContext(
            DeterminismPromptScenario scenario,
            DeterminismEvaluationMode mode,
            int repetition
    ) {
        return new ScenarioExecutionContext(
                scenario.getId(),
                scenario.getTitle(),
                PROMPT_FAMILY,
                true,
                mode,
                repetition);
    }

    private ScenarioExecutionContext compatibilityScenarioContext(DeterminismA2UiScenario scenario) {
        return new ScenarioExecutionContext(
                scenario.getId(),
                scenario.getTitle(),
                COMPATIBILITY_FAMILY,
                false,
                DeterminismEvaluationMode.FOGUI_A2UI_COMPATIBILITY,
                1);
    }

    private String requestId(ScenarioExecutionContext context, String route) {
        return context.scenarioId() + "-" + route + "-" + context.repetition();
    }

    private long elapsedMillis(long startedAt) {
        return TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startedAt);
    }

    private int estimateTokens(String value) {
        if (value == null || value.isBlank()) {
            return 0;
        }
        return Math.max(1, (int) Math.ceil((double) value.length() / TOKEN_ESTIMATE_DIVISOR));
    }

    private double estimateCostUsd(int estimatedTotalTokens) {
        return BigDecimal.valueOf(estimatedTotalTokens)
                .divide(new BigDecimal("1000000"), 8, RoundingMode.HALF_UP)
                .multiply(COST_PER_MILLION_TOKENS_USD)
                .doubleValue();
    }

    private JsonNode tryReadTree(String rawOutput, List<String> notes) {
        if (rawOutput == null || rawOutput.isBlank()) {
            notes.add("Model returned empty output.");
            return null;
        }

        try {
            return objectMapper.readTree(rawOutput);
        } catch (JsonProcessingException ex) {
            notes.add("Invalid JSON output: " + ex.getOriginalMessage());
            return null;
        }
    }

    private List<CanonicalValidationError> validateCanonical(GenerativeUIResponse response) {
        return fogUiCanonicalValidator.validate(
                response,
                CanonicalValidationContext.builder()
                        .expectedContractVersion(FogUiCanonicalContract.CURRENT_CONTRACT_VERSION)
                        .build());
    }

    private int countFallbackComponents(GenerativeUIResponse response) {
        if (response == null || response.getContent() == null) {
            return 0;
        }

        return response.getContent().stream()
                .filter(Objects::nonNull)
                .mapToInt(this::countFallbackComponents)
                .sum();
    }

    private int countFallbackComponents(ContentBlock block) {
        int self = "component".equals(block.getType())
                && "A2UiUnsupportedNode".equals(block.getComponentType())
                ? 1
                : 0;

        if (block.getChildren() == null || block.getChildren().isEmpty()) {
            return self;
        }

        return self + block.getChildren().stream()
                .filter(Objects::nonNull)
                .mapToInt(this::countFallbackComponents)
                .sum();
    }

    private record ScenarioExecutionContext(
            String scenarioId,
            String scenarioTitle,
            String scenarioFamily,
            boolean promptDriven,
            DeterminismEvaluationMode mode,
            int repetition
    ) {
    }

        private record PreparedPrompt(Prompt prompt, int estimatedPromptTokens) {
        }

        private record PromptExecutionResult(
            String rawOutput,
            long processingTimeMs,
            int estimatedPromptTokens,
            int estimatedOutputTokens,
            int estimatedTotalTokens,
            double estimatedCostUsd
        ) {
        }
}