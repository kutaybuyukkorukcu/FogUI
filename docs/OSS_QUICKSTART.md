# FogUI OSS Quickstart

FogUI is designed to run self-hosted with BYOK and a reference server.

Roadmap context: `docs/ROADMAP_OSS.md`

## Build all Java modules

From repository root:

```bash
./backend-java/mvnw -f pom.xml -q -DskipTests package
```

This builds:

- `fogui-java-core`
- `fogui-spring-starter`
- `backend-java` (reference server)

## Run reference server

```bash
cd backend-java
./mvnw spring-boot:run
```

## Configure BYOK

Set provider credentials in environment:

- `OPENAI_API_KEY`
- `OPENAI_BASE_URL` (optional; defaults to OpenAI API)
- `OPENAI_MODEL` (optional)

## Core OSS reference APIs

- `POST /fogui/transform`
- `POST /fogui/transform/stream`
- `POST /fogui/compat/a2ui/inbound`

## Reference-server optional APIs

`backend-java` also includes optional product-style reference endpoints for auth/API keys/usage/profile. They are useful for integration testing, but not part of FogUI core OSS contract.

## Create a local API key for the reference server

Use the helper script from repository root:

```bash
./scripts/create-dev-api-key.sh --email you@example.com --password your-password-123
```

This will register the user if needed, otherwise log in, then create a `fog_test_...` key by default.

Create a live-style key instead:

```bash
./scripts/create-dev-api-key.sh --email you@example.com --password your-password-123 --live
```

## Use transform endpoint

```bash
curl -X POST http://localhost:5001/fogui/transform \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer fog_live_xxx" \
  -d '{"content":"Summarize pipeline health"}'
```

## Run minimal demo (optional)

```bash
cd packages/react && npm install && npm run build
cd ../examples/react-demo && npm install && npm run dev
```

## Validate demo integration (recommended)

```bash
cd packages/react && npm run build
cd ../examples/react-demo && npm run smoke
```

## Deterministic Runtime Check (Recommended)

Run these checks after startup:

1. Call `/fogui/transform` twice with the same payload and confirm canonical response shape remains stable and includes `metadata.contractVersion = "fogui/1.0"`.
2. Call `/fogui/transform/stream` and confirm ordered SSE event lifecycle: `result` -> `usage` -> `done` (or `error`).
3. Call `/fogui/compat/a2ui/inbound` with a mixed-valid payload and confirm translation and validation diagnostics are returned deterministically.
4. Run `examples/react-demo` smoke validation and confirm transform, stream, and compatibility flows pass against the built `@fogui/react` package.

These checks align with Phase 1 and Phase 2 goals in `docs/ROADMAP_OSS.md`.

## Conformance and Replay Verification (Recommended)

From repository root:

```bash
./backend-java/mvnw -B -f pom.xml -pl fogui-java-core test -Dtest=CanonicalConformanceFixtureTest,StreamReplayDeterminismTest
```

This validates:

1. Canonical fixture conformance and deterministic validator output.
2. Deterministic stream replay behavior across ordered/duplicate/malformed sequences.
