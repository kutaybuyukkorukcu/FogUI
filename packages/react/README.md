# @fogui/react

Canonical React renderer and adapter trust layer for FogUI responses.

`@fogui/react` is intentionally narrow:

- It renders canonical FogUI responses.
- It maps canonical component types into your design system through adapters.
- It provides client helpers for the backend transform and stream endpoints.

It does not implement protocol translation. A2UI compatibility stays in the backend and reaches React only as canonical FogUI output.

## Installation

```bash
npm install @fogui/react
```

## Core API

- `FogUIProvider`
- `useFogUI`
- `FogUIRenderer`
- `createAdapter`
- `getAdapterConformance`
- Minimal reference adapter: `headlessAdapter`

## Quick Start

```tsx
import { useState } from 'react';
import {
  FogUIProvider,
  FogUIRenderer,
  createAdapter,
  getAdapterConformance,
  useFogUI,
  type FogUIResponse,
} from '@fogui/react';

const adapter = createAdapter({
  components: {
    Card: ({ title, description, children }) => (
      <section>
        {title && <h3>{title}</h3>}
        {description && <p>{description}</p>}
        {children}
      </section>
    ),
    Button: ({ label, onAction }) => (
      <button onClick={() => onAction?.('cta_click', { id: 'primary' })}>{label}</button>
    ),
  },
  conformance: {
    requiredComponents: ['Card', 'Button'],
  },
});

const conformance = getAdapterConformance(adapter);
if (!conformance.ok) {
  throw new Error(conformance.issues.map((issue) => issue.message).join('\n'));
}

function Demo() {
  const { transform, isLoading, error } = useFogUI();
  const [result, setResult] = useState<FogUIResponse | null>(null);

  const run = async () => {
    const response = await transform('Create a card with a CTA button', {
      intent: 'lead_capture',
      preferredComponents: ['Card', 'Button'],
      instructions: 'Keep it compact',
    });

    if (response.success && response.result) {
      setResult(response.result);
    }
  };

  return (
    <>
      <button disabled={isLoading} onClick={run}>Generate</button>
      {error && <p>{error}</p>}
      {result && <FogUIRenderer response={result} />}
    </>
  );
}

export default function App() {
  return (
    <FogUIProvider
      endpoint="http://localhost:5001"
      adapter={adapter}
      onAction={(action, data) => console.log(action, data)}
    >
      <Demo />
    </FogUIProvider>
  );
}
```

## Package Boundary

- Backend owns transform, stream, validation, and A2UI inbound translation.
- React owns canonical response validation, adapter-safe rendering, and action lifecycle handling.
- Unknown or unsupported component types render through deterministic fallback UI rather than crashing the tree.

## Provider

```tsx
<FogUIProvider
  apiKey="fog_xxx" // optional
  endpoint="http://localhost:5001" // optional, defaults to self-host friendly localhost
  headers={{ 'X-FogUI-Request-Id': 'req-123' }} // optional transport headers
  fetchImplementation={fetch} // optional override for tests/custom runtimes
  contractVersion={{ expected: 'fogui/1.0', strict: false }} // optional; warn by default
  adapter={adapter} // optional, defaults to headlessAdapter
  onAction={(action, data) => {}}
  onActionStart={(payload) => {}}
  onActionComplete={(payload) => {}}
  onActionError={(payload) => {}}
>
  <App />
</FogUIProvider>
```

## Hook

```tsx
const { transform, transformStream, isLoading, error, clearError } = useFogUI();
```

- `transform(content, options)` calls `POST /fogui/transform`.
- `transformStream(content, options)` consumes SSE from `POST /fogui/transform/stream`.
- Stream events: `result`, `usage`, `error`, `done`.
- If `apiKey` is omitted, requests are sent without `Authorization` header.

## Contract Version Handling

- React expects canonical responses to include `metadata.contractVersion = "fogui/1.0"` by default.
- Missing or mismatched versions log a warning unless `contractVersion.strict` is enabled.
- In strict mode, `transform(...)` returns `success: false` and streaming emits an `error` event instead of a `result` event.

## Adapter Conformance

Adapters remain intentionally small:

- `components` maps canonical component types to your React components.
- `mapProps` translates canonical props into component-specific props.
- `conformance.requiredComponents` lets you declare mappings your app requires.
- `renderFallback` lets you replace the default unmapped or prop-mapping fallback UI.

## Renderer Behavior

- Renders `text` and `component` blocks.
- Canonical layout/grouping typically arrives as `Container` with `layout`, `columns`, and `gap` props; adapters can map that into local stack/grid primitives.
- Supports nested component trees through `children`.
- Supports `props.children` fallback when block-level `children` is empty.
- Resolves adapter component names case-insensitively.
- Shows deterministic fallback UI for unmapped component types or prop-mapping failures.

## Built-in Adapters

- `headlessAdapter`: minimal reference adapter for smoke tests and integration scaffolding.

## Migration Notes

- `shadcnAdapter` has been removed from the package. Keep adapters application-local instead of bundling a UI-kit opinion into `@fogui/react`.
- A2UI payloads are no longer a renderer concern. Call the backend compatibility endpoint first, then render the returned canonical FogUI response.
- `mapProps` now receives a single object: `mapProps({ componentType, props })`.
- Canonical responses should now include `metadata.contractVersion`; React can enforce this strictly through `FogUIProvider`.
- The reference demo now validates transform, stream, compatibility, and adapter fallback behavior through `npm run smoke`.

## Local Development

```bash
cd packages/react
npm install
npm run test
npm run typecheck
npm run lint
npm run build
```
