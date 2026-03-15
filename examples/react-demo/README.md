# FogUI React Demo

This example shows how to use `@fogui/react` with a local adapter, static canonical responses, and live stream patch mode.

It is designed for fast adoption testing:

- adapter wiring,
- renderer behavior,
- action callbacks,
- canonical component compatibility,
- stream patch event handling.

## Run the Demo

From repository root:

```bash
npm install
npm install --workspace examples/react-demo
npm run dev --workspace examples/react-demo
```

If your workspace tooling differs, run directly inside `examples/react-demo`:

```bash
npm install
npm run dev
```

## What It Demonstrates

- `FogUIProvider` + custom `adapter`
- `FogUIRenderer` rendering static canonical payloads
- local mock patch application (`applyFogUIPatches`)
- live backend stream integration (`useFogUI().transformStream`)
- multiple component payloads from the same adapter
- JSON payload inspection for debugging

## Key Files

- `src/fogui.adapter.tsx` - local demo adapter implementation
- `src/components/FogUIDemo.tsx` - interactive demo and payload switcher
- `src/App.tsx` - app shell

## Next Adoption Step

Switch to live mode in the demo and use your backend API key/endpoint. Streamed `patch` events update UI incrementally before final `result`.
