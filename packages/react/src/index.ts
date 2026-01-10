/**
 * @fogui/react - Transform LLM output into beautiful, interactive UI components
 * 
 * Like magic from the fog - UI materializes from raw text.
 * 
 * @example Basic Usage
 * ```tsx
 * import { FogUIProvider, useFogUI, FogUIRenderer } from '@fogui/react';
 * 
 * function App() {
 *   return (
 *     <FogUIProvider apiKey="fog_xxxx">
 *       <Chat />
 *     </FogUIProvider>
 *   );
 * }
 * 
 * function Chat() {
 *   const { transform } = useFogUI();
 *   const [ui, setUI] = useState(null);
 * 
 *   // 1. Call YOUR LLM (with your own key)
 *   const llmResponse = await openai.chat.completions.create({ ... });
 *   
 *   // 2. Transform with FogUI
 *   const result = await transform(llmResponse.choices[0].message.content);
 *   
 *   // 3. Render
 *   return <FogUIRenderer response={result.result} />;
 * }
 * ```
 * 
 * @example With Custom Design System (Shadcn, MUI, etc.)
 * ```tsx
 * import { FogUIProvider } from '@fogui/react';
 * import { Card, CardHeader, CardContent } from '@/components/ui/card';
 * 
 * // Map FogUI component types to YOUR components
 * const myComponents = {
 *   card: ({ title, description }) => (
 *     <Card>
 *       <CardHeader>{title}</CardHeader>
 *       <CardContent>{description}</CardContent>
 *     </Card>
 *   ),
 *   table: MyTableComponent,
 *   list: MyListComponent,
 * };
 * 
 * function App() {
 *   return (
 *     <FogUIProvider apiKey="fog_xxxx" components={myComponents}>
 *       <Chat />
 *     </FogUIProvider>
 *   );
 * }
 * ```
 * 
 * @packageDocumentation
 */

// Provider & Context
export { FogUIProvider, useFogUIContext } from './FogUIProvider';
export type { FogUIProviderProps, ComponentRegistry } from './FogUIProvider';

// Main Hook
export { useFogUI } from './useFogUI';

// Types
export type {
  FogUIConfig,
  TransformOptions,
  TransformResult,
  UseFogUIReturn,
  StreamEvent,
  FogUIResponse,
  ContentBlock,
  TextBlock,
  ComponentBlock,
  ThinkingItem,
} from './types';

// Components
export { FogUIRenderer } from './components/FogUIRenderer';
export { 
  DynamicComponent, 
  defaultComponentRegistry,
  createRegistry,
  mergeRegistries,
} from './components/ComponentRegistry';
export type {
  CardProps,
  ListProps,
  TableProps,
  CalloutProps,
} from './components/ComponentRegistry';
