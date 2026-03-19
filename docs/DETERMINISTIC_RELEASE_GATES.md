# Deterministic Release Gates

These checks are mandatory before releasing backend-java and packages/react.

## Gate 1: Canonical Contract Parity

1. Backend parser canonical output matches contract in `docs/DETERMINISTIC_CONTRACT.md`.
2. Frontend schema preprocessing produces equivalent canonical shapes.
3. Component type casing policy is consistent (lowercase).

## Gate 2: Regression Tests

### Backend

Run:

```bash
cd backend-java && ./mvnw -B test
```

Must include passing tests for:

1. malformed props coercion behavior,
2. componentType canonicalization,
3. fallback metadata signaling,
4. partial streaming parse consistency.

### Frontend

Run:

```bash
cd packages/react && npm run test
```

Must include passing tests for:

1. schema normalization of malformed top-level payloads,
2. deterministic component block normalization,
3. patch normalization and invalid patch safety,
4. stream result normalization and fallback handling.

## Gate 3: Streaming Safety

1. Valid patch stream state is not silently downgraded by fallback-only final result.
2. Invalid patch operations do not corrupt current state.
3. Final result remains schema-valid after preprocess.

## Gate 4: Coverage

Coverage must satisfy the project threshold for analyzed modules.

- backend-java
- packages/react

## Gate 5: Manual Verification

Run the following scenarios in a demo/integration environment:

1. structured patches then structured final result,
2. structured patches then fallback final result,
3. malformed patch path then final result.

A release is blocked if any gate fails.
