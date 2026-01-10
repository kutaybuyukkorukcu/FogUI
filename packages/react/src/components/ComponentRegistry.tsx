import React from 'react';
import type { ComponentBlock } from '../types';

/**
 * Component registry type - maps componentType strings to React components.
 * 
 * Each component receives props that match the FogUI DSL for that component type.
 */
export type ComponentRegistry = Record<string, React.ComponentType<any>>;

/**
 * Standard prop interfaces for built-in FogUI component types.
 * Useful for implementing custom components that match the expected API.
 */
export interface CardProps {
  title?: string;
  description?: string;
  data?: Record<string, unknown>;
  children?: React.ReactNode;
}

export interface ListProps {
  title?: string;
  items: unknown[];
  ordered?: boolean;
}

export interface TableProps {
  columns: string[];
  rows: Record<string, unknown>[];
  title?: string;
}

export interface CalloutProps {
  title?: string;
  message: string;
  variant?: 'info' | 'warning' | 'tip' | 'error';
}

/**
 * Merge multiple component registries with later registries taking precedence.
 * Useful for layering: defaults → context → prop overrides.
 */
export function mergeRegistries(
  ...registries: (ComponentRegistry | undefined)[]
): ComponentRegistry {
  return registries.reduce<ComponentRegistry>((merged, registry) => {
    if (registry) {
      return { ...merged, ...registry };
    }
    return merged;
  }, {});
}

/**
 * Create a component registry from an adapter.
 * This is a convenience function for creating type-safe registries.
 * 
 * @example
 * ```tsx
 * import { createRegistry } from '@fogui/react';
 * import { Card } from '@/components/ui/card';
 * 
 * const myRegistry = createRegistry({
 *   card: MyCardComponent,
 *   table: MyTableComponent,
 * });
 * ```
 */
export function createRegistry(components: Partial<{
  card: React.ComponentType<CardProps>;
  list: React.ComponentType<ListProps>;
  table: React.ComponentType<TableProps>;
  callout: React.ComponentType<CalloutProps>;
  [key: string]: React.ComponentType<any>;
}>): ComponentRegistry {
  return components as ComponentRegistry;
}

/**
 * Default component implementations.
 * These provide basic rendering - users should customize for their design system.
 */

// Card Component
function DefaultCard({ title, description, data }: { title?: string; description?: string; data?: Record<string, unknown> }) {
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', marginBottom: '12px' }}>
      {title && <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 600 }}>{title}</h3>}
      {description && <p style={{ margin: '0 0 12px', color: '#6b7280' }}>{description}</p>}
      {data && (
        <div style={{ fontSize: '14px' }}>
          {Object.entries(data).map(([key, value]) => (
            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={{ color: '#6b7280' }}>{key}</span>
              <span style={{ fontWeight: 500 }}>{String(value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// List Component
function DefaultList({ title, items }: { title?: string; items: unknown[] }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      {title && <h3 style={{ margin: '0 0 12px', fontSize: '18px', fontWeight: 600 }}>{title}</h3>}
      <ul style={{ margin: 0, paddingLeft: '20px' }}>
        {items.map((item, i) => (
          <li key={i} style={{ marginBottom: '8px' }}>
            {typeof item === 'object' ? JSON.stringify(item) : String(item)}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Table Component
function DefaultTable({ columns, rows }: { columns: string[]; rows: Record<string, unknown>[] }) {
  return (
    <div style={{ overflowX: 'auto', marginBottom: '12px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col} style={{ textAlign: 'left', padding: '12px 8px', borderBottom: '2px solid #e5e7eb', fontWeight: 600 }}>
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {columns.map((col) => (
                <td key={col} style={{ padding: '12px 8px', borderBottom: '1px solid #e5e7eb' }}>
                  {String(row[col] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Callout Component
function DefaultCallout({ title, message, variant = 'info' }: { title?: string; message: string; variant?: 'info' | 'warning' | 'tip' }) {
  const colors = {
    info: { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' },
    warning: { bg: '#fffbeb', border: '#f59e0b', text: '#92400e' },
    tip: { bg: '#f0fdf4', border: '#22c55e', text: '#166534' },
  };
  const c = colors[variant];
  return (
    <div style={{ backgroundColor: c.bg, borderLeft: `4px solid ${c.border}`, padding: '12px 16px', marginBottom: '12px', borderRadius: '0 8px 8px 0' }}>
      {title && <strong style={{ color: c.text, display: 'block', marginBottom: '4px' }}>{title}</strong>}
      <span style={{ color: c.text }}>{message}</span>
    </div>
  );
}

/**
 * Default component registry mapping componentType to React components.
 * Users can override this with their own components.
 */
export const defaultComponentRegistry: Record<string, React.ComponentType<any>> = {
  card: DefaultCard,
  list: DefaultList,
  table: DefaultTable,
  callout: DefaultCallout,
};

interface DynamicComponentProps {
  block: ComponentBlock;
  registry?: Record<string, React.ComponentType<any>>;
}

/**
 * DynamicComponent - Renders a component based on componentType.
 */
export function DynamicComponent({ block, registry = defaultComponentRegistry }: DynamicComponentProps) {
  const { componentType, props } = block;
  const Component = registry[componentType];

  if (!Component) {
    return (
      <div style={{ padding: '12px', backgroundColor: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '8px', fontSize: '14px' }}>
        <strong>Unknown component: {componentType}</strong>
        <pre style={{ margin: '8px 0 0', fontSize: '12px', overflow: 'auto' }}>
          {JSON.stringify(props, null, 2)}
        </pre>
      </div>
    );
  }

  return <Component {...props} />;
}
