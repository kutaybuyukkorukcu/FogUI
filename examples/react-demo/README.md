# FogUI React Demo

This example shows how to use `@fogui/react` with a local adapter and static canonical responses.

It is designed for fast adoption testing:

- adapter wiring,
- renderer behavior,
- action callbacks,
- canonical component compatibility.

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
- multiple component payloads from the same adapter
- JSON payload inspection for debugging

## Key Files

- `src/fogui.adapter.ts` - local unstyled adapter implementation
- `src/components/FogUIDemo.tsx` - interactive demo and payload switcher
- `src/App.tsx` - app shell

## Next Adoption Step

Replace static payloads with your backend output from `useFogUI().transform(...)`, then map components to your actual design system.
