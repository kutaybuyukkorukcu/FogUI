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

## Use Your Own Design System

FogUI is designed to work with **your existing UI components**. No need to adopt a new design language!

### Option 1: Shadcn/Radix UI

```tsx
import { FogUIProvider } from '@fogui/react';
import { createShadcnAdapter } from '@fogui/react/adapters';

// Import YOUR Shadcn components
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

// Create adapter with your components
const shadcnComponents = createShadcnAdapter({
  Card, CardHeader, CardContent, CardTitle, CardDescription,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  Alert, AlertTitle, AlertDescription,
});

function App() {
  return (
    <FogUIProvider apiKey="fog_xxxx" components={shadcnComponents}>
      <Chat />
    </FogUIProvider>
  );
}
```

### Option 2: Custom Components (Any Design System)

```tsx
import { FogUIProvider } from '@fogui/react';

// Map FogUI component types to YOUR components
const myComponents = {
  card: ({ title, description, data }) => (
    <div className="my-card">
      <h3>{title}</h3>
      <p>{description}</p>
      {/* Render data however you want */}
    </div>
  ),
  table: MyTableComponent,
  list: MyListComponent,
  callout: MyAlertComponent,
};

function App() {
  return (
    <FogUIProvider apiKey="fog_xxxx" components={myComponents}>
      <Chat />
    </FogUIProvider>
  );
}
```

## Self-Hosted Deployment

For enterprise/self-hosted deployments, specify a custom endpoint:

```tsx
<FogUIProvider 
  apiKey="fog_xxxx" 
  endpoint="https://fogui.mycompany.com"
>
  <App />
</FogUIProvider>
```

## API Reference

### `<FogUIProvider>`

Wrap your app with this provider to configure FogUI.

```tsx
<FogUIProvider 
  apiKey="fog_xxxx"
  components={myComponents}      // Optional: your design system
  endpoint="https://custom.api"  // Optional: self-hosted endpoint
>
  <App />
</FogUIProvider>
```

| Prop | Type | Description |
|------|------|-------------|
| `apiKey` | `string` | Your FogUI API key |
| `components` | `ComponentRegistry` | Custom component mapping (optional) |
| `endpoint` | `string` | Custom API endpoint (optional) |

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
  componentRegistry={customComponents}  // Optional: override provider components
  className="my-class"                  // Optional
  style={{ maxWidth: 600 }}             // Optional
/>
```

## Component Types

FogUI transforms LLM output into these component types:

| Type | Props | Description |
|------|-------|-------------|
| `card` | `{ title, description, data }` | Information card |
| `table` | `{ columns, rows, title }` | Data table |
| `list` | `{ title, items, ordered }` | Bullet or numbered list |
| `callout` | `{ title, message, variant }` | Alert/info box |

You can extend with custom types by adding them to your component registry.

## Get Your API Key

1. Visit [fogui.dev/dashboard](https://fogui.dev/dashboard)
2. Sign up or log in
3. Create a new API key
4. Use it in your app

## Why FogUI?

> UI that materializes from nothing - like magic from the fog ✨

- **Your LLM, Your Keys** - We never see your LLM API keys
- **Any LLM Provider** - Works with OpenAI, Claude, Gemini, Llama, etc.
- **Your Design System** - Shadcn, MUI, Ant Design, or custom
- **TypeScript First** - Full type safety
- **Streaming Support** - Real-time UI updates

## License

MIT
