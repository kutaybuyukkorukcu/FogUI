import React, { createContext, useContext, useMemo } from 'react';
import type { PartialComponentRegistry } from './types/components';

/**
 * GenUI Platform API endpoint
 * TODO: Change to production URL when deployed
 */
const GENUI_API_ENDPOINT = 'https://api.genui.dev';

interface GenUIContextValue {
  apiKey: string;
  endpoint: string;
  components: PartialComponentRegistry;
  onAction?: (action: string, data?: unknown) => void;
}

const GenUIContext = createContext<GenUIContextValue | null>(null);

export interface GenUIProviderProps {
  children: React.ReactNode;
  /**
   * Your GenUI API key (get it from https://genui.dev/dashboard)
   * Optional for demo/development mode
   */
  apiKey?: string;
  /**
   * Global handler for component actions (e.g. form submissions, button clicks)
   */
  onAction?: (action: string, data?: unknown) => void;
  /**
   * Custom component overrides for design system compatibility.
   * Any component not specified will use FogUI's default Tailwind renderer.
   * 
   * @example
   * ```tsx
   * <GenUIProvider
   *   apiKey="xxx"
   *   components={{
   *     card: MyMUICard,
   *     list: MyAntList,
   *   }}
   * >
   * ```
   */
  components?: PartialComponentRegistry;
}

/**
 * GenUIProvider - Provides GenUI configuration to the component tree.
 * 
 * @example
 * ```tsx
 * import { GenUIProvider } from '@genui/react';
 * 
 * function App() {
 *   return (
 *     <GenUIProvider apiKey="genui_xxxx">
 *       <MyApp />
 *     </GenUIProvider>
 *   );
 * }
 * ```
 */
export function GenUIProvider({ 
  children, 
  apiKey = '',
  components = {},
  onAction,
}: GenUIProviderProps) {
  if (!apiKey && !import.meta.env.DEV) {
    console.warn('[GenUI] API key is required in production. Get one at https://genui.dev/dashboard');
  }

  // Use environment variable in development, production endpoint otherwise
  const endpoint = import.meta.env.DEV 
    ? (import.meta.env.VITE_GENUI_API_URL || 'http://localhost:5001')
    : GENUI_API_ENDPOINT;

  const value = useMemo<GenUIContextValue>(() => ({
    apiKey,
    endpoint,
    components,
    onAction,
  }), [apiKey, endpoint, components, onAction]);

  return (
    <GenUIContext.Provider value={value}>
      {children}
    </GenUIContext.Provider>
  );
}

/**
 * Hook to access GenUI context
 * @internal
 */
export function useGenUIContext(): GenUIContextValue {
  const context = useContext(GenUIContext);
  if (!context) {
    throw new Error('useGenUI must be used within a GenUIProvider. Wrap your app with <GenUIProvider apiKey="...">');
  }
  return context;
}

