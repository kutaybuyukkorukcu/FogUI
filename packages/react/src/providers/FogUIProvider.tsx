import React, { createContext, useContext, useMemo } from 'react';
import { Adapter } from '../types/adapter';
import { headlessAdapter } from '../adapters/headless';

/**
 * FogUI Platform API endpoint
 */
const FOGUI_API_ENDPOINT = 'https://api.virtuoapps.com';



export const createAdapter = (adapter: Adapter): Adapter => adapter;

interface FogUIContextValue {
  apiKey: string;
  endpoint: string;
  adapter: Adapter;
  onAction?: (action: string, data?: unknown) => void;
}

const FogUIContext = createContext<FogUIContextValue | null>(null);

export interface FogUIProviderProps {
  children: React.ReactNode;
  /**
   * Your FogUI API key (get it from https://fogui.dev/dashboard)
   */
  apiKey: string;
  /**
   * Custom API endpoint (for self-hosted deployments)
   * @default 'https://api.virtuoapps.com'
   */
  endpoint?: string;
  /**
   * Custom component adapter for your design system.
   * @see https://fogui.dev/docs/adapters
   */
  adapter?: Adapter;
  /**
   * Global handler for component actions (e.g. form submissions, button clicks)
   */
  onAction?: (action: string, data?: unknown) => void;
}

/**
 * FogUIProvider - Provides FogUI configuration to the component tree.
 */
export function FogUIProvider({ children, apiKey, endpoint, adapter, onAction }: FogUIProviderProps) {
  if (!apiKey) {
    console.warn('[FogUI] API key is required. Get one at https://fogui.dev/dashboard');
  }

  const value = useMemo<FogUIContextValue>(() => ({
    apiKey,
    endpoint: endpoint || FOGUI_API_ENDPOINT,
    adapter: adapter || headlessAdapter,
    onAction,
  }), [apiKey, endpoint, adapter, onAction]);

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
