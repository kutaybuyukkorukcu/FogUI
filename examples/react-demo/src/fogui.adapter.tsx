import { Adapter } from '@fogui/react';
import React from 'react';

// A simple, unstyled adapter for demo purposes.
// It uses basic HTML elements to render the components.

const Card: React.FC<any> = ({ title, description, data, children }) => (
  <div style={{
    border: '1px solid rgba(124, 220, 244, 0.3)',
    background: 'rgba(8, 26, 39, 0.82)',
    padding: '18px',
    margin: '8px 0',
    borderRadius: '12px',
  }}>
    {title && <h3 style={{ marginTop: 0, marginBottom: '6px', color: 'var(--text-strong)' }}>{title}</h3>}
    {description && <p style={{ color: 'var(--text-dim)', marginTop: 0 }}>{description}</p>}
    {data && typeof data === 'object' && (
      <div style={{ marginBottom: children ? '10px' : 0 }}>
        {Object.entries(data).map(([key, value]) => (
          <div key={key} style={{ color: 'var(--text)', fontSize: '0.92rem', margin: '2px 0' }}>
            <strong style={{ color: 'var(--text-strong)' }}>{key}:</strong> {String(value)}
          </div>
        ))}
      </div>
    )}
    <div>{children}</div>
  </div>
);

const Table: React.FC<any> = ({ headers, rows }) => (
  <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text)' }}>
    <thead>
      <tr>
        {headers.map((h: string) => <th key={h} style={{ border: '1px solid rgba(124, 220, 244, 0.35)', padding: '8px', textAlign: 'left', color: 'var(--text-strong)' }}>{h}</th>)}
      </tr>
    </thead>
    <tbody>
      {rows.map((row: any[], i: number) => (
        <tr key={i}>
          {row.map((cell, j) => <td key={j} style={{ border: '1px solid rgba(124, 220, 244, 0.25)', padding: '8px', color: 'var(--text)' }}>{cell}</td>)}
        </tr>
      ))}
    </tbody>
  </table>
);

const List: React.FC<any> = ({ items, ordered }) => {
  const ListEl = ordered ? 'ol' : 'ul';
  return (
    <ListEl>
      {items.map((item: string, i: number) => <li key={i}>{item}</li>)}
    </ListEl>
  );
};

const Button: React.FC<any> = ({ label, ...props }) => <button {...props}>{label}</button>;
const Input: React.FC<any> = (props) => (
  <input
    {...props}
    style={{
      width: '100%',
      padding: '9px 10px',
      borderRadius: '8px',
      border: '1px solid rgba(124, 220, 244, 0.35)',
      background: 'rgba(2, 17, 26, 0.7)',
      color: 'var(--text-strong)',
      outline: 'none',
    }}
  />
);
const Form: React.FC<any> = ({ children, ...props }) => <form {...props}>{children}</form>;
const Stack: React.FC<any> = ({ children, direction = 'vertical', gap = 8, ...props }) => (
    <div style={{ display: 'flex', flexDirection: direction === 'horizontal' ? 'row' : 'column', gap: `${gap}px` }} {...props}>
        {children}
    </div>
);
const Grid: React.FC<any> = ({ children, columns = 2, gap = 8, ...props }) => (
  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: `${gap}px` }} {...props}>
      {children}
  </div>
);
const Badge: React.FC<any> = ({ label, ...props }) => (
  <span
    {...props}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      background: 'rgba(81, 213, 243, 0.16)',
      border: '1px solid rgba(81, 213, 243, 0.4)',
      color: 'var(--text-strong)',
      padding: '5px 10px',
      borderRadius: '999px',
      fontWeight: 700,
      fontSize: '0.87rem',
    }}
  >
    {label}
  </span>
);
const Tabs: React.FC<any> = ({ children }) => <div>{children}</div>; // Simplified for demo
const resolveGap = (gap: unknown): string => {
  if (typeof gap === 'number') {
    return `${gap}px`;
  }

  if (gap === 'sm') {
    return '8px';
  }

  if (gap === 'md') {
    return '12px';
  }

  if (gap === 'lg') {
    return '16px';
  }

  return typeof gap === 'string' && gap.length > 0 ? gap : '8px';
};

const Container: React.FC<any> = ({ children, layout = 'stack', columns = 1, gap = 8, style, ...props }) => {
  const gapValue = resolveGap(gap);
  const baseStyle = layout === 'grid'
    ? {
        display: 'grid',
        gridTemplateColumns: `repeat(${Number(columns) || 1}, minmax(0, 1fr))`,
        gap: gapValue,
      }
    : {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: gapValue,
      };

  return <div style={{ ...baseStyle, ...style }} {...props}>{children}</div>;
};

const componentRegistry: Record<string, React.ComponentType<any>> = {
  Card,
  Table,
  List,
  Button,
  Input,
  Form,
  Stack,
  Grid,
  Badge,
  Tabs,
  Container,
};

const lowercaseAliases = Object.fromEntries(
  Object.entries(componentRegistry).map(([name, component]) => [name.toLowerCase(), component])
);


export const demoAdapter: Adapter = {
  components: {
    ...componentRegistry,
    ...lowercaseAliases,
  },
  mapProps: (_componentType, props) => {
    // No prop mapping needed for this basic adapter
    return props;
  }
};
