# Determinism Evaluation Plan

Goal: prove, with repeatable evidence, whether FogUI improves the stability and render-safety of agent-crafted interfaces compared with direct model output.

This evaluation currently has one benchmark track:

1. Repeatability benchmark: does the same exact prompt produce the same result repeatedly?

## Core Question

For the same user intent, same model, and the same repetition count, does FogUI produce UI outputs that are more:

1. Structurally stable
2. Canonically valid
3. Compatible with rendering
4. Operationally diagnosable

## Evaluation Modes

The first implementation slice evaluates four modes:

1. `DIRECT_CANONICAL_BASELINE`
   - User intent goes directly to the model.
   - The model is prompted to emit FogUI canonical JSON.
   - No FogUI advisors or runtime validation are applied during generation.

2. `DIRECT_A2UI_BASELINE`
   - User intent goes directly to the model.
   - The model is prompted to emit an A2UI-like JSON object.
   - No FogUI advisors or runtime translation are applied during generation.

3. `FOGUI_TRANSFORM`
   - User intent goes through FogUI transform prompting and advisors.
   - The output is expected to be canonical FogUI JSON.

4. `FOGUI_A2UI_COMPATIBILITY`
   - The raw output from `DIRECT_A2UI_BASELINE` is fed into FogUI compatibility translation.
   - The translated canonical result is validated and measured.

This keeps the comparison fair:

1. The direct A2UI baseline shows what the model emitted on its own.
2. The compatibility mode shows what FogUI can recover or stabilize from that exact same baseline output.
3. The transform mode shows FogUI's strongest canonical path.

## Repetition Count

Default repetition count for the first benchmark implementation: `10`.

This is intentionally small enough to iterate quickly while still surfacing obvious instability.

## Scenario Families

### Prompt-driven intent scenarios

These come from the transform showcase prompts and are used for the three main comparison paths:

1. `DIRECT_CANONICAL_BASELINE`
2. `DIRECT_A2UI_BASELINE`
3. `FOGUI_TRANSFORM`
4. `FOGUI_A2UI_COMPATIBILITY`

### Fixed A2UI compatibility scenarios

These come from the A2UI showcase payloads and validate translator behavior on known payloads.

They are deterministic compatibility fixtures, not stochastic model benchmarks.

## Metrics

The current implementation computes:

1. JSON validity rate
2. Canonical validity rate
3. Exact normalized output stability rate
4. Adapter-agnostic canonical render-plan stability rate
5. Runtime-normalized final stream snapshot stability rate
6. Translation and validation diagnostic rate
7. Fallback component rate

Metric definitions:

1. Render stability hash is derived from the canonical content tree as FogUIRenderer consumes it, ignoring thinking items and transport metadata.
2. Stream final snapshot hash is derived from the canonical snapshot the backend stream route would emit after runtime normalization, including contract-version injection when the payload is otherwise render-safe.
3. `DIRECT_A2UI_BASELINE` remains `n/a` for render and stream metrics because it does not produce canonical render input until compatibility translation is applied.

## Result Interpretation

The first publishable claim should stay disciplined:

1. FogUI can improve repeatability and canonical validity versus raw structured-output prompting.
2. FogUI can recover or normalize a meaningful subset of A2UI-like outputs into canonical renderable payloads.
3. FogUI does not make the underlying model fully deterministic.
4. FogUI does make the runtime behavior more measurable, diagnosable, and constrained.

## Fairness Rules

1. Use the same model across all prompt-driven modes.
2. Apply the same deterministic model options to baseline prompt modes when comparing runtime-layer impact.
3. Compare normalized JSON rather than raw transport envelopes.
4. Separate model variance from runtime guarantees in the final write-up.

## Output Artifacts

Each evaluation run writes:

1. `report.json` for machine-readable analysis
2. `report.md` for human-readable publishing support
3. Model and provider metadata so multiple runs can be compared later

Artifacts are written under `backend-java/target/determinism-evaluation/<timestamp>/`.

## Initial Run Command

```bash
cd backend-java
./mvnw spring-boot:run -Dspring-boot.run.arguments="--fogui.evaluation.enabled=true --fogui.evaluation.repetitions=10"
```

## Operational Overhead Benchmark

The evaluation now measures runtime cost as well as stability.

It includes:

1. End-to-end latency per mode with P50 and P95 timings.
2. Transform latency delta for `FOGUI_TRANSFORM` versus `DIRECT_CANONICAL_BASELINE`.
3. Estimated prompt tokens, output tokens, total tokens, and estimated cost per prompt-driven mode.
4. Transform token and cost deltas versus `DIRECT_CANONICAL_BASELINE`.
5. Fixed compatibility fixture translation latency with P50 and P95 timings for `FOGUI_A2UI_COMPATIBILITY`.

Operational estimates are heuristic by design:

1. Token estimates use `chars / 4`.
2. Cost uses a flat `$0.60 / 1M tokens` estimate for relative comparison.
3. Compatibility translation reports zero model tokens and zero model cost because it is a backend translation path, not a model call.

## Implementation Phases

### Phase 1

1. Evaluation catalog resources
2. Baseline and FogUI comparison modes
3. JSON normalization and metric calculation
4. Report generation
5. Render-plan and runtime stream snapshot hashing

### Phase 2

1. Publication-oriented scenario selection and screenshots
2. Article-ready benchmark framing around canonicality, render safety, interoperability, and operational cost

### Phase 3

1. Threshold tuning for "deterministic enough"
2. Article-ready with-FogUI vs without-FogUI examples
3. CI-safe non-live regression checks around the benchmark contract
4. Tighten or replace heuristic cost estimation if provider-side usage telemetry becomes available