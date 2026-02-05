'use client';

import { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
} from '@tanstack/react-table';
import { StockTableRow } from '@/types';
import LoadingSpinner from './LoadingSpinner';

interface StockTableProps {
  data: StockTableRow[];
  onRemoveTicker: (ticker: string) => void;
}

const columnHelper = createColumnHelper<StockTableRow>();

function formatPercent(value: number | null): string {
  if (value === null || value === undefined) return 'N/A';
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function formatRatio(value: number | null): string {
  if (value === null || value === undefined) return 'N/A';
  return value.toFixed(2);
}

function formatPrice(value: number | null): string {
  if (value === null || value === undefined) return 'N/A';
  return `$${value.toFixed(2)}`;
}

function getReturnColor(value: number | null): string {
  if (value === null || value === undefined) return 'text-gray-500';
  if (value > 0) return 'text-green-600';
  if (value < 0) return 'text-red-600';
  return 'text-gray-700';
}

const BENCHMARK_TICKERS = ['VOO', 'SPY'];

export default function StockTable({ data, onRemoveTicker }: StockTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [hoveredColumn, setHoveredColumn] = useState<string | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const columns = useMemo(
    () => [
      columnHelper.accessor('ticker', {
        header: 'Ticker',
        cell: (info) => (
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900">{info.getValue()}</span>
            <button
              onClick={() => onRemoveTicker(info.getValue())}
              className="text-red-500 hover:text-red-700 text-sm"
              title="Remove"
            >
              ✕
            </button>
          </div>
        ),
      }),
      columnHelper.accessor('name', {
        header: 'Name',
        cell: (info) => (
          <span className="text-gray-900 truncate max-w-[150px] block" title={info.getValue()}>
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor('currentPrice', {
        header: 'Price',
        cell: (info) => {
          if (info.row.original.isLoading) return <LoadingSpinner size="sm" />;
          return <span className="text-gray-900">{formatPrice(info.getValue())}</span>;
        },
      }),
      columnHelper.accessor('ytdReturn', {
        header: 'YTD',
        cell: (info) => {
          if (info.row.original.isLoading) return <LoadingSpinner size="sm" />;
          const value = info.getValue();
          return <span className={getReturnColor(value)}>{formatPercent(value)}</span>;
        },
      }),
      columnHelper.accessor('return2025', {
        header: '2025',
        cell: (info) => {
          if (info.row.original.isLoading) return <LoadingSpinner size="sm" />;
          const value = info.getValue();
          return <span className={getReturnColor(value)}>{formatPercent(value)}</span>;
        },
      }),
      columnHelper.accessor('return2024', {
        header: '2024',
        cell: (info) => {
          if (info.row.original.isLoading) return <LoadingSpinner size="sm" />;
          const value = info.getValue();
          return <span className={getReturnColor(value)}>{formatPercent(value)}</span>;
        },
      }),
      columnHelper.accessor('return2023', {
        header: '2023',
        cell: (info) => {
          if (info.row.original.isLoading) return <LoadingSpinner size="sm" />;
          const value = info.getValue();
          return <span className={getReturnColor(value)}>{formatPercent(value)}</span>;
        },
      }),
      columnHelper.accessor('return5Year', {
        header: '5Y Ann.',
        cell: (info) => {
          if (info.row.original.isLoading) return <LoadingSpinner size="sm" />;
          const value = info.getValue();
          return <span className={getReturnColor(value)}>{formatPercent(value)}</span>;
        },
      }),
      columnHelper.accessor('return10Year', {
        header: '10Y Ann.',
        cell: (info) => {
          if (info.row.original.isLoading) return <LoadingSpinner size="sm" />;
          const value = info.getValue();
          return <span className={getReturnColor(value)}>{formatPercent(value)}</span>;
        },
      }),
      columnHelper.accessor('peLTM', {
        header: 'P/E (LTM)',
        cell: (info) => {
          if (info.row.original.isLoading) return <LoadingSpinner size="sm" />;
          return <span className="text-gray-900">{formatRatio(info.getValue())}</span>;
        },
      }),
      columnHelper.accessor('peNTM', {
        header: 'P/E (NTM)',
        cell: (info) => {
          if (info.row.original.isLoading) return <LoadingSpinner size="sm" />;
          return <span className="text-gray-900">{formatRatio(info.getValue())}</span>;
        },
      }),
      columnHelper.accessor('psLTM', {
        header: 'P/S (LTM)',
        cell: (info) => {
          if (info.row.original.isLoading) return <LoadingSpinner size="sm" />;
          return <span className="text-gray-900">{formatRatio(info.getValue())}</span>;
        },
      }),
      columnHelper.accessor('psNTM', {
        header: 'P/S (NTM)',
        cell: (info) => {
          if (info.row.original.isLoading) return <LoadingSpinner size="sm" />;
          return <span className="text-gray-900">{formatRatio(info.getValue())}</span>;
        },
      }),
    ],
    [onRemoveTicker]
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg">No stocks added yet.</p>
        <p className="text-sm mt-2">Add a ticker above to get started.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="bg-gray-100">
              {headerGroup.headers.map((header) => {
                const isHovered = hoveredColumn === header.id;
                const sortDirection = header.column.getIsSorted();
                return (
                  <th
                    key={header.id}
                    className={`px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b cursor-pointer select-none transition-colors ${
                      isHovered ? 'bg-blue-100' : ''
                    }`}
                    onClick={header.column.getToggleSortingHandler()}
                    onMouseEnter={() => setHoveredColumn(header.id)}
                    onMouseLeave={() => setHoveredColumn(null)}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      <span className={isHovered || sortDirection ? 'text-blue-600' : 'text-gray-400'}>
                        {sortDirection === 'asc'
                          ? ' ↑'
                          : sortDirection === 'desc'
                          ? ' ↓'
                          : isHovered
                          ? ' ↕'
                          : ''}
                      </span>
                    </div>
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => {
            const ticker = row.original.ticker;
            const isBenchmark = BENCHMARK_TICKERS.includes(ticker);
            const isRowHovered = hoveredRow === row.id;

            return (
              <tr
                key={row.id}
                className={`border-b transition-colors ${
                  row.original.error ? 'bg-red-50' : ''
                }`}
                onMouseEnter={() => setHoveredRow(row.id)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                {row.getVisibleCells().map((cell) => {
                  const isColumnHovered = hoveredColumn === cell.column.id;

                  let bgClass = '';
                  if (isRowHovered) {
                    bgClass = 'bg-gray-100';
                  } else if (isColumnHovered) {
                    bgClass = 'bg-blue-50';
                  } else if (isBenchmark) {
                    bgClass = 'bg-sky-50';
                  }

                  return (
                    <td
                      key={cell.id}
                      className={`px-4 py-3 text-sm transition-colors ${bgClass}`}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
