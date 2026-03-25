# FogUI Architecture Boundaries

## Core OSS Modules

### `fogui-java-core`

Primary deterministic engine:

- Canonical model types.
- Contract validation.
- Protocol translation primitives (A2UI inbound today).
- Stream parse/reconcile helpers.

### `fogui-spring-starter`

Spring Boot integration glue:

- Auto-registers core deterministic services.
- Keeps framework wiring out of `fogui-java-core`.

### `packages/react` (`@fogui/react`)

Consumer-side rendering contract:

- Canonical block rendering.
- Design-system adapter mapping.
- Action lifecycle plumbing.
- Transform + stream client hooks.

## Reference Implementations

### `backend-java`

Reference server and integration harness:

- Core OSS reference APIs:
  - `POST /fogui/transform`
  - `POST /fogui/transform/stream`
  - `POST /fogui/compat/a2ui/inbound`
- Optional product-style reference APIs:
  - auth, API key, usage, profile endpoints.

### `examples/react-demo`

Minimal integration demo for local verification of:

- Happy-path transform rendering.
- Stream transform rendering.
- A2UI compatibility translation rendering.

## Archived Modules

### `archive/dashboard`

Archived UI app, excluded from active OSS docs and default CI surface.

## Design Principle

FogUI OSS owns deterministic compatibility + rendering trust primitives. Productized hosted concerns are tracked separately.
