import React from 'react';
import { createAdapter } from '../utils';

function stringifyValue(value: unknown): string {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }

    return JSON.stringify(value);
}

const Button: React.FC<any> = ({ children, label, ...props }) => (
    <button type="button" {...props}>{children ?? label}</button>
);

const Card: React.FC<any> = ({ children, description, title, ...props }) => (
    <section {...props}>
        {title ? <h3>{title}</h3> : null}
        {description ? <p>{description}</p> : null}
        {children}
    </section>
);

const Input: React.FC<any> = ({ label, ...props }) => (
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
            gap,
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
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            gap,
            ...style,
        }}
    >
        {children}
    </div>
);

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
        Form,
        Grid,
        Input,
        List,
        Stack,
        Table,
        Tabs,
    },
});
