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
