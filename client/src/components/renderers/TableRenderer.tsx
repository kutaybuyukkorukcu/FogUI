import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

import { Table2 } from 'lucide-react';
import { useMemo } from 'react';

interface TableRendererProps {
  columns?: unknown[];
  rows?: Record<string, unknown>[];
  title?: string;
}

// Helper to safely convert column to string
const getColumnName = (col: unknown): string => {
  if (typeof col === 'string') return col;
  if (typeof col === 'object' && col !== null) {
    const obj = col as Record<string, unknown>;
    return String(obj.name ?? obj.header ?? obj.label ?? obj.key ?? JSON.stringify(col));
  }
  return String(col);
};

// Helper to safely extract cell value
const getCellValue = (cell: unknown): string => {
  if (typeof cell === 'string') return cell;
  if (typeof cell === 'object' && cell !== null && 'cell' in cell) {
    return String((cell as { cell: string }).cell);
  }
  if (typeof cell === 'object' && cell !== null) {
    const obj = cell as Record<string, unknown>;
    // Handle common patterns like {value: "..."}
    return String(obj.value ?? obj.data ?? JSON.stringify(obj));
  }
  return String(cell ?? '');
};

export const TableRenderer = ({ columns, rows, title }: TableRendererProps) => {
  // Normalize columns to strings
  const normalizedColumns = columns?.map(getColumnName) ?? [];

  // Normalize rows to a consistent format: Record<string, string>[]
  const normalizedRows: Record<string, string>[] = useMemo(() => {
    if (!rows || !normalizedColumns.length) return [];

    return rows.map(row => {
      const newRow: Record<string, string> = {};
      if (Array.isArray(row)) {
        // Handles [[{cell: "a"}], [{cell: "b"}]]
        row.forEach((cell, index) => {
          const colName = normalizedColumns[index];
          if (colName) {
            newRow[colName] = getCellValue(cell);
          }
        });
      } else if (typeof row === 'object' && row !== null) {
        // Handle {cells: ["a", "b"]}
        if ('cells' in row && Array.isArray(row.cells)) {
          row.cells.forEach((cell, index) => {
            const colName = normalizedColumns[index];
            if (colName) {
              newRow[colName] = getCellValue(cell);
            }
          });
          return newRow;
        }

        // Handles [{"col1": "a", "col2": "b"}]
        return Object.fromEntries(
          Object.entries(row).map(([key, value]) => [key, getCellValue(value)])
        ) as Record<string, string>;
      }
      return newRow;
    });
  }, [rows, normalizedColumns]);
  
  // If no columns provided, derive from first row
  const effectiveColumns = normalizedColumns.length > 0 
    ? normalizedColumns 
    : (normalizedRows?.[0] ? Object.keys(normalizedRows[0]) : []);

  if (!normalizedRows || normalizedRows.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <p className="text-muted-foreground">No table data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Table2 className="h-5 w-5" />
          {title ?? 'Data Table'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                {effectiveColumns.map((col, idx) => (
                  <th key={`${col}-${idx}`} className="p-3 text-left text-sm font-semibold">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {normalizedRows.map((row, index) => {
                // Use a combination of fields for key, fallback to index
                const rowKey = row.product || row.Product || row.id || row.Id || index;
                return (
                  <tr key={`${rowKey}-${index}`} className="border-b hover:bg-muted/50">
                    {effectiveColumns.map((col, colIdx) => {
                      // Map column names to row keys (case-insensitive)
                      const colLower = col.toLowerCase();
                      const value = row[colLower] ?? row[col] ?? '';
                      
                      // Format amount as currency (handle strings like "$120.00")
                      const isAmount = colLower.includes('amount') || colLower.includes('price') || colLower.includes('cost');
                      let displayValue = value;

                      if (isAmount) {
                        const numericValue = parseFloat(String(value).replace(/[^0-9.-]+/g,""));
                        if (!isNaN(numericValue)) {
                          displayValue = `$${numericValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                        }
                      }
                      
                      return (
                        <td 
                          key={`${col}-${colIdx}`} 
                          className={`p-3 text-sm ${isAmount ? 'text-right font-semibold' : ''}`}
                        >
                          {displayValue}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Calculate total if there's an amount column */}
        {effectiveColumns.some(col => col.toLowerCase().includes('amount')) && (
          <div className="mt-4 flex items-center justify-between rounded-lg border p-3 bg-muted/30">
            <span className="text-sm font-medium">Total</span>
            <span className="text-lg font-bold">
              ${normalizedRows.reduce((sum, row) => {
                const amountCol = effectiveColumns.find(c => c.toLowerCase().includes('amount'));
                const cellValue = amountCol ? (row[amountCol] ?? '0') : '0';
                const amount = parseFloat(String(cellValue).replace(/[^0-9.-]+/g,""));
                return sum + (isNaN(amount) ? 0 : amount);
              }, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
