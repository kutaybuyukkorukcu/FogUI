/**
 * Shadcn/Radix UI Adapter for FogUI
 * 
 * This adapter creates a component registry that maps FogUI component types
 * to Shadcn UI components. Since Shadcn components are copied into your project
 * (not installed from npm), you pass your components to createShadcnAdapter().
 * 
 * @example
 * ```tsx
 * import { FogUIProvider } from '@fogui/react';
 * import { createShadcnAdapter } from '@fogui/react/adapters';
 * 
 * // Import YOUR Shadcn components
 * import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
 * import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
 * import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
 * 
 * const components = createShadcnAdapter({
 *   Card, CardHeader, CardContent, CardTitle, CardDescription,
 *   Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
 *   Alert, AlertTitle, AlertDescription,
 * });
 * 
 * function App() {
 *   return (
 *     <FogUIProvider apiKey="fog_xxx" components={components}>
 *       <Chat />
 *     </FogUIProvider>
 *   );
 * }
 * ```
 */

import React from 'react';
import type { ComponentRegistry, CardProps, ListProps, TableProps, CalloutProps } from '../components/ComponentRegistry';

/**
 * The Shadcn components you need to provide.
 * All are optional - only provide what you have installed.
 */
export interface ShadcnComponents {
  // Card components
  Card?: React.ComponentType<any>;
  CardHeader?: React.ComponentType<any>;
  CardContent?: React.ComponentType<any>;
  CardTitle?: React.ComponentType<any>;
  CardDescription?: React.ComponentType<any>;
  CardFooter?: React.ComponentType<any>;
  
  // Table components
  Table?: React.ComponentType<any>;
  TableHeader?: React.ComponentType<any>;
  TableBody?: React.ComponentType<any>;
  TableRow?: React.ComponentType<any>;
  TableHead?: React.ComponentType<any>;
  TableCell?: React.ComponentType<any>;
  
  // Alert components (for callouts)
  Alert?: React.ComponentType<any>;
  AlertTitle?: React.ComponentType<any>;
  AlertDescription?: React.ComponentType<any>;
  
  // Badge (for tags/labels)
  Badge?: React.ComponentType<any>;
  
  // Scroll area (for lists)
  ScrollArea?: React.ComponentType<any>;
}

/**
 * Creates a FogUI component registry from Shadcn components.
 * 
 * @param components - Your Shadcn UI components
 * @returns A ComponentRegistry for use with FogUIProvider
 */
export function createShadcnAdapter(components: ShadcnComponents): ComponentRegistry {
  const {
    Card,
    CardHeader,
    CardContent,
    CardTitle,
    CardDescription,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    Alert,
    AlertTitle,
    AlertDescription,
    ScrollArea,
  } = components;

  const registry: ComponentRegistry = {};

  // Card component
  if (Card) {
    registry.card = ({ title, description, data }: CardProps) => {
      return React.createElement(Card, { className: 'mb-4' },
        (title || description) && React.createElement(CardHeader || 'div', null,
          title && React.createElement(CardTitle || 'h3', null, title),
          description && React.createElement(CardDescription || 'p', null, description)
        ),
        data && React.createElement(CardContent || 'div', null,
          React.createElement('dl', { className: 'grid gap-2' },
            Object.entries(data).map(([key, value]) =>
              React.createElement('div', { key, className: 'flex justify-between' },
                React.createElement('dt', { className: 'text-muted-foreground' }, key),
                React.createElement('dd', { className: 'font-medium' }, String(value))
              )
            )
          )
        )
      );
    };
  }

  // Table component
  if (Table && TableHeader && TableBody && TableRow && TableHead && TableCell) {
    registry.table = ({ columns, rows, title }: TableProps) => {
      const tableContent = React.createElement(Table, null,
        React.createElement(TableHeader, null,
          React.createElement(TableRow, null,
            columns.map((col) => React.createElement(TableHead, { key: col }, col))
          )
        ),
        React.createElement(TableBody, null,
          rows.map((row, i) =>
            React.createElement(TableRow, { key: i },
              columns.map((col) =>
                React.createElement(TableCell, { key: col }, String(row[col] ?? ''))
              )
            )
          )
        )
      );

      if (title) {
        return React.createElement('div', { className: 'mb-4' },
          React.createElement('h3', { className: 'text-lg font-semibold mb-2' }, title),
          tableContent
        );
      }

      return tableContent;
    };
  }

  // List component
  registry.list = ({ title, items, ordered }: ListProps) => {
    const ListTag = ordered ? 'ol' : 'ul';
    const listContent = React.createElement(ListTag, { className: ordered ? 'list-decimal pl-5' : 'list-disc pl-5' },
      items.map((item, i) =>
        React.createElement('li', { key: i, className: 'mb-1' },
          typeof item === 'object' ? JSON.stringify(item) : String(item)
        )
      )
    );

    const content = title
      ? React.createElement('div', { className: 'mb-4' },
          React.createElement('h3', { className: 'text-lg font-semibold mb-2' }, title),
          listContent
        )
      : listContent;

    return ScrollArea
      ? React.createElement(ScrollArea, { className: 'max-h-64' }, content)
      : content;
  };

  // Callout/Alert component
  if (Alert) {
    registry.callout = ({ title, message, variant = 'info' }: CalloutProps) => {
      // Map FogUI variants to Shadcn Alert variants
      const alertVariant = variant === 'error' || variant === 'warning' ? 'destructive' : 'default';
      
      return React.createElement(Alert, { variant: alertVariant, className: 'mb-4' },
        title && React.createElement(AlertTitle || 'h4', null, title),
        React.createElement(AlertDescription || 'p', null, message)
      );
    };
  }

  return registry;
}
