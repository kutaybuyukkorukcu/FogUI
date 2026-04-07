import React from 'react';
import { createAdapter } from '../utils';

function stringifyValue(value: unknown): string {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }

    return JSON.stringify(value);
}

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

function resolveColumns(columns: unknown, fallback = 2): number {
    if (typeof columns === 'number' && Number.isInteger(columns) && columns > 0) {
        return columns;
    }

    if (typeof columns === 'string') {
        const parsedColumns = Number(columns);
        if (Number.isInteger(parsedColumns) && parsedColumns > 0) {
            return parsedColumns;
        }
    }

    return fallback;
}

const Button: React.FC<any> = ({ children, label, onAction, ...props }) => (
    <button type="button" onClick={() => onAction?.('click')} {...props}>{children ?? label}</button>
);

const Card: React.FC<any> = ({ children, description, title, onAction, ...props }) => (
    <section {...props}>
        {title ? <h3>{title}</h3> : null}
        {description ? <p>{description}</p> : null}
        {children}
    </section>
);

const Input: React.FC<any> = ({ label, onAction, ...props }) => (
    <label>
        {label ? <span>{label}</span> : null}
        <input {...props} />
    </label>
);

const Badge: React.FC<any> = ({ children, label, ...props }) => <div {...props}>{children ?? label}</div>;

const Stack: React.FC<any> = ({ children, direction = 'vertical', gap = 8, style, onAction, ...props }) => (
    <div
        {...props}
        style={{
            display: 'flex',
            flexDirection: direction === 'horizontal' ? 'row' : 'column',
            gap: resolveGap(gap),
            ...style,
        }}
    >
        {children}
    </div>
);

const Grid: React.FC<any> = ({ children, columns = 2, gap = 8, style, ...props }) => (
    <div
        {...props}
        style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${resolveColumns(columns)}, minmax(0, 1fr))`,
            gap: resolveGap(gap),
            ...style,
        }}
    >
        {children}
    </div>
);

const Container: React.FC<any> = ({ children, layout = 'stack', columns = 2, gap = 8, style, ...props }) => {
    const normalizedLayout = typeof layout === 'string' ? layout.toLowerCase() : 'stack';

    if (normalizedLayout === 'grid') {
        return (
            <Grid {...props} columns={resolveColumns(columns)} gap={resolveGap(gap)} style={style}>
                {children}
            </Grid>
        );
    }

    return (
        <Stack {...props} gap={resolveGap(gap)} style={style}>
            {children}
        </Stack>
    );
};

const Table: React.FC<any> = ({ headers = [], rows = [] }) => (
    <table>
        <thead>
            <tr>{headers.map((header: string) => <th key={header}>{header}</th>)}</tr>
        </thead>
        <tbody>
            {rows.map((row: unknown[], rowIndex: number) => (
                <tr key={`${rowIndex}-${JSON.stringify(row)}`}>
                    {row.map((cell, cellIndex) => <td key={`${rowIndex}-${cellIndex}`}>{stringifyValue(cell)}</td>)}
                </tr>
            ))}
        </tbody>
    </table>
);

const List: React.FC<any> = ({ items = [], ordered = false }) => {
    const ListElement = ordered ? 'ol' : 'ul';
    return (
        <ListElement>
            {items.map((item: unknown, index: number) => (
                <li key={`${index}-${stringifyValue(item)}`}>{stringifyValue(item)}</li>
            ))}
        </ListElement>
    );
};

const Form: React.FC<any> = ({ children, ...props }) => <form {...props}>{children}</form>;
const Tabs: React.FC<any> = ({ children, ...props }) => <div {...props}>{children}</div>;

export const headlessAdapter = createAdapter({
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
    },
});
