/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import { createAdapter } from '@fogui/react';

const surfaceStyle: React.CSSProperties = {
  border: '1px solid #d5d9e2',
  borderRadius: 10,
  padding: 14,
  background: '#ffffff',
};

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
      <li key={`${index}-${String(item)}`} style={{ marginBottom: 4 }}>
        {typeof item === 'string' || typeof item === 'number' ? String(item) : JSON.stringify(item)}
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
          {safeRows.map((row, rowIndex) => {
            const cells = Array.isArray(row)
              ? row
              : typeof row === 'object' && row != null
                ? Object.values(row as Record<string, unknown>)
                : [row];
            return (
              <tr key={rowIndex}>
                {cells.map((cell, cellIndex) => (
                  <td key={`${rowIndex}-${cellIndex}`} style={{ border: '1px solid #d5d9e2', padding: 8 }}>
                    {typeof cell === 'string' || typeof cell === 'number' ? String(cell) : JSON.stringify(cell)}
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

const Stack = ({ children }: { children?: React.ReactNode }) => (
  <div style={{ display: 'grid', gap: 10 }}>{children}</div>
);

const Grid = ({ children }: { children?: React.ReactNode }) => (
  <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))' }}>{children}</div>
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

export const demoAdapter = createAdapter({
  components: {
    Card,
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
});
