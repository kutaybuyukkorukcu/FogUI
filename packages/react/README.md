# @fogui/react

Transform agent/LLM output into real React UI using your existing component system.

## Installation

```bash
npm install @fogui/react
```

## Quick Start

```tsx
import { useState } from 'react';
import {
  FogUIProvider,
  FogUIRenderer,
  createAdapter,
  useFogUI,
  type Adapter,
  type FogUIResponse,
} from '@fogui/react';

const adapter: Adapter = createAdapter({
  components: {
    Card: ({ title, description, children }) => (
      <section>
        {title && <h3>{title}</h3>}
        {description && <p>{description}</p>}
        {children}
      </section>
    ),
    Button: ({ label, onAction }) => (
      <button type="button" onClick={() => onAction?.('button_click', { id: 'cta' })}>
        {label}
      </button>
    ),
  },
});

const ChatView = () => {
  const { transform, isLoading, error } = useFogUI();
  const [response, setResponse] = useState<FogUIResponse | null>(null);

  const onGenerate = async () => {
    const result = await transform('Create a card with a call-to-action button', {
      intent: 'lead_capture',
      preferredComponents: ['Card', 'Button'],
    });

    if (result.success && result.result) {
      setResponse(result.result);
    }
  };

  return (
    <>
      <button type="button" onClick={onGenerate} disabled={isLoading}>
        {isLoading ? 'Generating...' : 'Generate UI'}
      </button>

      {error && <p>{error}</p>}
      {response && <FogUIRenderer response={response} />}
    </>
  );
};

export default function App() {
  return (
    <FogUIProvider
      apiKey="fog_xxx"
      adapter={adapter}
      onAction={(action, data) => {
        console.log('FogUI action:', action, data);
      }}
      onActionStart={(payload) => {
        console.log('Action start:', payload);
      }}
      onActionComplete={(payload) => {
        console.log('Action complete:', payload);
      }}
      onActionError={(payload) => {
        console.error('Action error:', payload.error);
      }}
    >
      <ChatView />
    </FogUIProvider>
  );
}
```

## Core Concepts

- Canonical schema from your backend is rendered by `FogUIRenderer`.
- `adapter` maps canonical component types (like `Card`, `Table`) to your UI components.
- `useFogUI` transforms raw model output into the canonical schema.
- `onAction` allows component interactions to feed back into your app/agent loop.

## Provider API

```tsx
<FogUIProvider
  apiKey="fog_xxx"
  endpoint="https://api.virtuoapps.com" // optional
  adapter={myAdapter} // optional, defaults to headless adapter
  onAction={(action, data) => { /* optional */ }}
  onActionStart={(payload) => { /* optional */ }}
  onActionComplete={(payload) => { /* optional */ }}
  onActionError={(payload) => { /* optional */ }}
>
  <App />
</FogUIProvider>
```

| Prop | Type | Required | Description |
| --- | --- | --- | --- |
| `apiKey` | `string` | Yes | FogUI API key |
| `endpoint` | `string` | No | Custom FogUI backend endpoint |
| `adapter` | `Adapter` | No | Design system mapping |
| `onAction` | `(action: string, data?: unknown) => void` | No | Global action handler |
| `onActionStart` | `(payload: FogUIActionPayload) => void \| Promise<void>` | No | Lifecycle hook fired before action dispatch |
| `onActionComplete` | `(payload: FogUIActionPayload) => void \| Promise<void>` | No | Lifecycle hook fired after successful action dispatch |
| `onActionError` | `(payload: FogUIActionErrorPayload) => void \| Promise<void>` | No | Lifecycle hook fired when action dispatch fails |

## Action Lifecycle

`onAction` remains backward-compatible and still receives `(action, data)`.

Lifecycle payload shape:

```ts
{
  action: string;
  data?: unknown;
  timestamp: string; // ISO timestamp
  sourceComponent: string;
}
```

Lifecycle order is deterministic:

1. `onActionStart`
2. `onAction`
3. `onActionComplete`

If action dispatch throws/rejects, `onActionError` is fired instead of `onActionComplete`.

## Renderer API

```tsx
<FogUIRenderer
  response={fogUIResponse}
  className="fogui-output"
  style={{ maxWidth: 720 }}
  onAction={(action, data) => {
    // Optional per-render override, falls back to provider onAction
  }}
/>
```

When a component type is missing from your adapter, renderer:

- renders an inline fallback block,
- prints a warning with available adapter components,
- suggests a likely component match if possible.

## Hook API

```tsx
const { transform, transformStream, applyPatches, isLoading, error, clearError } = useFogUI();
```

### `transform`

```tsx
const result = await transform(content, {
  intent: 'dashboard',
  preferredComponents: ['Card', 'Table'],
  instructions: 'Use compact spacing',
});
```

### `transformStream`

```tsx
for await (const event of transformStream(content, { intent: 'chat' })) {
  if (event.type === 'chunk') {
    // streaming text/event chunks
  }
  if (event.type === 'patch') {
    // event.data is FogUIPatchOperation[]
    setResponse((prev) => (prev ? applyPatches(prev, event.data as FogUIPatchOperation[]) : prev));
  }
  if (event.type === 'result') {
    // validated canonical response
  }
  if (event.type === 'error') {
    // stream-level errors
  }
  if (event.type === 'done') {
    // stream completed
  }
}
```

## Streaming Patches (MVP)

`transformStream` now supports `patch` events for incremental UI updates.

Patch format:

```ts
type FogUIPatchOperation = {
  op: 'replace' | 'append' | 'remove';
  path: string; // JSON pointer style, e.g. /content/0/value or /content
  value?: unknown;
};
```

Use `applyPatches(currentResponse, patches)` from `useFogUI` (or `applyFogUIPatches` utility) to apply patches safely.
Invalid patch paths never crash rendering and are ignored with a warning.

## Adapter Template

```tsx
import { createAdapter, type Adapter } from '@fogui/react';

export const myAdapter: Adapter = createAdapter({
  components: {
    Card: MyCard,
    Table: MyTable,
    List: MyList,
    Form: MyForm,
    Input: MyInput,
    Button: MyButton,
    Stack: MyStack,
    Grid: MyGrid,
    Tabs: MyTabs,
    TabPane: MyTabPane,
    Badge: MyBadge,
  },
  mapProps: (componentType, props) => {
    if (componentType === 'Button') {
      return {
        ...props,
        onClick: props.action ? () => console.log(props.action) : undefined,
      };
    }
    return props;
  },
});
```

## Canonical Components

- `Card`
- `Table`
- `List`
- `Form`
- `Input`
- `Button`
- `Stack`
- `Grid`
- `Tabs`
- `TabPane`
- `Badge`

## Local Development

```bash
npm run test
npm run typecheck
npm run build
```

## License

MIT
