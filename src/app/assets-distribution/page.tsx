'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MultiSelect } from '@/components/ui/multi-select';
import { RefreshCw, Search, X } from 'lucide-react';

interface AssetDistributionData {
  symbols: string[];
  data: Array<{
    chain_name: string;
    pretty_name: string;
    [symbol: string]: string | null;
  }>;
}

export default function AssetsDistributionPage() {
  const [data, setData] = useState<AssetDistributionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [chainSearch, setChainSearch] = useState('');
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await fetch('/api/assets-distribution');
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      const result: AssetDistributionData = await response.json();
      setData(result);
    } catch (err) {
      console.error('Error fetching asset distribution:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch asset distribution data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatAmount = (amount: string | null) => {
    if (!amount || amount === '0') return '-';
    
    // Convert to number and format with thousand separators
    const num = BigInt(amount);
    return num.toLocaleString();
  };

  // Filter data based on search and selected assets
  const filteredData = useMemo(() => {
    if (!data) return null;

    // Filter chains based on search
    let filteredChains = data.data;
    if (chainSearch) {
      filteredChains = data.data.filter(row => 
        row.chain_name.toLowerCase().includes(chainSearch.toLowerCase()) ||
        row.pretty_name.toLowerCase().includes(chainSearch.toLowerCase()) ||
        row.chain_name === 'total' // Always include total row
      );
    }

    // Filter assets
    let filteredSymbols = data.symbols;
    if (selectedAssets.length > 0) {
      filteredSymbols = data.symbols.filter(symbol => selectedAssets.includes(symbol));
    }

    return {
      symbols: filteredSymbols,
      data: filteredChains
    };
  }, [data, chainSearch, selectedAssets]);

  // Asset options for multi-select
  const assetOptions = useMemo(() => {
    if (!data) return [];
    return data.symbols.map(symbol => ({
      value: symbol,
      label: symbol
    }));
  }, [data]);

  const clearFilters = () => {
    setChainSearch('');
    setSelectedAssets([]);
  };

  const hasActiveFilters = chainSearch || selectedAssets.length > 0;

  if (loading) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        <div className="space-y-6">
          <div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96 mt-2" />
          </div>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64 mt-2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Assets Distribution</h1>
            <p className="text-sm text-muted-foreground">
              View token balances across all chains in the Initia ecosystem
            </p>
          </div>
          <Card>
            <CardContent className="py-6">
              <div className="text-center text-red-500">
                Error: {error}
              </div>
              <div className="mt-4 text-center">
                <Button onClick={() => fetchData()} variant="outline">
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Assets Distribution</h1>
            <p className="text-sm text-muted-foreground">
              View token balances across all chains in the Initia ecosystem
            </p>
          </div>
          <Button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="space-y-4">
              <div>
                <CardTitle>Token Balances by Chain</CardTitle>
                <CardDescription>
                  Total supply of each token on different chains in the Initia Registry
                </CardDescription>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search chains..."
                    value={chainSearch}
                    onChange={(e) => setChainSearch(e.target.value)}
                    className="pl-9 bg-black border-gray-600 focus:border-gray-500 hover:border-gray-500"
                  />
                </div>
                
                <div className="flex-1 max-w-sm">
                  <MultiSelect
                    options={assetOptions}
                    selected={selectedAssets}
                    onChange={setSelectedAssets}
                    placeholder="Filter assets..."
                    searchPlaceholder="Search assets..."
                    emptyMessage="No assets found."
                  />
                </div>
                
                {hasActiveFilters && (
                  <Button
                    onClick={clearFilters}
                    variant="ghost"
                    size="sm"
                    className="h-10"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear filters
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredData && filteredData.data.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-black z-10 min-w-[150px]">
                        Chain
                      </TableHead>
                      {filteredData.symbols.map((symbol) => (
                        <TableHead key={symbol} className="text-right min-w-[120px]">
                          {symbol}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.data.map((row) => (
                      <TableRow 
                        key={row.chain_name}
                        className={row.chain_name === 'total' ? 'font-bold bg-muted/50' : ''}
                      >
                        <TableCell className={`sticky left-0 bg-black z-10 font-medium ${
                          row.chain_name === 'total' ? 'font-bold' : ''
                        }`}>
                          {row.pretty_name || row.chain_name}
                        </TableCell>
                        {filteredData.symbols.map((symbol) => (
                          <TableCell 
                            key={symbol} 
                            className={`text-right ${
                              row.chain_name === 'total' ? 'font-bold' : ''
                            }`}
                          >
                            {formatAmount(row[symbol] as string | null)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No data matches the current filters
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}