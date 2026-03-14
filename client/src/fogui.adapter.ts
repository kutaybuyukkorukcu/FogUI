import { Adapter } from '@fogui/react';
import React from 'react';

// A simple, unstyled adapter for demo purposes.
// It uses basic HTML elements to render the components.

const Card: React.FC<any> = ({ title, description, children }) => (
  <div style={{ border: '1px solid #ddd', padding: '16px', margin: '8px 0', borderRadius: '8px' }}>
    {title && <h3 style={{ marginTop: 0 }}>{title}</h3>}
    {description && <p>{description}</p>}
    <div>{children}</div>
  </div>
);

const Table: React.FC<any> = ({ headers, rows }) => (
  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
    <thead>
      <tr>
        {headers.map((h: string) => <th key={h} style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>{h}</th>)}
      </tr>
    </thead>
    <tbody>
      {rows.map((row: any[], i: number) => (
        <tr key={i}>
          {row.map((cell, j) => <td key={j} style={{ border: '1px solid #ddd', padding: '8px' }}>{cell}</td>)}
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
const Input: React.FC<any> = (props) => <input {...props} />;
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
const Badge: React.FC<any> = ({ label, ...props }) => <span {...props} style={{ background: '#eee', padding: '4px 8px', borderRadius: '12px' }}>{label}</span>;
const Tabs: React.FC<any> = ({ children }) => <div>{children}</div>; // Simplified for demo
const TabPane: React.FC<any> = ({ title, children }) => <details><summary>{title}</summary>{children}</details>;


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
    TabPane,
  },
  mapProps: (type, props) => {
    // No prop mapping needed for this basic adapter
    return props;
  }
};
