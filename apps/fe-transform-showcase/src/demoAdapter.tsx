import React, { useState } from 'react';
import {
  createAdapter,
  getAdapterConformance,
  type AdapterFallbackProps,
} from '@fogui/react';

const REQUIRED_COMPONENTS = [
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
  'TabPane',
] as const;

function stringifyValue(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (value == null) {
    return '';
  }

  return JSON.stringify(value);
}

function resolveGap(gap: unknown, fallback = 12): number {
  if (typeof gap === 'number' && Number.isFinite(gap)) {
    return gap;
  }

  if (typeof gap === 'string') {
    const normalized = gap.toLowerCase();
    if (normalized === 'sm') {
      return 10;
    }
    if (normalized === 'md') {
      return 14;
    }
    if (normalized === 'lg') {
      return 18;
    }

    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function resolveColumns(columns: unknown): number | null {
  if (typeof columns === 'number' && Number.isInteger(columns) && columns > 0) {
    return columns;
  }

  if (typeof columns === 'string') {
    const parsed = Number(columns);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}

function normalizeHeaders(headers: unknown, columns: unknown): string[] {
  if (Array.isArray(headers)) {
    return headers.map((header) => stringifyValue(header));
  }

  if (Array.isArray(columns)) {
    return columns.map((column) => {
      if (typeof column === 'string') {
        return column;
      }

      if (column && typeof column === 'object') {
        const record = column as Record<string, unknown>;
        return stringifyValue(record.header ?? record.label ?? record.key ?? record.name);
      }

      return stringifyValue(column);
    });
  }

  return [];
}

const Card = ({ title, description, children }: { title?: string; description?: string; children?: React.ReactNode }) => (
  <section className="render-card">
    {title ? <h3>{title}</h3> : null}
    {description ? <p>{description}</p> : null}
    {children ? <div className="render-card-body">{children}</div> : null}
  </section>
);

const Badge = ({ label }: { label?: string }) => (
  <span className="render-badge">{label ?? 'Badge'}</span>
);

const Button = ({ label, onAction }: { label?: string; onAction?: (action: string, data?: unknown) => void }) => (
  <button
    type="button"
    className="render-button"
    onClick={() => onAction?.('renderer.button.click', { label: label ?? 'Action' })}
  >
    {label ?? 'Action'}
  </button>
);

const Input = ({ label, placeholder }: { label?: string; placeholder?: string }) => (
  <label className="render-field">
    {label ? <span>{label}</span> : null}
    <input placeholder={placeholder ?? label ?? 'Input'} readOnly />
  </label>
);

const List = ({ items = [] as unknown[] }: { items?: unknown[] }) => (
  <ul className="render-list">
    {items.map((item, index) => (
      <li key={`${index}-${stringifyValue(item)}`}>{stringifyValue(item)}</li>
    ))}
  </ul>
);

const Stack = ({ children, gap, direction }: { children?: React.ReactNode; gap?: number | string; direction?: string }) => (
  <div
    className="render-stack"
    style={{
      gap: `${resolveGap(gap)}px`,
      gridAutoFlow: direction === 'horizontal' ? 'column' : 'row',
      gridTemplateColumns: direction === 'horizontal' ? 'repeat(auto-fit, minmax(120px, max-content))' : undefined,
    }}
  >
    {children}
  </div>
);

const Grid = ({ children, columns, gap }: { children?: React.ReactNode; columns?: number | string; gap?: number | string }) => {
  const resolvedColumns = resolveColumns(columns);
  return (
    <div
      className="render-grid"
      style={{
        gap: `${resolveGap(gap)}px`,
        gridTemplateColumns: resolvedColumns
          ? `repeat(${resolvedColumns}, minmax(0, 1fr))`
          : 'repeat(auto-fit, minmax(200px, 1fr))',
      }}
    >
      {children}
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
  const normalizedLayout = typeof layout === 'string' ? layout.toLowerCase() : 'stack';
  if (normalizedLayout === 'grid') {
    return <Grid columns={columns} gap={gap}>{children}</Grid>;
  }

  return <Stack gap={gap}>{children}</Stack>;
};

const Form = ({ children, onAction }: { children?: React.ReactNode; onAction?: (action: string, data?: unknown) => void }) => (
  <form
    className="render-form"
    onSubmit={(event) => {
      event.preventDefault();
      onAction?.('renderer.form.submit', { submitted: true });
    }}
  >
    {children}
    <div className="render-form-footer">
      <button type="submit" className="render-button">Preview Submit</button>
    </div>
  </form>
);

const Table = ({ headers = [] as string[], rows = [] as unknown[] }: { headers?: string[]; rows?: unknown[] }) => {
  const safeRows = Array.isArray(rows) ? rows : [];

  return (
    <div className="render-table-shell">
      <table className="render-table">
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {safeRows.map((row, rowIndex) => {
            const cells = Array.isArray(row)
              ? row
              : row && typeof row === 'object'
                ? Object.values(row as Record<string, unknown>)
                : [row];

            return (
              <tr key={`${rowIndex}-${cells.length}`}>
                {cells.map((cell, cellIndex) => (
                  <td key={`${rowIndex}-${cellIndex}`}>{stringifyValue(cell)}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const TabPane = ({ children }: { children?: React.ReactNode }) => (
  <div className="render-tab-panel">{children}</div>
);

const Tabs = ({ children }: { children?: React.ReactNode }) => {
  const panes = React.Children.toArray(children).filter(React.isValidElement) as React.ReactElement<{ title?: string }>[];
  const [activeIndex, setActiveIndex] = useState(0);
  const activePane = panes[activeIndex] ?? null;

  return (
    <section className="render-tabs">
      <div className="render-tab-list">
        {panes.map((pane, index) => (
          <button
            key={`${pane.props.title ?? 'Tab'}-${index}`}
            type="button"
            className={index === activeIndex ? 'render-tab-trigger is-active' : 'render-tab-trigger'}
            onClick={() => setActiveIndex(index)}
          >
            {pane.props.title ?? `Tab ${index + 1}`}
          </button>
        ))}
      </div>
      {activePane}
    </section>
  );
};

const Fallback = ({ block, issue, availableComponents, suggestion }: AdapterFallbackProps) => (
  <div className="render-fallback">
    <strong>{issue.kind === 'map-props-failed' ? 'Adapter mapProps failed' : 'Unmapped canonical component'}</strong>
    <span>componentType={block.componentType}</span>
    <span>available={availableComponents.join(', ') || 'none'}</span>
    {suggestion ? <span>suggestion={suggestion}</span> : null}
  </div>
);

export const showcaseAdapter = createAdapter({
  components: {
    Badge,
    Button,
    Card,
    Container,
    Form,
    Grid,
    Input,
    List,
    Stack,
    Table,
    Tabs,
    TabPane,
  },
  conformance: {
    requiredComponents: REQUIRED_COMPONENTS,
  },
  mapProps: ({ componentType, props }) => {
    const normalizedType = componentType.toLowerCase();

    if (normalizedType === 'badge') {
      return {
        ...props,
        label: stringifyValue(props.label ?? props.text ?? props.value ?? props.title ?? 'Badge'),
      };
    }

    if (normalizedType === 'button') {
      return {
        ...props,
        label: stringifyValue(props.label ?? props.text ?? props.title ?? 'Action'),
      };
    }

    if (normalizedType === 'card') {
      return {
        ...props,
        title: stringifyValue(props.title ?? props.heading ?? props.label ?? ''),
        description: stringifyValue(props.description ?? props.subtitle ?? props.summary ?? ''),
      };
    }

    if (normalizedType === 'input') {
      return {
        ...props,
        label: stringifyValue(props.label ?? props.name ?? ''),
        placeholder: stringifyValue(props.placeholder ?? props.label ?? props.name ?? 'Input'),
      };
    }

    if (normalizedType === 'table') {
      return {
        ...props,
        headers: normalizeHeaders(props.headers, props.columns),
        rows: Array.isArray(props.rows) ? props.rows : [],
      };
    }

    if (normalizedType === 'tabpane') {
      return {
        ...props,
        title: stringifyValue(props.title ?? props.label ?? props.name ?? 'Tab'),
      };
    }

    return props;
  },
  renderFallback: Fallback,
});

export const showcaseAdapterConformance = getAdapterConformance(showcaseAdapter);