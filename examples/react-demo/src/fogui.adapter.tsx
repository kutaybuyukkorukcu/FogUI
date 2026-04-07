/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import {
  createAdapter,
  getAdapterConformance,
  type AdapterFallbackProps,
} from '@fogui/react';

export const DEMO_REQUIRED_COMPONENTS = [
  'Badge',
  'Button',
  'Card',
  'Container',
  'Form',
  'Grid',
  'Input',
  'List',
  'Stack',
  'Table',
  'Tabs',
] as const;

const surfaceStyle: React.CSSProperties = {
  border: '1px solid #d5d9e2',
  borderRadius: 10,
  padding: 14,
  background: '#ffffff',
};

function resolveGap(gap: unknown, fallback = 8): number {
  if (typeof gap === 'number' && Number.isFinite(gap)) {
    return gap;
  }

  if (typeof gap === 'string') {
    const normalizedGap = gap.toLowerCase();
    if (normalizedGap === 'sm') {
      return 8;
    }
    if (normalizedGap === 'md') {
      return 12;
    }
    if (normalizedGap === 'lg') {
      return 16;
    }

    const parsedGap = Number(normalizedGap);
    if (Number.isFinite(parsedGap)) {
      return parsedGap;
    }
  }

  return fallback;
}

function resolveColumns(columns: unknown): number | null {
  if (typeof columns === 'number' && Number.isInteger(columns) && columns > 0) {
    return columns;
  }

  if (typeof columns === 'string') {
    const parsedColumns = Number(columns);
    if (Number.isInteger(parsedColumns) && parsedColumns > 0) {
      return parsedColumns;
    }
  }

  return null;
}

function stringifyValue(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return JSON.stringify(value);
}

const Card = ({ title, description, children }: { title?: string; description?: string; children?: React.ReactNode }) => (
  <section style={{ ...surfaceStyle, marginBottom: 10 }}>
    {title ? <h3 style={{ margin: '0 0 6px', fontSize: '1rem' }}>{title}</h3> : null}
    {description ? <p style={{ margin: '0 0 10px', color: '#445064' }}>{description}</p> : null}
    {children}
  </section>
);

const Badge = ({ label }: { label: string }) => (
  <span
    style={{
      display: 'inline-block',
      padding: '4px 10px',
      borderRadius: 999,
      border: '1px solid #9fb4de',
      background: '#f3f7ff',
      color: '#1f2d45',
      fontSize: '0.82rem',
      fontWeight: 600,
    }}
  >
    {label}
  </span>
);

const List = ({ items = [] as unknown[] }: { items?: unknown[] }) => (
  <ul style={{ margin: 0, paddingLeft: 20 }}>
    {items.map((item, index) => (
      <li key={`${index}-${stringifyValue(item)}`} style={{ marginBottom: 4 }}>
        {stringifyValue(item)}
      </li>
    ))}
  </ul>
);

const Table = ({ headers = [] as string[], rows = [] as unknown[] }: { headers?: string[]; rows?: unknown[] }) => {
  const safeRows = Array.isArray(rows) ? rows : [];
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header} style={{ border: '1px solid #d5d9e2', padding: 8, textAlign: 'left' }}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {safeRows.map((row) => {
            let cells: unknown[];
            if (Array.isArray(row)) {
              cells = row;
            } else if (typeof row === 'object' && row != null) {
              cells = Object.values(row as Record<string, unknown>);
            } else {
              cells = [row];
            }

            const rowKey = `${stringifyValue(row)}-${cells.length}`;
            return (
              <tr key={rowKey}>
                {cells.map((cell) => (
                  <td key={`${rowKey}-${stringifyValue(cell)}`} style={{ border: '1px solid #d5d9e2', padding: 8 }}>
                    {stringifyValue(cell)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const Container = ({
  children,
  layout,
  columns,
  gap,
}: {
  children?: React.ReactNode;
  layout?: string;
  columns?: number | string;
  gap?: number | string;
}) => {
  const resolvedGap = resolveGap(gap);
  const normalizedLayout = typeof layout === 'string' ? layout.toLowerCase() : 'stack';
  const resolvedColumns = resolveColumns(columns);

  if (normalizedLayout === 'grid') {
    return (
      <div
        style={{
          display: 'grid',
          gap: resolvedGap,
          gridTemplateColumns: resolvedColumns
            ? `repeat(${resolvedColumns}, minmax(0, 1fr))`
            : 'repeat(auto-fit, minmax(180px, 1fr))',
        }}
      >
        {children}
      </div>
    );
  }

  return <div style={{ display: 'grid', gap: resolvedGap }}>{children}</div>;
};

const Stack = ({ children, gap }: { children?: React.ReactNode; gap?: number | string }) => (
  <div style={{ display: 'grid', gap: resolveGap(gap) }}>{children}</div>
);

const Grid = ({
  children,
  columns,
  gap,
}: {
  children?: React.ReactNode;
  columns?: number | string;
  gap?: number | string;
}) => (
  <div
    style={{
      display: 'grid',
      gap: resolveGap(gap),
      gridTemplateColumns: resolveColumns(columns)
        ? `repeat(${resolveColumns(columns)}, minmax(0, 1fr))`
        : 'repeat(auto-fit, minmax(180px, 1fr))',
    }}
  >
    {children}
  </div>
);

const Button = ({ label, onAction }: { label?: string; onAction?: (action: string, data?: unknown) => void }) => (
  <button
    type="button"
    onClick={() => onAction?.('button_click', { source: 'demo-renderer' })}
    style={{
      border: '1px solid #2b5fcc',
      background: '#2b5fcc',
      color: '#fff',
      borderRadius: 8,
      padding: '8px 10px',
      cursor: 'pointer',
    }}
  >
    {label ?? 'Action'}
  </button>
);

const Input = ({ placeholder }: { placeholder?: string }) => (
  <input
    placeholder={placeholder}
    style={{
      width: '100%',
      border: '1px solid #d5d9e2',
      borderRadius: 8,
      padding: '8px 10px',
      boxSizing: 'border-box',
    }}
  />
);

const Form = ({ children }: { children?: React.ReactNode }) => (
  <form style={{ display: 'grid', gap: 8 }}>{children}</form>
);

const Tabs = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;

const DemoFallback = ({
  block,
  issue,
  availableComponents,
  suggestion,
}: AdapterFallbackProps) => (
  <div
    data-testid="demo-adapter-fallback"
    style={{
      border: '1px dashed #b42318',
      borderRadius: 10,
      padding: 12,
      background: '#fff4f2',
      color: '#7a271a',
      display: 'grid',
      gap: 6,
    }}
  >
    <strong>{issue.kind === 'map-props-failed' ? 'Adapter prop mapping failed' : 'Unmapped canonical component'}</strong>
    <span>componentType={block.componentType}</span>
    <span>available={availableComponents.join(', ') || 'none'}</span>
    {suggestion ? <span>suggestion={suggestion}</span> : null}
  </div>
);

export const demoAdapter = createAdapter({
  components: {
    Card,
    Container,
    Badge,
    List,
    Table,
    Stack,
    Grid,
    Button,
    Input,
    Form,
    Tabs,
  },
  conformance: {
    requiredComponents: DEMO_REQUIRED_COMPONENTS,
  },
  renderFallback: DemoFallback,
});

export const demoAdapterConformance = getAdapterConformance(demoAdapter);

if (!demoAdapterConformance.ok) {
  throw new Error(demoAdapterConformance.issues.map((issue) => issue.message).join('\n'));
}
