'use client';

import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  Row,
} from '@tanstack/react-table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getTokenIcon } from '@/lib/token-utils';
import Image from 'next/image';
import { PriceChartModal } from '@/components/price-chart-modal';
import { Card } from '@/components/ui/card';
import { useMediaQuery } from '@/lib/hooks/use-media-query';

interface PriceData {
  price: {
    price: string;
    block_timestamp: string;
    block_height: string;
  };
  nonce: string;
  decimals: string;
  id: string;
}

interface OracleData {
  baseSymbol: string;
  quoteSymbol: string;
  pair: string;
  price: number;
  lastUpdated: string;
  blockHeight: string;
}

interface OracleTableProps {
  currencyPairs: { Base: string; Quote: string }[];
  priceData: Record<string, PriceData>;
  isRefreshing?: boolean;
}

function OracleCard({
  data,
  onClick,
  isRefreshing,
}: {
  data: OracleData;
  onClick: () => void;
  isRefreshing?: boolean;
}) {
  return (
    <Card
      className="p-4 cursor-pointer hover:bg-muted/50 transition-colors group"
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="relative w-6 h-6">
            <Image
              src={getTokenIcon(data.baseSymbol)}
              alt={data.baseSymbol}
              width={24}
              height={24}
              className="rounded-full grayscale contrast-150 brightness-110 group-hover:grayscale-0 group-hover:contrast-100 group-hover:brightness-100 transition-all duration-200"
            />
          </div>
          <span className="font-mono font-medium">
            {data.baseSymbol}/{data.quoteSymbol}
          </span>
        </div>
        <div
          className={`text-sm transition-colors duration-500 ${
            isRefreshing ? 'bg-primary/5 rounded px-2 py-1' : ''
          }`}
        >
          {new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(data.price)}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
        <div>
          <div className="text-xs mb-1">Last Updated</div>
          <div className="font-mono">{new Date(data.lastUpdated).toLocaleString()}</div>
        </div>
        <div>
          <div className="text-xs mb-1">Block Height</div>
          <div className="font-mono">{data.blockHeight}</div>
        </div>
      </div>
    </Card>
  );
}

export function OracleTable({ currencyPairs, priceData, isRefreshing }: OracleTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = React.useState('');
  const [selectedPair, setSelectedPair] = React.useState<{
    base: string;
    quote: string;
    price: number;
  } | null>(null);

  const isDesktop = useMediaQuery('(min-width: 768px)');

  const columns = React.useMemo<ColumnDef<OracleData>[]>(
    () => [
      {
        accessorKey: 'pair',
        header: 'Pair',
        cell: ({ row }: { row: Row<OracleData> }) => {
          const baseSymbol = row.original.baseSymbol;
          const quoteSymbol = row.original.quoteSymbol;

          return (
            <div className="flex items-center gap-2">
              <div className="relative w-5 sm:w-6 h-5 sm:h-6">
                <Image
                  src={getTokenIcon(baseSymbol)}
                  alt={baseSymbol}
                  width={24}
                  height={24}
                  className="rounded-full grayscale contrast-150 brightness-110 group-hover:grayscale-0 group-hover:contrast-100 group-hover:brightness-100 transition-all duration-200"
                />
              </div>
              <span className="text-sm sm:text-base">
                {baseSymbol}/{quoteSymbol}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: 'price',
        header: 'Price',
        cell: ({ row }: { row: Row<OracleData> }) => {
          const price = row.getValue('price') as number;
          const formatted = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(price);
          return (
            <span
              className={`text-sm sm:text-base transition-colors duration-500 ${
                isRefreshing ? 'bg-primary/5 rounded px-1.5 sm:px-2 py-0.5 sm:py-1' : ''
              }`}
            >
              {formatted}
            </span>
          );
        },
      },
      {
        accessorKey: 'lastUpdated',
        header: 'Last Updated',
        cell: ({ row }: { row: Row<OracleData> }) => {
          const timestamp = row.getValue('lastUpdated') as string;
          return (
            <span className="text-sm sm:text-base whitespace-nowrap">
              {new Date(timestamp).toLocaleString()}
            </span>
          );
        },
      },
      {
        accessorKey: 'blockHeight',
        header: 'Block Height',
        cell: ({ row }: { row: Row<OracleData> }) => (
          <span className="text-sm sm:text-base">{row.getValue('blockHeight')}</span>
        ),
      },
    ],
    [isRefreshing]
  );

  const data = React.useMemo(() => {
    return currencyPairs.map(({ Base, Quote }) => {
      const pairKey = `${Base}/${Quote}`;
      const priceInfo = priceData[pairKey];

      if (!priceInfo) {
        return {
          baseSymbol: Base,
          quoteSymbol: Quote,
          pair: pairKey,
          price: 0,
          lastUpdated: new Date().toISOString(),
          blockHeight: 'N/A',
        };
      }

      const price = Number(priceInfo.price.price) / Math.pow(10, Number(priceInfo.decimals));

      return {
        baseSymbol: Base,
        quoteSymbol: Quote,
        pair: pairKey,
        price,
        lastUpdated: priceInfo.price.block_timestamp,
        blockHeight: priceInfo.price.block_height,
      };
    });
  }, [currencyPairs, priceData]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <div className="space-y-4">
      <PriceChartModal
        isOpen={selectedPair !== null}
        onClose={() => setSelectedPair(null)}
        baseSymbol={selectedPair?.base ?? ''}
        quoteSymbol={selectedPair?.quote ?? ''}
        currentPrice={selectedPair?.price ?? 0}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Input
            placeholder="Search pairs..."
            value={globalFilter ?? ''}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="text-sm"
          />
          <div
            className={`flex-shrink-0 flex items-center gap-2 px-2 sm:px-3 py-1 sm:py-1.5 border transition-colors duration-300 ${
              isRefreshing ? 'bg-primary/10 border-primary/20' : 'bg-muted/20 border-muted/30'
            }`}
          >
            <div className="relative">
              <div
                className={`w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full ${
                  isRefreshing ? 'bg-primary' : 'bg-muted'
                }`}
              />
              <div className="absolute inset-0 rounded-full animate-ping bg-current opacity-40" />
            </div>
            <span className="text-[10px] sm:text-xs font-medium">Live</span>
          </div>
        </div>
      </div>

      {isDesktop ? (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="text-xs sm:text-sm whitespace-nowrap">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    className="group cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      if (selectedPair) {
                        setSelectedPair(null);
                      } else {
                        setSelectedPair({
                          base: row.original.baseSymbol,
                          quote: row.original.quoteSymbol,
                          price: row.original.price,
                        });
                      }
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-2 sm:py-4">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {table.getRowModel().rows.map((row) => (
            <OracleCard
              key={row.id}
              data={row.original}
              isRefreshing={isRefreshing}
              onClick={() => {
                if (selectedPair) {
                  setSelectedPair(null);
                } else {
                  setSelectedPair({
                    base: row.original.baseSymbol,
                    quote: row.original.quoteSymbol,
                    price: row.original.price,
                  });
                }
              }}
            />
          ))}
        </div>
      )}

      <div className="flex items-center justify-end space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">Previous page</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
          <span className="sr-only">Next page</span>
        </Button>
      </div>
    </div>
  );
}
