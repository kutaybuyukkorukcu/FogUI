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

## Supported subset and known gaps

- Supported today: inbound translation into canonical FogUI blocks for `thinking`, plain `text`, and `component`-style content.
- Unsupported or unknown nodes are preserved as deterministic fallback components (`A2UiUnsupportedNode`) instead of crashing translation.
- Outbound A2UI generation is not part of the current OSS scope.
- React never consumes raw A2UI payloads directly; backend translation is the only supported compatibility boundary.

## Compatibility expectations

- A2UI support is best-effort for the documented inbound subset, not a promise to mirror the entire upstream protocol surface.
- Patch releases should preserve deterministic translation behavior for already supported nodes.
- If a release changes supported-node behavior or fallback semantics, it should be called out in the tagged release notes.

See `docs/RELEASE_COMPATIBILITY.md` for the broader package and contract policy.

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
