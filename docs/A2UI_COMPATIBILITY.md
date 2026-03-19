# A2UI Compatibility (v1)

FogUI v1 supports **A2UI inbound translation** into FogUI canonical output.

## Supported contract version

- Pinned target: `A2UI 0.8` (best-effort inbound mapping)

## Endpoint

`POST /fogui/compat/a2ui/inbound`

## Behavior

- Converts A2UI-like `thinking` + `content` payloads into `GenerativeUIResponse`.
- Returns deterministic translation errors for unsupported shapes.
- Emits fallback component blocks (`A2UiUnsupportedNode`) for unknown nodes.
- Runs canonical validation and returns validation error details.

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

