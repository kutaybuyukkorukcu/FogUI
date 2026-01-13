import React, { createContext, useContext, useMemo } from 'react';

/**
 * FogUI Platform API endpoint
 */
const FOGUI_API_ENDPOINT = 'https://api.virtuoapps.com';

/**
 * Component registry type - maps componentType to React components
 */
export type ComponentRegistry = Record<string, React.ComponentType<any>>;

interface FogUIContextValue {
  apiKey: string;
  endpoint: string;
  componentRegistry?: ComponentRegistry;
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
   * Custom component registry for your design system.
   * Map FogUI component types to your own React components.
   * 
   * @example
   * ```tsx
   * import { Card, Table } from '@/components/ui';
   * 
   * <FogUIProvider 
   *   apiKey="fog_xxx"
   *   components={{
   *     card: MyCard,
   *     table: MyTable,
   *     list: MyList,
   *   }}
   * >
   * ```
   */
  components?: ComponentRegistry;
}

/**
 * FogUIProvider - Provides FogUI configuration to the component tree.
 * 
 * @example Basic usage
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
 * 
 * @example With custom design system (e.g., Shadcn)
 * ```tsx
 * import { FogUIProvider } from '@fogui/react';
 * import { Card, CardHeader, CardContent } from '@/components/ui/card';
 * import { Table, TableHeader, TableBody, TableRow, TableCell } from '@/components/ui/table';
 * 
 * // Map FogUI component types to your design system
 * const myComponents = {
 *   card: ({ title, description, data }) => (
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
 *       <MyApp />
 *     </FogUIProvider>
 *   );
 * }
 * ```
 * 
 * @example Self-hosted deployment
 * ```tsx
 * <FogUIProvider 
 *   apiKey="fog_xxxx" 
 *   endpoint="https://fogui.mycompany.com"
 * >
 *   <MyApp />
 * </FogUIProvider>
 * ```
 */
export function FogUIProvider({ children, apiKey, endpoint, components }: FogUIProviderProps) {
  if (!apiKey) {
    console.warn('[FogUI] API key is required. Get one at https://fogui.dev/dashboard');
  }

  const value = useMemo<FogUIContextValue>(() => ({
    apiKey,
    endpoint: endpoint || FOGUI_API_ENDPOINT,
    componentRegistry: components,
  }), [apiKey, endpoint, components]);

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
