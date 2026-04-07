# A2UI Compatibility (v1)

FogUI v1 supports **A2UI inbound translation** into FogUI canonical output.

Positioning note: FogUI interoperates with A2UI payloads; it does not attempt to replace A2UI as a protocol.

## Supported contract version

- Pinned target: `A2UI 0.8` (best-effort inbound mapping)

## Endpoint

`POST /fogui/compat/a2ui/inbound`

## Behavior

- Converts A2UI-like `thinking` + `content` payloads into `GenerativeUIResponse`.
- Stamps canonical metadata with `contractVersion: "fogui/1.0"`.
- Returns deterministic translation errors for unsupported shapes.
- Emits fallback component blocks (`A2UiUnsupportedNode`) for unknown nodes.
- Runs canonical validation and returns validation error details.
- Supports request correlation with `X-FogUI-Request-Id` request/response header.

## Supported Subset Matrix

FogUI v1 is intentionally conservative. The translator accepts a small inbound subset and makes unsupported or malformed input explicit instead of guessing.

| A2UI input shape | v1 behavior | Deterministic diagnostics |
| --- | --- | --- |
| Omitted `thinking` | Allowed; becomes an empty `thinking` list. | None |
| `thinking` as an array of objects | Translated item-by-item into canonical `ThinkingItem`. Missing `status` defaults to `complete`. Missing `timestamp` stays `null` for determinism. | None |
| `thinking` not an array | Invalid section is omitted. | `INVALID_THINKING` |
| `thinking[]` item not an object | Invalid item is omitted. | `INVALID_THINKING_ITEM` |
| Omitted `content` | Allowed at translation time, but usually not useful by itself. | None from translation; canonical validation can still raise `MISSING_CONTENT` downstream |
| `content` as an array | Translated block-by-block. | None if contained nodes are supported |
| Text block with `type: text` and `value` or `text` | Translated into canonical text block. | None |
| Text block missing both `value` and `text` | Translated into empty text block. | `MISSING_TEXT` |
| Component block with `componentType` | Translated into canonical component block. | None |
| Component block with `name` | `name` is treated as the canonical component type. | None |
| Component block with `type: component` but missing `componentType` and `name` | Translated deterministically as component type `unknown`. | None |
| `children` as an array | Recursively translated using the same subset rules. | None if contained nodes are supported |
| `children` not an array | Children are omitted. | `INVALID_CONTENT` on the child path |
| `props` not an object | Normalized to an empty props map. | None |
| Unsupported object node | Fallback canonical component block emitted: `A2UiUnsupportedNode`. | `UNSUPPORTED_NODE` |
| Non-object content item | Fallback canonical component block emitted: `A2UiUnsupportedNode`. | `INVALID_BLOCK` |
| `content` not an array | Invalid section is omitted. | `INVALID_CONTENT`; canonical validation can still raise `MISSING_CONTENT` downstream |

## Success Semantics

The compatibility endpoint can still return a partial canonical response when translation diagnostics exist.

- `translationErrors` describe compatibility-layer issues.
- `validationErrors` describe downstream canonical contract issues.
- `success=true` only when both lists are empty.

That means an inbound payload can be translated, rendered, and still be considered unsuccessful if deterministic diagnostics were emitted.

## Fixture-Backed Examples

These behaviors are pinned by translator fixtures in `fogui-java-core/src/test/resources/fixtures/a2ui` and enforced by `A2UiCompatibilityFixtureTest`.

### Supported Example

- Fixture: `supported_text_component.json`
- Shape: `thinking[]` object plus `content[]` text and named component blocks
- Result: translated with no compatibility errors

### Normalized Example

- Fixture: `normalized_unknown_component.json`
- Shape: `type: component` without `componentType` or `name`
- Result: translated as canonical component type `unknown`

### Fallback Example

- Fixture: `fallback_unsupported_node.json`
- Shape: unsupported object inside `content[]`
- Result: translated into `A2UiUnsupportedNode` with `UNSUPPORTED_NODE`

### Rejected-Shape Example

- Fixture: `rejected_invalid_content_container.json`
- Shape: `content` provided as an object instead of an array
- Result: content omitted with `INVALID_CONTENT`; canonical validation can still fail later with `MISSING_CONTENT`

## React Boundary

- `@fogui/react` does not parse or validate A2UI payloads directly.
- React consumers call the compatibility endpoint only when they want backend translation.
- The React package renders the resulting canonical FogUI response through the normal adapter pipeline.

## Example request

```json
{
  "thinking": [
    { "status": "complete", "message": "Analyzing..." }
  ],
  "content": [
    { "type": "text", "value": "Revenue increased 18% QoQ" },
    {
      "type": "component",
      "componentType": "Card",
      "props": { "title": "Revenue Summary" }
    }
  ]
}
```
