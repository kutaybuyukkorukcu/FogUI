import React from 'react';
import { createAdapter } from '../providers/FogUIProvider';

const Button: React.FC<any> = ({ children, ...props }) => <button {...props}>{children}</button>;
const Card: React.FC<any> = ({ children, ...props }) => <div {...props}>{children}</div>;
const Input: React.FC<any> = (props) => <input {...props} />;
const Badge: React.FC<any> = ({ children, ...props }) => <div {...props}>{children}</div>;
const Stack: React.FC<any> = ({ children, ...props }) => <div {...props}>{children}</div>;
const Grid: React.FC<any> = ({ children, ...props }) => <div {...props}>{children}</div>;
const Table: React.FC<any> = ({ headers, rows }) => (
    <table>
        <thead>
            <tr>{headers.map((h: string) => <th key={h}>{h}</th>)}</tr>
        </thead>
        <tbody>
            {rows.map((row: any[], i: number) => (
                <tr key={i}>
                    {row.map((cell, j) => <td key={j}>{cell}</td>)}
                </tr>
            ))}
        </tbody>
    </table>
);

export const headlessAdapter = createAdapter({
    components: {
        Button,
        Card,
        Input,
        Badge,
        Stack,
        Grid,
        Table,
    },
});
