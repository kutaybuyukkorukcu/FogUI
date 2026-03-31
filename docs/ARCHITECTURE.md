# FogUI Architecture Boundaries

## Architectural Thesis

FogUI is a backend runtime plus renderer contract that makes agent-generated UI **predictable, validated, and safe** before it reaches user-facing components.

## End-to-End Runtime Flow

### Flow A: Transform path (`POST /fogui/transform`, `/fogui/transform/stream`)

1. Input content arrives as raw model output text.
2. Spring AI transform pipeline generates canonical `GenerativeUIResponse` structure.
3. Canonical validation runs before output is accepted.
4. Streamed partial results are reconciled deterministically.
5. Canonical payload is consumed by `@fogui/react` and mapped through adapters.

### Flow B: Compatibility path (`POST /fogui/compat/a2ui/inbound`)

1. External protocol payload arrives (A2UI inbound).
2. Translator maps protocol payload into FogUI canonical shape.
3. Canonical validation runs and returns deterministic diagnostics.
4. Canonical payload is rendered through the same React adapter pipeline.

## Core OSS Modules

### `fogui-java-core`

Deterministic core engine:

1. Canonical model types and contracts.
2. Contract validation and validation error model.
3. Protocol translation primitives (A2UI inbound today).
4. Stream parse/reconcile helpers.

### `fogui-spring-starter`

Spring Boot integration layer:

1. Auto-configures FogUI core services.
2. Provides integration points for middleware, metrics, and runtime policy.
3. Keeps framework-specific wiring out of `fogui-java-core`.

### `packages/react` (`@fogui/react`)

Renderer-side trust layer:

1. Canonical block rendering.
2. Design-system adapter mapping.
3. Action lifecycle handling.
4. Client hooks for transform + stream flows.

## Reference Implementations

### `backend-java`

Reference server and integration harness, not the OSS product center:

1. Core OSS reference APIs:
   - `POST /fogui/transform`
   - `POST /fogui/transform/stream`
   - `POST /fogui/compat/a2ui/inbound`
2. Optional reference-server APIs:
   - auth, API key, usage, profile endpoints.

### `examples/react-demo`

Minimal verification app for:

1. Transform flow.
2. Stream flow.
3. Compatibility flow.

### `examples/spring-consumer`

Standalone verification app for:

1. Non-reactor Java artifact consumption.
2. Starter auto-configuration validation.
3. Deterministic policy and canonical bean availability checks.

## Public Stability Surface

Stable OSS surfaces that downstream teams should design against:

1. `fogui-java-core` public canonical model and validation APIs.
2. `fogui-spring-starter` auto-configured bean surface and advisor behavior.
3. `@fogui/react` renderer, provider, hooks, and adapter contract.
4. Canonical contract versioning through `metadata.contractVersion`.
5. Core reference endpoints for transform, stream, and A2UI inbound compatibility.

Reference-only surfaces that are intentionally not treated as long-term public contract:

1. `backend-java` auth, API key, usage, and profile endpoints.
2. Example applications and their internal wiring.
3. CI workflow details and repository-local release tooling.

See `docs/RELEASE_COMPATIBILITY.md` for package-version and upgrade expectations.

## Determinism Guardrails

FogUI enforces trust at multiple points:

1. Canonical schema contracts and validation.
2. Stable translation + validation diagnostics.
3. Deterministic stream reconciliation rules.
4. Adapter-safe rendering behavior with explicit fallback paths.

## Explicit Non-Goals (OSS Core)

1. Hosted dashboard UX as a primary product.
2. Billing and monetization implementation inside core OSS scope.
3. Competing with protocol specs as a standalone standard.
