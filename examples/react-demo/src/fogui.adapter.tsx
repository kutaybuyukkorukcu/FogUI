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

const Table: React.FC<any> = (props) => {
  // Support both 'headers' or 'columns' for column names
  const columns = props.headers || props.columns || [];
  let rows = props.rows || [];

  // If rows are array of objects, convert to array of arrays using columns order
  if (Array.isArray(rows) && rows.length > 0 && typeof rows[0] === 'object' && !Array.isArray(rows[0])) {
    rows = rows.map((rowObj: Record<string, unknown>) => columns.map((col: string) => rowObj[col]));
  }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text)' }}>
      <thead>
        <tr>
          {columns.map((h: string) => <th key={h} style={{ border: '1px solid rgba(124, 220, 244, 0.35)', padding: '8px', textAlign: 'left', color: 'var(--text-strong)' }}>{h}</th>)}
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
};

const List: React.FC<any> = ({ items, ordered, title, layout }) => {
  const safeItems = Array.isArray(items) ? items : [];
  const ListEl = ordered ? 'ol' : 'ul';
  const isCompact = layout === 'compact';

  return (
    <div>
      {typeof title === 'string' && title.length > 0 && (
        <h4 style={{ margin: '0 0 8px', color: 'var(--text-strong)' }}>{title}</h4>
      )}
      <ListEl style={{ margin: 0, paddingLeft: ordered ? '20px' : '18px', display: 'grid', gap: isCompact ? '6px' : '10px' }}>
        {safeItems.map((item: any, i: number) => {
          if (item == null) {
            return <li key={i} style={{ color: 'var(--text-dim)' }}>-</li>;
          }

          if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
            return <li key={i}>{String(item)}</li>;
          }

          if (typeof item === 'object') {
            const label = typeof item.label === 'string' ? item.label : undefined;
            const value = item.value != null ? String(item.value) : undefined;
            const type = typeof item.type === 'string' ? item.type : undefined;
            const variant = typeof item.variant === 'string' ? item.variant : undefined;
            const variantBg: Record<string, string> = {
              success: 'rgba(102, 235, 177, 0.18)',
              info: 'rgba(120, 199, 255, 0.18)',
              warning: 'rgba(255, 205, 106, 0.2)',
            };
            const variantBorder: Record<string, string> = {
              success: 'rgba(102, 235, 177, 0.55)',
              info: 'rgba(120, 199, 255, 0.55)',
              warning: 'rgba(255, 205, 106, 0.55)',
            };

            if (type === 'badge') {
              return (
                <li key={i} style={{ listStyle: 'none', marginLeft: '-18px' }}>
                  <span style={{ color: 'var(--text-dim)', marginRight: '8px' }}>{label ?? `Item ${i + 1}`}</span>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '4px 10px',
                      borderRadius: '999px',
                      border: `1px solid ${variant ? variantBorder[variant] ?? 'rgba(81, 213, 243, 0.4)' : 'rgba(81, 213, 243, 0.4)'}`,
                      background: variant ? variantBg[variant] ?? 'rgba(81, 213, 243, 0.16)' : 'rgba(81, 213, 243, 0.16)',
                      color: 'var(--text-strong)',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                    }}
                  >
                    {value ?? '-'}
                  </span>
                </li>
              );
            }

            if (label || value) {
              return (
                <li key={i}>
                  {label && <strong style={{ color: 'var(--text-strong)' }}>{label}: </strong>}
                  {value ?? '-'}
                </li>
              );
            }

            return <li key={i}>{JSON.stringify(item)}</li>;
          }

          return <li key={i}>{String(item)}</li>;
        })}
      </ListEl>
    </div>
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
const Form: React.FC<any> = ({ children, fields, inputs, submitLabel, title, description, ...props }) => {
  const normalizedFields = Array.isArray(fields)
    ? fields
    : Array.isArray(inputs)
      ? inputs
      : [];
  const hasChildren = React.Children.count(children) > 0;
  const propEntries = Object.entries(props).filter(([key]) => key !== 'style' && key !== 'children');

  return (
    <form
      {...props}
      style={{
        display: 'grid',
        gap: '10px',
        ...((props as { style?: React.CSSProperties }).style ?? {}),
      }}
    >
      {title && <h4 style={{ margin: 0, color: 'var(--text-strong)' }}>{title}</h4>}
      {description && <p style={{ margin: 0, color: 'var(--text-dim)' }}>{description}</p>}

      {hasChildren && children}

      {!hasChildren && normalizedFields.map((field: any, index: number) => {
        const label = typeof field?.label === 'string' ? field.label : undefined;
        const fieldType = typeof field?.type === 'string' ? field.type : 'text';
        const placeholder = typeof field?.placeholder === 'string'
          ? field.placeholder
          : label
            ? `Enter ${label.toLowerCase()}`
            : '';
        const name = typeof field?.name === 'string' ? field.name : `field_${index}`;

        return (
          <label key={`${name}-${index}`} style={{ display: 'grid', gap: '4px', color: 'var(--text)' }}>
            {label && <span style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }}>{label}</span>}
            <Input name={name} type={fieldType} placeholder={placeholder} />
          </label>
        );
      })}

      {!hasChildren && normalizedFields.length > 0 && (
        <Button type="submit" label={typeof submitLabel === 'string' ? submitLabel : 'Submit'} />
      )}

      {!hasChildren && normalizedFields.length === 0 && (
        <div style={{
          border: '1px dashed rgba(124, 220, 244, 0.35)',
          borderRadius: '8px',
          padding: '10px',
          color: 'var(--text-dim)',
          fontSize: '0.88rem',
        }}>
          <div style={{ marginBottom: '4px', color: 'var(--text-strong)' }}>Form payload received, but no fields/children to render.</div>
          {propEntries.length > 0 && (
            <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {JSON.stringify(Object.fromEntries(propEntries), null, 2)}
            </div>
          )}
        </div>
      )}
    </form>
  );
};
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
