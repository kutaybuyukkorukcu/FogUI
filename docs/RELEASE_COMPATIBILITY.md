# Release and Compatibility Policy

This document defines what downstream adopters should treat as stable, how FogUI versioning maps to the canonical contract, and what each release level is allowed to change.

## Scope

This policy applies to:

1. `fogui-java-core`
2. `fogui-spring-starter`
3. `@fogui/react`
4. The canonical FogUI contract identified by `metadata.contractVersion`

It does not treat every endpoint or example in `backend-java` as part of the permanent public contract.

## Public Stability Surface

Downstream teams can treat these as the supported OSS surface:

1. Canonical model and validation APIs in `fogui-java-core`
2. Auto-configured starter beans and deterministic advisor behavior in `fogui-spring-starter`
3. `FogUIProvider`, `useFogUI`, `FogUIRenderer`, adapter APIs, and deterministic fallback behavior in `@fogui/react`
4. Core reference endpoints:
   - `POST /fogui/transform`
   - `POST /fogui/transform/stream`
   - `POST /fogui/compat/a2ui/inbound`
5. Canonical contract versioning through `metadata.contractVersion`

These are intentionally outside the long-term public contract unless promoted explicitly:

1. Reference-server auth, API key, usage, and profile endpoints
2. Example-application internal wiring
3. CI workflow details and repository-local release tooling

## Version Tracks

FogUI has two independent version tracks:

1. Package versions:
   - `fogui-java-core`
   - `fogui-spring-starter`
   - `@fogui/react`
2. Canonical contract version:
   - currently `fogui/1.0`

Package upgrades can happen without a canonical contract bump. A contract bump should only happen when canonical payload expectations or compatibility rules change in a way that cannot be treated as backward compatible.

## Java Release Flow

Current supported Java registry: GitHub Packages.

Java release tags use this format:

- `java-vX.Y.Z`

Manual workflow dispatches may publish the same version pattern without a tag when needed.

Maven Central remains a later follow-up, not the current supported Java release path.

## Semver Expectations

### Patch Releases

Patch releases should contain fixes, documentation updates, observability improvements, and non-breaking behavior hardening.

They should not:

1. require adapter rewrites
2. change canonical contract version
3. remove public APIs
4. silently change deterministic error codes

### Minor Releases

Minor releases may add new public APIs, new optional canonical capabilities, or new adapter hooks.

They should remain backward compatible for existing consumers unless release notes explicitly call out a constrained migration.

Minor releases may:

1. add new optional component types or props
2. add new diagnostics or compatibility helpers
3. add new starter configuration toggles with safe defaults

### Major Releases

Major releases are the boundary for breaking changes.

Examples:

1. removing or renaming public APIs
2. changing default deterministic behavior in a breaking way
3. requiring adapter-contract changes by default
4. introducing a new canonical contract version incompatible with the previous one

## Compatibility Notes Required Per Tagged Release

Each tagged release should answer these questions:

1. Which modules were released?
2. Does the canonical contract version change?
3. Are there any required consumer migrations?
4. Are adapter changes required?
5. Are there any A2UI compatibility changes or known gaps?
6. Are there any new observability or operator-facing knobs?

## Upgrade Checklist

Before adopting a new FogUI release, downstream teams should:

1. read the release notes for compatibility changes
2. confirm the expected canonical contract version
3. rerun adapter conformance checks in `@fogui/react`
4. rerun deterministic transform and stream smoke checks
5. validate A2UI inbound fallback behavior if compatibility endpoints are in use
6. confirm request-correlation and error-code observability still matches dashboards and alerts

## A2UI Compatibility Expectations

A2UI support is best-effort for the documented inbound subset.

FogUI does not currently promise:

1. full upstream protocol coverage
2. outbound A2UI generation
3. direct A2UI rendering in `@fogui/react`

Changes to supported-node behavior or fallback semantics should always be called out in release notes.

## Release Notes Template

Use this template for each tagged release:

```md
## FogUI <version>

### Released modules
- fogui-java-core
- fogui-spring-starter
- @fogui/react

### Compatibility
- Canonical contract version: fogui/1.0
- Breaking changes: none | list them
- Required migrations: none | list them

### Runtime behavior
- Deterministic transform/stream changes
- Validation or advisor error-code changes
- A2UI compatibility changes

### Renderer and adapters
- Adapter contract changes
- New optional component or prop support

### Operator notes
- Metrics/logging/tracing changes
- New config toggles
```