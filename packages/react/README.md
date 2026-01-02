# @fogui/react

> Transform LLM output into beautiful, interactive UI components - like magic from the fog ✨

[![npm version](https://badge.fury.io/js/@fogui%2Freact.svg)](https://www.npmjs.com/package/@fogui/react)

## Installation

```bash
npm install @fogui/react
# or
yarn add @fogui/react
# or
pnpm add @fogui/react
```

## Quick Start

```tsx
import { FogUIProvider, useFogUI, FogUIRenderer } from '@fogui/react';

// 1. Wrap your app with FogUIProvider
function App() {
  return (
    <FogUIProvider apiKey="fog_xxxx">
      <Chat />
    </FogUIProvider>
  );
}

// 2. Use the hook to transform LLM output
function Chat() {
  const { transform, isLoading } = useFogUI();
  const [ui, setUI] = useState(null);

  const handleSubmit = async (userMessage: string) => {
    // Call YOUR LLM (with your own API key)
    const llmResponse = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: userMessage }]
    });

    // Transform with FogUI - UI materializes from the fog ✨
    const result = await transform(llmResponse.choices[0].message.content);
    
    if (result.success) {
      setUI(result.result);
    }
  };

  return (
    <div>
      {isLoading && <p>Materializing UI...</p>}
      {ui && <FogUIRenderer response={ui} />}
    </div>
  );
}
```

## API Reference

### `<FogUIProvider>`

Wrap your app with this provider to configure FogUI.

```tsx
<FogUIProvider apiKey="fog_xxxx">
  <App />
</FogUIProvider>
```

| Prop | Type | Description |
|------|------|-------------|
| `apiKey` | `string` | Your FogUI API key (get it from [fogui.dev/dashboard](https://fogui.dev/dashboard)) |

### `useFogUI()`

Hook for transforming LLM output.

```tsx
const { transform, transformStream, isLoading, error, clearError } = useFogUI();
```

| Method | Type | Description |
|--------|------|-------------|
| `transform` | `(content: string, options?) => Promise<TransformResult>` | Transform text to UI |
| `transformStream` | `(content: string, options?) => AsyncGenerator` | Streaming transform |
| `isLoading` | `boolean` | Loading state |
| `error` | `string \| null` | Error message |
| `clearError` | `() => void` | Clear error state |

### `<FogUIRenderer>`

Render the transformed UI response.

```tsx
<FogUIRenderer 
  response={transformResult.result} 
  componentRegistry={customComponents}  // Optional
/>
```

## Custom Components

Override the default components with your own design system:

```tsx
import { FogUIRenderer, defaultComponentRegistry } from '@fogui/react';
import { Card as MyCard, Table as MyTable } from 'your-ui-library';

const customRegistry = {
  ...defaultComponentRegistry,
  card: MyCard,
  table: MyTable,
};

<FogUIRenderer response={response} componentRegistry={customRegistry} />
```

## Get Your API Key

1. Visit [fogui.dev/dashboard](https://fogui.dev/dashboard)
2. Sign up or log in
3. Create a new API key
4. Use it in your app

## Why FogUI?

> UI that materializes from nothing - like magic from the fog ✨

- **Your LLM, Your Keys** - We never see your API keys
- **Any LLM Provider** - Works with OpenAI, Claude, Gemini, etc.
- **Custom Design Systems** - Plug in your own components
- **TypeScript First** - Full type safety

## License

MIT
