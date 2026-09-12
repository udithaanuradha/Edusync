import React from 'react';
import styles from './DataTable.module.css';

export interface DataTableColumn<T> {
  key: string;
  header: React.ReactNode;
  render?: (row: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string | number;
  emptyMessage?: string;
}

/**
 * Generic, column-config-driven table for all 5 roles — replaces the
 * hand-rolled <table> markup previously duplicated across LoginTable.tsx,
 * GradebookTable.tsx, the mentor dashboard's inline table, and the various
 * report-panel tables, each with their own styling.
 */
function DataTable<T>({ columns, rows, rowKey, emptyMessage = 'No data available.' }: DataTableProps<T>) {
  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={styles.headerCell}
                style={{ textAlign: col.align ?? 'left', width: col.width }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className={styles.emptyCell}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={rowKey(row, index)} className={styles.row}>
                {columns.map((col) => (
                  <td key={col.key} className={styles.cell} style={{ textAlign: col.align ?? 'left' }}>
                    {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
