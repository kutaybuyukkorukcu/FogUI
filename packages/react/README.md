# @fogui/react

Render FogUI transform responses using your own React component system.

## Installation

```bash
npm install @fogui/react
```

## Core API

- `FogUIProvider`
- `useFogUI`
- `FogUIRenderer`
- `createAdapter`
- Prebuilt adapters: `shadcnAdapter`, `headlessAdapter`

## Quick Start

```tsx
import { useState } from 'react';
import {
  FogUIProvider,
  FogUIRenderer,
  createAdapter,
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
});

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

## Provider

```tsx
<FogUIProvider
  apiKey="fog_xxx" // optional
  endpoint="http://localhost:5001" // optional, defaults to self-host friendly localhost
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

## Renderer Behavior

- Renders `text` and `component` blocks.
- Supports nested component trees through `children`.
- Supports `props.children` fallback when block-level `children` is empty.
- Resolves adapter component names case-insensitively.
- Shows an inline warning block for unmapped component types.

## Built-in Adapters

- `shadcnAdapter`: Tailwind/Shadcn-style primitives and layouts.
- `headlessAdapter`: unstyled primitives for custom composition.

## Local Development

```bash
cd packages/react
npm install
npm run test
npm run typecheck
npm run lint
npm run build
```
