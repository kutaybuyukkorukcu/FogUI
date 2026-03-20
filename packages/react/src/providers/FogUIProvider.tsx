import React, { createContext, useContext, useMemo } from 'react';
import { Adapter } from '../types/adapter';
import { headlessAdapter } from '../adapters/headless';
import type { FogUIActionErrorPayload, FogUIActionPayload } from '../types';

/**
 * Default self-host friendly API endpoint.
 */
const FOGUI_API_ENDPOINT = 'http://localhost:5001';





interface FogUIContextValue {
  apiKey?: string;
  endpoint: string;
  adapter: Adapter;
  onAction?: (action: string, data?: unknown) => void;
  onActionStart?: (payload: FogUIActionPayload) => void | Promise<void>;
  onActionComplete?: (payload: FogUIActionPayload) => void | Promise<void>;
  onActionError?: (payload: FogUIActionErrorPayload) => void | Promise<void>;
}

const FogUIContext = createContext<FogUIContextValue | null>(null);

export interface FogUIProviderProps {
  readonly children: React.ReactNode;
  /**
   * Optional API key.
   * If provided, `useFogUI` attaches it as a bearer token.
   */
  readonly apiKey?: string;
  /**
   * Custom API endpoint (for self-hosted deployments)
   * @default 'http://localhost:5001'
   */
  readonly endpoint?: string;
  /**
   * Custom component adapter for your design system.
   * @see https://fogui.dev/docs/adapters
   */
  readonly adapter?: Adapter;
  /**
   * Global handler for component actions (e.g. form submissions, button clicks)
   */
  readonly onAction?: (action: string, data?: unknown) => void;
  /**
   * Fires before action dispatch begins.
   */
  readonly onActionStart?: (payload: FogUIActionPayload) => void | Promise<void>;
  /**
   * Fires after action dispatch completes successfully.
   */
  readonly onActionComplete?: (payload: FogUIActionPayload) => void | Promise<void>;
  /**
   * Fires when action dispatch fails.
   */
  readonly onActionError?: (payload: FogUIActionErrorPayload) => void | Promise<void>;
}

/**
 * FogUIProvider - Provides FogUI configuration to the component tree.
 */
export function FogUIProvider({
  children,
  apiKey,
  endpoint,
  adapter,
  onAction,
  onActionStart,
  onActionComplete,
  onActionError,
}: FogUIProviderProps) {
  const value = useMemo<FogUIContextValue>(() => ({
    apiKey,
    endpoint: endpoint || FOGUI_API_ENDPOINT,
    adapter: adapter || headlessAdapter,
    onAction,
    onActionStart,
    onActionComplete,
    onActionError,
  }), [apiKey, endpoint, adapter, onAction, onActionStart, onActionComplete, onActionError]);

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
