# FogUI OSS Roadmap (Deterministic Agent UI Runtime)

**Last Updated:** March 26, 2026

## North Star

By October 31, 2026, FogUI should let teams running Spring AI reliably convert model output into:

1. A validated canonical UI contract.
2. Deterministic stream updates.
3. Adapter-safe rendering behavior for product design systems.

## Product Positioning

FogUI OSS is a trust layer between model output and UI rendering:

- Not a hosted dashboard product.
- Not a protocol clone.
- Not only a renderer.

FogUI owns deterministic contract enforcement, compatibility translation, and runtime-safe rendering integration.

## Scope Boundaries

### In active OSS scope

1. `fogui-java-core` for canonical schema, validation, protocol translation primitives, stream reconciliation.
2. `fogui-spring-starter` for Spring Boot integration and runtime wiring.
3. `packages/react` for canonical rendering and adapter behavior guarantees.
4. `backend-java` and `examples/react-demo` as reference implementations.

### Out of active OSS scope

1. Billing and subscription roadmap.
2. Hosted dashboard UX.
3. Commercial GTM experiments.

Deferred items stay in `docs/ROADMAP_CLOUD.md`.

## 2026 Execution Phases

### Phase 1: Contract Hardening (April 1 - May 15, 2026)

Goal: make canonical outputs explicit, versioned, and testable.

Deliverables:

1. Canonical contract version negotiation and compatibility checks.
2. Stable machine-readable validation error codes.
3. Golden fixture suite (valid + invalid canonical payloads).
4. Deterministic replay tests for stream reconciliation.

Exit criteria:

1. Same payload + same rules always yields same validation result.
2. CI includes canonical conformance fixtures as required checks.

### Phase 2: Spring AI Reliability Pack (May 16 - July 1, 2026)

Goal: make Spring AI behavior predictable enough for production UI generation.

Deliverables:

1. Deterministic generation profile (temperature/top-p policy + provider capability flags).
2. Structured output guardrails with strict fallback behavior.
3. Stable transform error envelope and retry-safe semantics.
4. Request/trace correlation across transform and stream flows.

Exit criteria:

1. Transform endpoint behavior is deterministic under policy constraints.
2. Stream lifecycle (`result`, `usage`, `error`, `done`) is covered by integration tests.

### Phase 3: Compatibility + Adapter Trust (July 2 - August 31, 2026)

Goal: make interop and rendering safety measurable.

Deliverables:

1. A2UI inbound compatibility expansion (documented supported subset and gaps).
2. Adapter conformance checks for required mappings and prop transforms.
3. Deterministic action lifecycle checks in `@fogui/react`.
4. Reference demo scenarios proving transform, stream, and compat flows.

Exit criteria:

1. Unknown protocol/component inputs fail safely with deterministic errors.
2. Adapter conformance suite runs in CI.

### Phase 4: OSS Adoption and Release Discipline (September 1 - October 31, 2026)

Goal: make FogUI easy to adopt externally.

Deliverables:

1. Java artifact publishing pipeline for `fogui-java-core` and `fogui-spring-starter`.
2. Versioning/release policy and compatibility notes per release.
3. External quickstart for Spring Boot + `@fogui/react` integration.
4. Observability starter docs (metrics, logs, tracing hooks).

Exit criteria:

1. External teams can consume released Java artifacts without cloning the monorepo.
2. New contributor can understand core vs reference boundaries in under 5 minutes.

## Backend Specialization Track (Spring AI Learning Outcomes)

This repo should intentionally teach backend engineering depth while shipping OSS value.

### Learning objective A: deterministic structured generation

Build:

1. Policy module for generation controls and fallback behavior.
2. Structured output validation harness with golden tests.

Prove:

1. Same inputs under same policy produce equivalent canonical payload shape.

### Learning objective B: stream correctness under failure

Build:

1. Stream replay suite with partial, delayed, and malformed chunks.
2. Reconciliation invariants with explicit acceptance tests.

Prove:

1. Stream error and recovery paths are deterministic and observable.

### Learning objective C: compatibility as backend middleware

Build:

1. A2UI compatibility matrix tests.
2. Translation diagnostics for unsupported nodes.

Prove:

1. Compatibility behavior is transparent, deterministic, and debuggable.

## How This Connects to Day-to-Day Work

Use `docs/BACKLOG.md` as the execution board for current and next sprint work, always mapped back to the phase goals above.
