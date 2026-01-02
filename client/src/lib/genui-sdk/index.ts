/**
 * GenUI SDK - Transform any LLM output into beautiful UI components
 * 
 * @example
 * ```tsx
 * import { GenUIProvider, useGenUI, GenUIRenderer } from '@/lib/genui-sdk';
 * 
 * function App() {
 *   return (
 *     <GenUIProvider endpoint="https://api.genui.dev">
 *       <Chat />
 *     </GenUIProvider>
 *   );
 * }
 * 
 * function Chat() {
 *   const { transform } = useGenUI();
 *   const [ui, setUI] = useState(null);
 * 
 *   const handleLLMResponse = async (response: string) => {
 *     const result = await transform(response);
 *     if (result.success) {
 *       setUI(result.result);
 *     }
 *   };
 * 
 *   return ui ? <GenUIRenderer response={ui} /> : null;
 * }
 * ```
 */

// Context & Provider
export { GenUIProvider, useGenUIContext } from './GenUIProvider';

// Main Hook
export { useGenUI } from './useGenUI';

// Types
export type {
  GenUIConfig,
  TransformOptions,
  TransformResult,
  UseGenUIReturn,
} from './types';

// Re-export the renderer for convenience
export { GenerativeUIRenderer as GenUIRenderer } from '../../components/renderers/GenerativeUIRenderer';
export { DynamicComponent } from '../../components/renderers/ComponentRegistry';
