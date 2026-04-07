# Transform Showcase

Small reference app for manually validating the backend `POST /fogui/transform` flow against the local `@fogui/react` renderer.

## Run

```bash
cd packages/react && npm install && npm run build
cd ../examples/transform-showcase && npm install && npm run dev
```

Default backend endpoint: `http://localhost:5001`

The app ships with canned prompts for each canonical component family so you can run them one-by-one or as a single sequential pass.