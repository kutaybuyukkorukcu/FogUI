# FogUI Operations Runbook

## Request Correlation

FogUI transform and compatibility endpoints support request correlation by `X-FogUI-Request-Id`.

### Behavior

1. If client sends `X-FogUI-Request-Id`, FogUI reuses it.
2. If missing, FogUI generates `fogui-<uuid>`.
3. Response always returns `X-FogUI-Request-Id`.
4. Transform body includes `requestId`; stream error events include `requestId`.

### Quick Check

```bash
curl -i -X POST http://localhost:5001/fogui/transform \
  -H "Authorization: Bearer fog_live_xxx" \
  -H "Content-Type: application/json" \
  -H "X-FogUI-Request-Id: req-demo-001" \
  -d '{"content":"Summarize system health"}'
```

Confirm:

1. `X-FogUI-Request-Id: req-demo-001` in response headers.
2. `requestId` field in JSON body is `req-demo-001`.

## Stream Lifecycle Troubleshooting

Expected lifecycle:

1. `result` events (zero or more partial snapshots)
2. `usage` event (optional)
3. terminal `done`

or

1. terminal `error`

Never both terminal events in the same stream.

## Deterministic Replay Debugging

If stream final UI looks unstable:

1. Capture incoming chunk sequence (in order).
2. Replay with core replay tests (`StreamReplayDeterminismTest`).
3. Check whether reconciliation changed due to input ordering or malformed chunks.
4. Inspect metadata merge behavior (incoming keys overwrite previous keys).

Run:

```bash
./backend-java/mvnw -B -f pom.xml -pl fogui-java-core test -Dtest=StreamReplayDeterminismTest
```

## Canonical Contract Diagnostics

Canonical validation errors now include:

1. `path`
2. `code`
3. `category`
4. `message`
5. `details` (optional)

Contract-version mismatch issues use:

- `MISSING_CONTRACT_VERSION`
- `CONTRACT_VERSION_MISMATCH`

Run fixture checks:

```bash
./backend-java/mvnw -B -f pom.xml -pl fogui-java-core test -Dtest=CanonicalConformanceFixtureTest
```

## Advisors Troubleshooting

If transform/stream starts failing after config changes:

1. Confirm advisor toggles under `fogui.advisors.*`.
2. Confirm fail-fast expectation (`fogui.advisors.fail-fast`).
3. Verify advisor ordering assumptions:
   - deterministic options first
   - canonical validation after generation
4. Inspect `errorCode` + diagnostic payload for typed advisor failures:
   - `CANONICAL_RESPONSE_MISSING`
   - `CANONICAL_PARSE_FAILED`
   - `CANONICAL_VALIDATION_FAILED`
