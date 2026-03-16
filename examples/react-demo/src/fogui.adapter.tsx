import { Adapter } from '@fogui/react';
import React from 'react';

// A simple, unstyled adapter for demo purposes.
// It uses basic HTML elements to render the components.

const Card: React.FC<any> = ({ title, description, children }) => (
  <div style={{
    border: '1px solid rgba(124, 220, 244, 0.3)',
    background: 'rgba(8, 26, 39, 0.82)',
    padding: '18px',
    margin: '8px 0',
    borderRadius: '12px',
  }}>
    {title && <h3 style={{ marginTop: 0, marginBottom: '6px', color: 'var(--text-strong)' }}>{title}</h3>}
    {description && <p style={{ color: 'var(--text-dim)', marginTop: 0 }}>{description}</p>}
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


export const demoAdapter: Adapter = {
  components: {
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
  },
  mapProps: (_componentType, props) => {
    // No prop mapping needed for this basic adapter
    return props;
  }
};
