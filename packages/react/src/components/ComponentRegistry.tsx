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
    error: { bg: '#fef2f2', border: '#ef4444', text: '#b91c1c' }, // Added error variant
  };
  const c = colors[variant] || colors.info;
  return (
    <div style={{ backgroundColor: c.bg, borderLeft: `4px solid ${c.border}`, padding: '12px 16px', marginBottom: '12px', borderRadius: '0 8px 8px 0' }}>
      {title && <strong style={{ color: c.text, display: 'block', marginBottom: '4px' }}>{title}</strong>}
      <span style={{ color: c.text }}>{message}</span>
    </div>
  );
}

// Chart Component (Placeholder)
function DefaultChart({ title, chartData }: { title?: string; chartData?: any[] }) {
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', marginBottom: '12px' }}>
      {title && <h3 style={{ margin: '0 0 12px', fontSize: '18px', fontWeight: 600 }}>{title}</h3>}
      <div style={{ backgroundColor: '#f3f4f6', padding: '20px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
        [Chart Visualization Placeholder]<br/>
        {chartData ? `${chartData.length} data points` : 'No data'}
      </div>
    </div>
  );
}

// Form Component
function DefaultForm({ title, description, fields, submitText = 'Submit', onAction }: any) {
  const [formData, setFormData] = React.useState<Record<string, any>>({});
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onAction) {
      onAction({
        type: 'FORM_SUBMIT',
        formData
      });
    } else {
      console.log('Form submitted:', formData);
    }
  };

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', marginBottom: '12px' }}>
      {title && <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 600 }}>{title}</h3>}
      {description && <p style={{ margin: '0 0 16px', color: '#6b7280', fontSize: '14px' }}>{description}</p>}
      <form onSubmit={handleSubmit}>
        {(fields || []).map((field: any) => (
          <div key={field.name} style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500 }}>
              {field.label} {field.required && <span style={{ color: 'red' }}>*</span>}
            </label>
            {field.type === 'textarea' ? (
              <textarea 
                name={field.name} 
                required={field.required}
                onChange={e => setFormData(d => ({ ...d, [field.name]: e.target.value }))}
                style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
              />
            ) : (
              <input 
                type={field.type} 
                name={field.name} 
                required={field.required}
                onChange={e => setFormData(d => ({ ...d, [field.name]: e.target.value }))}
                style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
              />
            )}
          </div>
        ))}
        <button 
          type="submit"
          style={{ 
            backgroundColor: '#2563eb', color: 'white', padding: '8px 16px', 
            border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' 
          }}
        >
          {submitText}
        </button>
      </form>
    </div>
  );
}

// Accordion Component
function DefaultAccordion({ items }: { items: { title: string; content: string }[] }) {
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', marginBottom: '12px', overflow: 'hidden' }}>
      {items.map((item, i) => (
        <div key={i} style={{ borderBottom: i < items.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
          <button
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            style={{ 
              width: '100%', textAlign: 'left', padding: '12px 16px', 
              background: 'white', border: 'none', cursor: 'pointer', 
              fontWeight: 500, display: 'flex', justifyContent: 'space-between'
            }}
          >
            {item.title}
            <span>{openIndex === i ? '−' : '+'}</span>
          </button>
          {openIndex === i && (
            <div style={{ padding: '12px 16px', backgroundColor: '#f9fafb', fontSize: '14px', borderTop: '1px solid #e5e7eb' }}>
              {item.content}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Code Block Component
function DefaultCodeBlock({ code, language, filename }: { code: string; language?: string; filename?: string }) {
  const [copied, setCopied] = React.useState(false);
  
  return (
    <div style={{ backgroundColor: '#1f2937', color: '#f3f4f6', borderRadius: '8px', overflow: 'hidden', marginBottom: '12px', fontSize: '13px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: '#111827', borderBottom: '1px solid #374151' }}>
        <span style={{ color: '#9ca3af' }}>{filename || language || 'code'}</span>
        <button 
          onClick={() => {
            navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '12px' }}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div style={{ padding: '16px', overflowX: 'auto' }}>
        <pre style={{ margin: 0, fontFamily: 'monospace' }}>{code}</pre>
      </div>
    </div>
  );
}

// Confirmation Dialog Component
function DefaultConfirmation({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', variant, data, onAction }: any) {
  const handleConfirm = () => {
     if (onAction) onAction({
       type: 'CONFIRM',
       data: data || {}
     });
  };

  const isDanger = variant === 'danger';

  return (
     <div style={{ border: `1px solid ${isDanger ? '#fca5a5' : '#e5e7eb'}`, borderRadius: '8px', padding: '16px', marginBottom: '12px', backgroundColor: isDanger ? '#fef2f2' : 'white' }}>
       <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 600, color: isDanger ? '#991b1b' : 'inherit' }}>{title}</h3>
       <p style={{ margin: '0 0 16px', color: '#4b5563' }}>{message}</p>
       <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
         <button style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '4px', background: 'white', cursor: 'pointer' }}>
           {cancelText}
         </button>
         <button 
            onClick={handleConfirm}
            style={{ 
              padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer', color: 'white',
              backgroundColor: isDanger ? '#dc2626' : '#2563eb' 
            }}
         >
           {confirmText}
         </button>
       </div>
     </div>
  )
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
  chart: DefaultChart,
  form: DefaultForm,
  accordion: DefaultAccordion,
  code: DefaultCodeBlock,
  confirmation: DefaultConfirmation,
};

interface DynamicComponentProps {
  block: ComponentBlock;
  registry?: Record<string, React.ComponentType<any>>;
  onAction?: (action: any) => void;
}

/**
 * DynamicComponent - Renders a component based on componentType.
 */
export function DynamicComponent({ block, registry = defaultComponentRegistry, onAction }: DynamicComponentProps) {
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

  // Pass onAction to the component
  return <Component {...props} onAction={onAction} />;
}
