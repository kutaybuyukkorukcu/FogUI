# Transform Showcase

Small reference app for manually validating the backend `POST /fogui/transform` and `POST /fogui/compat/a2ui/inbound` flows against the local `@fogui/react` renderer.

## Run

```bash
cd packages/react && npm install && npm run build
cd ../../apps/fe-transform-showcase && npm install && npm run dev
```

Default backend endpoint: `http://localhost:5001`

The app ships with two manual validation tabs:

- `Transform`: canned prompts for each canonical component family so you can run them one-by-one or as a single sequential pass.
- `A2UI inbound`: editable A2UI-like payload samples that hit the compatibility controller, render the translated canonical result, and expose translation plus validation diagnostics.