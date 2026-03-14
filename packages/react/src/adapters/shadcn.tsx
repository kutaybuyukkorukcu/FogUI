import React from 'react';
import { createAdapter } from '../utils';

// MVP: Only support shadcn/tailwind primitives, no dynamic className interpolation

const Button: React.FC<any> = ({ children, ...props }) => {
  return (
    <button
      className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
      {...props}
    >
      {children}
    </button>
  );
};

const Card: React.FC<any> = ({ children, title, description }) => {
  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="flex flex-col space-y-1.5 p-6">
        {title && (
          <h3 className="text-2xl font-semibold leading-none tracking-tight">{title}</h3>
        )}
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="p-6 pt-0">{children}</div>
    </div>
  );
};

const Input: React.FC<any> = (props) => {
  return (
    <input
      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      {...props}
    />
  );
};

const Badge: React.FC<any> = ({ children, ...props }) => {
  return (
    <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2" {...props}>
      {children}
    </div>
  );
};

const Table: React.FC<any> = ({ headers, rows }) => {
    return (
      <div className="relative w-full overflow-auto">
        <table className="w-full caption-bottom text-sm">
          <thead className="[&_tr]:border-b">
            <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
              {headers.map((header: string) => (
                <th key={header} className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {rows.map((row: any[]) => (
              <tr key={JSON.stringify(row)} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                {row.map((cell: any) => (
                  <td key={typeof cell === 'string' ? cell : JSON.stringify(cell)} className="p-4 align-middle [&:has([role=checkbox])]:pr-0">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
};

const List: React.FC<any> = ({ items, ordered }) => {
    const ListEl = ordered ? 'ol' : 'ul';
    return (
      <ListEl className={`my-6 ml-6 ${ordered ? 'list-decimal' : 'list-disc'} [&>li]:mt-2`}>
        {items.map((item: string) => (
          <li key={typeof item === 'string' ? item : JSON.stringify(item)}>{item}</li>
        ))}
      </ListEl>
    );
};

const Form: React.FC<any> = ({ children, ...props }) => {
    return (
        <form {...props}>{children}</form>
    );
};

// Tailwind JIT-safe class mappings
const gapClasses: Record<number, string> = {
  2: 'gap-2',
  4: 'gap-4',
  6: 'gap-6',
  8: 'gap-8',
  10: 'gap-10',
};

const gridColClasses: Record<number, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
};

const Stack: React.FC<any> = ({ children, direction = 'vertical', gap = 4, ...props }) => {
  return (
    <div
      className={`flex ${direction === 'horizontal' ? 'flex-row' : 'flex-col'} ${gapClasses[gap] || 'gap-4'}`}
      {...props}
    >
      {children}
    </div>
  );
};

const Grid: React.FC<any> = ({ children, columns = 2, gap = 4, ...props }) => {
  return (
    <div
      className={`grid ${(gridColClasses[columns] || 'grid-cols-2')} ${(gapClasses[gap] || 'gap-4')}`}
      {...props}
    >
      {children}
    </div>
  );
};

const Tabs: React.FC<any> = ({ children, ...props }) => {
    return (
        <div {...props}>
            {/* This is a simplified version. A real implementation would need a more complex state management for tabs. */}
            {children}
        </div>
    );
};



export const shadcnAdapter = createAdapter({
  components: {
    Button,
    Card,
    Input,
    Badge,
    Table,
    List,
    Form,
    Stack,
    Grid,
    Tabs,
  },
});
