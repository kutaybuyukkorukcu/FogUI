import React, { createContext, useContext, useMemo } from 'react';
import type { GenUIConfig } from './types';

/**
 * GenUI Platform API endpoint
 * TODO: Change to production URL when deployed
 */
const GENUI_API_ENDPOINT = 'https://api.genui.dev';

interface GenUIContextValue {
  apiKey: string;
  endpoint: string;
}

const GenUIContext = createContext<GenUIContextValue | null>(null);

export interface GenUIProviderProps {
  children: React.ReactNode;
  /**
   * Your GenUI API key (get it from https://genui.dev/dashboard)
   */
  apiKey: string;
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
export function GenUIProvider({ children, apiKey }: GenUIProviderProps) {
  if (!apiKey) {
    console.warn('[GenUI] API key is required. Get one at https://genui.dev/dashboard');
  }

  // Use environment variable in development, production endpoint otherwise
  const endpoint = import.meta.env.DEV 
    ? (import.meta.env.VITE_GENUI_API_URL || 'http://localhost:5001')
    : GENUI_API_ENDPOINT;

  const value = useMemo<GenUIContextValue>(() => ({
    apiKey,
    endpoint,
  }), [apiKey, endpoint]);

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
