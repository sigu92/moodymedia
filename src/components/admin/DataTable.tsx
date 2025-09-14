import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronUp, ChevronDown, Download, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Column<T> {
  key: keyof T;
  header: string;
  sortable?: boolean;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  selectable?: boolean;
  selectedRows?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  pagination?: {
    page: number;
    limit: number;
    total_pages: number;
    total_items: number;
  };
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (field: string, direction: 'asc' | 'desc') => void;
  onExport?: () => void;
  emptyMessage?: string;
}

export function DataTable<T>({
  data,
  columns,
  loading = false,
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  pagination,
  onPageChange,
  onLimitChange,
  sortField,
  sortDirection,
  onSort,
  onExport,
  emptyMessage = "No data available",
}: DataTableProps<T>) {
  const [localSortField, setLocalSortField] = useState(sortField);
  const [localSortDirection, setLocalSortDirection] = useState<'asc' | 'desc'>(sortDirection || 'asc');

  const handleSort = (columnKey: string) => {
    const newDirection = localSortField === columnKey && localSortDirection === 'asc' ? 'desc' : 'asc';
    setLocalSortField(columnKey);
    setLocalSortDirection(newDirection);
    onSort?.(columnKey, newDirection);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange?.(data.map((row: T) => String((row as { id?: string | number }).id || Math.random())));
    } else {
      onSelectionChange?.([]);
    }
  };

  const handleSelectRow = (rowId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange?.([...selectedRows, rowId]);
    } else {
      onSelectionChange?.(selectedRows.filter(id => id !== rowId));
    }
  };

  const getSortIcon = (columnKey: string) => {
    if (localSortField !== columnKey) return null;
    return localSortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
  };

  const isAllSelected = data.length > 0 && selectedRows.length === data.length;
  const isPartiallySelected = selectedRows.length > 0 && selectedRows.length < data.length;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {pagination && (
            <>
              <div className="text-sm text-muted-foreground">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total_items)} of {pagination.total_items} results
              </div>
              <Select value={pagination.limit.toString()} onValueChange={(value) => onLimitChange?.(parseInt(value))}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}
        </div>
        {onExport && (
          <Button variant="outline" onClick={onExport} size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="glass-card rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {selectable && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
              )}
              {columns.map((column) => (
                <TableHead key={String(column.key)} className={cn(column.sortable && "cursor-pointer select-none")}>
                  <div 
                    className="flex items-center gap-2"
                    onClick={() => column.sortable && handleSort(String(column.key))}
                  >
                    {column.header}
                    {column.sortable && getSortIcon(String(column.key))}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  {selectable && <TableCell><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>}
                  {columns.map((column) => (
                    <TableCell key={String(column.key)}>
                      <div className="h-4 bg-muted animate-pulse rounded" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + (selectable ? 1 : 0)} className="text-center py-8 text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.map((row: T, index) => (
                <TableRow key={(row as { id?: string | number }).id || index}>
                  {selectable && (
                    <TableCell>
                      <Checkbox
                        checked={selectedRows.includes(String((row as { id?: string | number }).id || index))}
                        onCheckedChange={(checked) => handleSelectRow(String((row as { id?: string | number }).id || index), !!checked)}
                      />
                    </TableCell>
                  )}
                  {columns.map((column) => {
                    const cellValue = row[column.key] as T[keyof T];
                    return (
                      <TableCell key={String(column.key)}>
                        {column.render ? column.render(cellValue, row) : String(cellValue || '')}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange?.(1)}
            disabled={pagination.page === 1}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange?.(pagination.page - 1)}
            disabled={pagination.page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground px-4">
            Page {pagination.page} of {pagination.total_pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange?.(pagination.page + 1)}
            disabled={pagination.page === pagination.total_pages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange?.(pagination.total_pages)}
            disabled={pagination.page === pagination.total_pages}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}