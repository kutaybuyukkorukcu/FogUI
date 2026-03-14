// src/fogui.adapter.ts
import { createAdapter, Adapter } from '@fogui/react';

// --- IMPORTANT ---
// You may need to adjust these import paths to match your project structure.
import {
  Card, CardHeader, CardContent, CardTitle, CardDescription,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  Badge,
  Button,
  Input,
} from '{{- componentsPath -}}'; // This is an assumed path

// This is a basic adapter. You can customize it to map props or handle variants.
export const adapter: Adapter = createAdapter({
  components: {
    // Mapping FogUI's 'Card' to your Shadcn 'Card'
    Card: (props) => (
      <Card>
        <CardHeader>
          {props.title && <CardTitle>{props.title}</CardTitle>}
          {props.description && <CardDescription>{props.description}</CardDescription>}
        </CardHeader>
        <CardContent>
          {props.children}
        </CardContent>
      </Card>
    ),

    // Mapping FogUI's 'Table' to your Shadcn 'Table'
    Table: ({ headers, rows }) => (
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((header: string) => <TableHead key={header}>{header}</TableHead>)}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row: any[], i: number) => (
            <TableRow key={i}>
              {row.map((cell, j) => <TableCell key={j}>{cell}</TableCell>)}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    ),

    // Add other component mappings here...
    Badge,
    Button,
    Input,
  },
});
