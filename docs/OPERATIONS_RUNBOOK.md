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

## Recommended Operator Baseline

For self-hosted deployments, expose the standard Spring Boot operational surface even if you do not add custom FogUI meters yet:

```yaml
management:
   endpoints:
      web:
         exposure:
            include: health,info,metrics,prometheus,loggers
   endpoint:
      health:
         probes:
            enabled: true
```

This gives operators a stable baseline for HTTP latency, request volume, JVM health, and Prometheus scraping while FogUI-specific metrics remain application-owned.

## Metrics to Watch

Current recommended metrics are based on standard Spring Boot and Micrometer instrumentation plus FogUI error taxonomy:

1. HTTP request rate and latency for `/fogui/transform`, `/fogui/transform/stream`, and `/fogui/compat/a2ui/inbound`.
2. 4xx and 5xx counts by endpoint.
3. Count of deterministic advisor failures grouped by `errorCode`.
4. Stream terminal-event distribution: `done` vs `error`.

If you want an explicit counter for FogUI advisor failures in your external app, instrument it in your exception handler:

```java
@RestControllerAdvice
public class FogUiMetricsExceptionHandler {

      private final MeterRegistry meterRegistry;

      public FogUiMetricsExceptionHandler(MeterRegistry meterRegistry) {
            this.meterRegistry = meterRegistry;
      }

      @ExceptionHandler(FogUiAdvisorException.class)
      public ResponseEntity<Map<String, Object>> handle(FogUiAdvisorException ex) {
            Counter.builder("fogui.advisor.failures")
                        .tag("errorCode", ex.getErrorCode())
                        .register(meterRegistry)
                        .increment();

            return ResponseEntity.unprocessableEntity().body(Map.of(
                        "message", ex.getMessage(),
                        "errorCode", ex.getErrorCode(),
                        "details", ex.getDetails()));
      }
}
```

## Log Fields to Preserve

When forwarding logs to your aggregator, keep these fields intact because they are the current deterministic debugging anchors:

1. `X-FogUI-Request-Id` and response `requestId`
2. `errorCode`
3. advisor `details`
4. route mode (`transform` or `transform-stream`)
5. canonical validation diagnostics when present

## Tracing and Error Monitoring Hooks

FogUI currently exposes tracing hooks through request correlation and Spring application context rather than a custom tracing module:

1. Propagate `X-FogUI-Request-Id` from your ingress layer into downstream logs and spans.
2. Attach `routeMode` and `errorCode` as span tags when wrapping transform or stream calls.
3. Use Sentry configuration already exposed by the reference backend for error collection:
    - `SENTRY_DSN`
    - `SENTRY_ENVIRONMENT`
    - `sentry.traces-sample-rate`

If your platform already runs Micrometer Tracing or OpenTelemetry, treat `X-FogUI-Request-Id` as the stable correlation key between application traces and FogUI response payloads.
