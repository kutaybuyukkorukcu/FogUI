import React, { createContext, useContext, useEffect, useMemo } from 'react';
import type { Adapter, AdapterConformanceResult } from '../types/adapter';
import { headlessAdapter } from '../adapters/headless';
import type { FogUIActionErrorPayload, FogUIActionPayload } from '../types';
import { getAdapterConformance } from '../utils';

/**
 * Default self-host friendly API endpoint.
 */

export const DEFAULT_FOGUI_CONTRACT_VERSION = 'fogui/1.0';

export interface FogUIContractVersionConfig {
  /**
   * Expected canonical contract version emitted by the backend.
   * @default 'fogui/1.0'
   */
  readonly expected?: string;
  /**
   * When true, missing or mismatched versions fail transform calls and emit stream errors.
   * When false, the runtime only warns.
   * @default false
   */
  readonly strict?: boolean;
}

interface ResolvedFogUIContractVersionConfig {
  readonly expected: string;
  readonly strict: boolean;
}
const FOGUI_API_ENDPOINT = 'http://localhost:5001';





interface FogUIContextValue {
  readonly apiKey?: string;
  readonly endpoint: string;
  readonly adapter: Adapter;
  readonly adapterConformance: AdapterConformanceResult;
  readonly requestHeaders?: Readonly<Record<string, string>>;
  readonly fetchImplementation?: typeof fetch;
  readonly contractVersion: ResolvedFogUIContractVersionConfig;
  readonly onAction?: (action: string, data?: unknown) => void;
  readonly onActionStart?: (payload: FogUIActionPayload) => void | Promise<void>;
  readonly onActionComplete?: (payload: FogUIActionPayload) => void | Promise<void>;
  readonly onActionError?: (payload: FogUIActionErrorPayload) => void | Promise<void>;
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
   * Optional headers attached to transform and stream requests.
   */
  readonly headers?: Readonly<Record<string, string>>;
  /**
   * Optional fetch override for tests or custom runtimes.
   */
  readonly fetchImplementation?: typeof fetch;
  /**
   * Canonical contract-version handling. Warns by default, strict mode is opt-in.
   */
  readonly contractVersion?: FogUIContractVersionConfig;
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
  headers,
  fetchImplementation,
  contractVersion,
  adapter,
  onAction,
  onActionStart,
  onActionComplete,
  onActionError,
}: FogUIProviderProps) {
  const resolvedAdapter = adapter || headlessAdapter;
  const adapterConformance = useMemo(() => getAdapterConformance(resolvedAdapter), [resolvedAdapter]);
  const resolvedContractVersion = useMemo<ResolvedFogUIContractVersionConfig>(() => ({
    expected: contractVersion?.expected ?? DEFAULT_FOGUI_CONTRACT_VERSION,
    strict: contractVersion?.strict ?? false,
  }), [contractVersion]);

  useEffect(() => {
    for (const issue of adapterConformance.issues) {
      console.warn(`[FogUI] ${issue.message}`);
    }
  }, [adapterConformance]);

  const value = useMemo<FogUIContextValue>(() => ({
    apiKey,
    endpoint: endpoint || FOGUI_API_ENDPOINT,
    adapter: resolvedAdapter,
    adapterConformance,
    requestHeaders: headers,
    fetchImplementation,
    contractVersion: resolvedContractVersion,
    onAction,
    onActionStart,
    onActionComplete,
    onActionError,
  }), [
    adapterConformance,
    apiKey,
    resolvedContractVersion,
    endpoint,
    fetchImplementation,
    headers,
    onAction,
    onActionComplete,
    onActionError,
    onActionStart,
    resolvedAdapter,
  ]);

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
