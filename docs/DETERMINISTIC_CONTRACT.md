# FogUI Deterministic JSON Contract

This document defines the canonical response shape that backend-java and packages/react must preserve.

## Scope

- Applies to transform and transform stream responses.
- Applies to all renderer adapters consuming `@fogui/react` canonical output.

## Top-Level Invariants

1. `thinking` is always an array.
2. `content` is always an array.
3. `metadata` is optional and may be an object or `null`.
4. Every content item must have `type` equal to `text` or `component`.

## Text Block Invariants

A text block canonical shape:

```json
{
  "type": "text",
  "value": "string"
}
```

Rules:

1. `value` is always stringified and never `undefined`.
2. Non-primitive render children are not allowed in text blocks.

## Component Block Invariants

A component block canonical shape:

```json
{
  "type": "component",
  "componentType": "lowercase-string",
  "props": {},
  "children": []
}
```

Rules:

1. `componentType` is trimmed, lowercased, and defaults to `unknown` when missing.
2. `props` is always an object (use `{}` when missing or malformed).
3. `children` must be omitted when empty.
4. `children` entries must be canonical content blocks.
5. `props.children` is not a render source after canonicalization.

## Children Precedence

When both `children` and `props.children` are present in input payloads:

1. Prefer block-level `children` if non-empty.
2. Otherwise use `props.children` if it is a content block or array of content blocks.
3. Canonical output stores render children only in `children`.

## Fallback Semantics

If backend parsing cannot produce a valid structured response:

1. Return canonical text fallback.
2. Include `metadata.fallback = true`.
3. Clients may choose to keep prior structured state if fallback arrives after valid patch stream state.

## Streaming Semantics

1. Patch events represent incremental canonical updates.
2. Final `result` event is canonical snapshot.
3. Client must prevent non-canonical or fallback-only final snapshots from corrupting richer validated state.

## Release Rule

A release is blocked if backend output and frontend canonicalization behavior diverge from this document.
