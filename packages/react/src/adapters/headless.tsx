/**
 * Headless Adapter for FogUI
 * 
 * This adapter provides maximum flexibility by giving you render props / hooks
 * for each component type. You bring your own markup and styling.
 * Perfect for Tailwind CSS, custom design systems, or any UI approach.
 * 
 * @example
 * ```tsx
 * import { FogUIProvider } from '@fogui/react';
 * import { createHeadlessAdapter } from '@fogui/react/adapters';
 * 
 * const components = createHeadlessAdapter({
 *   card: ({ title, description, data, children }) => (
 *     <div className="rounded-lg border p-4 shadow-sm">
 *       {title && <h3 className="font-bold text-lg">{title}</h3>}
 *       {description && <p className="text-gray-600">{description}</p>}
 *       {children}
 *     </div>
 *   ),
 *   table: ({ columns, rows }) => (
 *     <table className="w-full border-collapse">
 *       <thead>
 *         <tr>{columns.map(col => <th key={col}>{col}</th>)}</tr>
 *       </thead>
 *       <tbody>
 *         {rows.map((row, i) => (
 *           <tr key={i}>
 *             {columns.map(col => <td key={col}>{row[col]}</td>)}
 *           </tr>
 *         ))}
 *       </tbody>
 *     </table>
 *   ),
 * });
 * 
 * function App() {
 *   return (
 *     <FogUIProvider apiKey="fog_xxx" components={components}>
 *       <Chat />
 *     </FogUIProvider>
 *   );
 * }
 * ```
 */

import type { CalloutProps, CardProps, ComponentRegistry, ListProps, TableProps } from '../components/ComponentRegistry';

import React from 'react';

/**
 * Configuration for creating a headless adapter.
 * Each component is a simple React component that receives typed props.
 */
export interface HeadlessConfig {
  /** Custom card component */
  card?: React.ComponentType<CardProps>;
  /** Custom list component */
  list?: React.ComponentType<ListProps>;
  /** Custom table component */
  table?: React.ComponentType<TableProps>;
  /** Custom callout/alert component */
  callout?: React.ComponentType<CalloutProps>;
  /** Additional custom components */
  [key: string]: React.ComponentType<any> | undefined;
}

/**
 * Creates a FogUI component registry from custom components.
 * This is the most flexible adapter - you provide complete components.
 * 
 * @param config - Your custom component implementations
 * @returns A ComponentRegistry for use with FogUIProvider
 */
export function createHeadlessAdapter(config: HeadlessConfig): ComponentRegistry {
  const registry: ComponentRegistry = {};

  for (const [key, component] of Object.entries(config)) {
    if (component) {
      registry[key] = component;
    }
  }

  return registry;
}
