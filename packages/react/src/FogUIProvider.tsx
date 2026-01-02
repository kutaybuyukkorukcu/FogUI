import React, { createContext, useContext, useMemo } from 'react';

/**
 * FogUI Platform API endpoint
 */
const FOGUI_API_ENDPOINT = 'https://api.fogui.dev';

interface FogUIContextValue {
  apiKey: string;
  endpoint: string;
}

const FogUIContext = createContext<FogUIContextValue | null>(null);

export interface FogUIProviderProps {
  children: React.ReactNode;
  /**
   * Your FogUI API key (get it from https://fogui.dev/dashboard)
   */
  apiKey: string;
}

/**
 * FogUIProvider - Provides FogUI configuration to the component tree.
 * 
 * @example
 * ```tsx
 * import { FogUIProvider } from '@fogui/react';
 * 
 * function App() {
 *   return (
 *     <FogUIProvider apiKey="fog_xxxx">
 *       <MyApp />
 *     </FogUIProvider>
 *   );
 * }
 * ```
 */
export function FogUIProvider({ children, apiKey }: FogUIProviderProps) {
  if (!apiKey) {
    console.warn('[FogUI] API key is required. Get one at https://fogui.dev/dashboard');
  }

  const value = useMemo<FogUIContextValue>(() => ({
    apiKey,
    endpoint: FOGUI_API_ENDPOINT,
  }), [apiKey]);

  return (
    <FogUIContext.Provider value={value}>
      {children}
    </FogUIContext.Provider>
  );
}

/**
 * Hook to access FogUI context
 * @internal
 */
export function useFogUIContext(): FogUIContextValue {
  const context = useContext(FogUIContext);
  if (!context) {
    throw new Error('useFogUI must be used within a FogUIProvider. Wrap your app with <FogUIProvider apiKey="...">');
  }
  return context;
}
