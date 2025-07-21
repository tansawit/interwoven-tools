'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw } from 'lucide-react';

interface PoolCoin {
  denom: string;
  metadata: string;
  weight?: string;
}

interface Pool {
  lp: string;
  lp_metadata: string;
  pool_type: string;
  coins: PoolCoin[];
  liquidity: number;
  ann?: number;
}

interface PoolResponse {
  pools: Pool[];
  pagination: {
    next_key: string | null;
    total: string;
  };
}

interface Asset {
  base: string;
  display: string;
  symbol: string;
  denom_units: {
    denom: string;
    exponent: number;
  }[];
}

interface AssetList {
  chain_name: string;
  assets: Asset[];
}



interface DashboardDataPoint {
  liquidity: number;
  staked_liquidity: number;
  volume: number;
  fee: number;
  price: number;
  apr: number;
  startTimestamp: string;
  endTimestamp: string;
}

interface DashboardResponse {
  data: DashboardDataPoint[];
}

interface ChartData {
  time: string;
  timestamp: string;
  [key: string]: string | number;
}

// Custom Tooltip Component
interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    dataKey: string;
    value: string | number;
    color: string;
  }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div 
        className="bg-card border border-border p-3 shadow-lg"
        style={{
          backgroundColor: 'var(--card)',
          borderColor: 'var(--border)',
          color: 'var(--card-foreground)',
          fontSize: '14px',
          borderRadius: '0px'
        }}
      >
        <p className="font-medium mb-2" style={{ color: 'var(--card-foreground)' }}>
          {label}
        </p>
        {payload.map((entry, index: number) => (
          <p key={index} style={{ color: entry.color, marginBottom: '4px' }}>
            <span className="font-medium">{entry.dataKey}:</span>{' '}
            <span className="font-mono">
              {typeof entry.value === 'number' ? entry.value.toFixed(6) : entry.value}
            </span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function LSTPoolsPage() {
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assetMap, setAssetMap] = useState<Map<string, string>>(new Map());
  const [lstDenoms, setLstDenoms] = useState<string[]>([]);
  const [priceData, setPriceData] = useState<ChartData[]>([]);
  const [visibleLines, setVisibleLines] = useState<Set<string>>(new Set(['milkINIT', 'sINIT', 'xINIT']));
  const [timeRange, setTimeRange] = useState<string>('week');
  const [refreshing, setRefreshing] = useState(false);



  const fetchAssetRegistry = async () => {
    try {
      const response = await fetch('https://registry.initia.xyz/chains/initia/assetlist.json');
      if (!response.ok) {
        throw new Error('Failed to fetch asset registry');
      }
      const assetList: AssetList = await response.json();
      
      const newAssetMap = new Map<string, string>();
      const lstSymbols = ['milkINIT', 'sINIT', 'xINIT'];
      const foundLstDenoms: string[] = [];
      
      assetList.assets.forEach(asset => {
        newAssetMap.set(asset.base, asset.symbol);
        
        if (lstSymbols.includes(asset.symbol)) {
          foundLstDenoms.push(asset.base);
          console.log(`Found LST token ${asset.symbol} with denom: ${asset.base}`);
        }
      });
      
      setAssetMap(newAssetMap);
      setLstDenoms(foundLstDenoms);
      console.log('LST denoms found:', foundLstDenoms);
    } catch (err) {
      console.error('Error fetching asset registry:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch asset registry');
    }
  };

  const fetchPools = useCallback(async () => {
    try {
      setLoading(true);
      
      const response = await fetch('https://dex-v2-api.staging.initia.xyz/indexer/dex/v2/pools');
      if (!response.ok) {
        throw new Error(`Failed to fetch pools: ${response.status}`);
      }
      
      const data: PoolResponse = await response.json();
      console.log('Pool API response:', data);
      
      if (!data || !Array.isArray(data.pools)) {
        console.error('Unexpected API response structure:', data);
        throw new Error('Invalid API response structure');
      }
      
      const initDenom = 'uinit';
      
      console.log('Using LST denoms from registry:', lstDenoms);
      
      const stableSwapPools = data.pools.filter((pool: Pool) => pool.pool_type === 'STABLE_SWAP');
      console.log('Total STABLE_SWAP pools:', stableSwapPools.length);
      
      stableSwapPools.forEach(pool => {
        const denoms = pool.coins.map(c => c.denom);
        const symbols = pool.coins.map(c => assetMap.get(c.denom) || c.denom);
        console.log('Pool coins denoms:', denoms);
        console.log('Pool coins symbols:', symbols);
      });
      
      const filteredPools = data.pools.filter((pool: Pool) => {
        if (pool.pool_type !== 'STABLE_SWAP') return false;
        
        const denoms = pool.coins.map(coin => coin.denom);
        
        if (denoms.length !== 2) return false;
        
        const hasInit = denoms.includes(initDenom);
        const hasLst = lstDenoms.some(lst => denoms.includes(lst));
        
        if (hasInit && hasLst) {
          console.log('Found LST pool - denoms:', denoms);
          console.log('Symbols:', pool.coins.map(c => assetMap.get(c.denom) || c.denom));
        }
        
        return hasInit && hasLst;
      });
      
      setPools(filteredPools);
    } catch (err) {
      console.error('Error fetching pools:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch pools');
    } finally {
      setLoading(false);
    }
  }, [assetMap, lstDenoms]);

  const fetchPriceData = useCallback(async (pools: Pool[], range: string = 'week') => {
    try {
      setChartLoading(true);
      const pricePromises = pools.map(async (pool) => {
        const response = await fetch(`https://dex-v2-api.staging.initia.xyz/indexer/dex/v2/dashboard/${pool.lp_metadata}?range=${range}`);
        if (!response.ok) {
          console.error(`Failed to fetch price data for pool ${pool.lp_metadata}`);
          return null;
        }
        const data: DashboardResponse = await response.json();
        console.log(`Dashboard API response for pool ${pool.lp_metadata}:`, data);
        
        // Check if data exists in the response
        if (!data.data || !Array.isArray(data.data)) {
          console.error(`No data array found in dashboard response for pool ${pool.lp_metadata}`);
          return null;
        }
        
        // Find the LST symbol for this pool
        const lstCoin = pool.coins.find(coin => lstDenoms.includes(coin.denom));
        const lstSymbol = lstCoin ? assetMap.get(lstCoin.denom) || 'Unknown' : 'Unknown';
        
        // Transform data to price points
        const prices = data.data.map(point => ({
          time: point.startTimestamp,
          price: point.price.toString()
        }));
        
        return {
          symbol: lstSymbol,
          prices
        };
      });
      
      const results = await Promise.all(pricePromises);
      const validResults = results.filter(r => r !== null) as Array<{ symbol: string; prices: Array<{ time: string; price: string }> }>;
      
      console.log(`Valid results count: ${validResults.length}`);
      
      if (validResults.length === 0) {
        console.error('No valid price data found for any pools');
        return;
      }
      
      // Combine all price data into a single array for the chart
      const timeMap = new Map<string, ChartData>();
      
      validResults.forEach(result => {
        if (!result.prices || !Array.isArray(result.prices)) {
          console.error(`Invalid prices for symbol ${result.symbol}`);
          return;
        }
        
        result.prices.forEach(pricePoint => {
          // Use ISO date string for consistent formatting
          const date = new Date(pricePoint.time);
          const time = `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
          
          if (!timeMap.has(pricePoint.time)) {
            timeMap.set(pricePoint.time, { time, timestamp: pricePoint.time });
          }
          const dataPoint = timeMap.get(pricePoint.time)!;
          dataPoint[result.symbol] = parseFloat(pricePoint.price);
        });
      });
      
      const chartData = Array.from(timeMap.values()).sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
      setPriceData(chartData);
    } catch (err) {
      console.error('Error fetching price data:', err);
    } finally {
      setChartLoading(false);
    }
  }, [assetMap, lstDenoms]);

  const toggleLine = (symbol: string) => {
    const newVisible = new Set(visibleLines);
    if (newVisible.has(symbol)) {
      newVisible.delete(symbol);
    } else {
      newVisible.add(symbol);
    }
    setVisibleLines(newVisible);
  };

  const getSymbolColor = (symbol: string) => {
    const colors: { [key: string]: string } = {
      'milkINIT': '#8884d8',
      'sINIT': '#82ca9d',
      'xINIT': '#ffc658'
    };
    return colors[symbol] || '#000000';
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    if (pools.length > 0) {
      await fetchPriceData(pools, timeRange);
    }
    setRefreshing(false);
  };

  // Effects
  useEffect(() => {
    fetchAssetRegistry();
  }, []);

  useEffect(() => {
    if (assetMap.size > 0 && lstDenoms.length > 0) {
      fetchPools();
    }
  }, [assetMap, lstDenoms, fetchPools]);

  useEffect(() => {
    if (pools.length > 0) {
      fetchPriceData(pools, timeRange);
    }
  }, [timeRange, pools, fetchPriceData]);

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">LST Pools</h1>
            <p className="text-sm text-muted-foreground">
              Price charts and liquidity data for INIT liquid staking token pools
            </p>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : error ? (
            <p className="text-red-500">Error: {error}</p>
          ) : pools.length === 0 ? (
            <p className="text-center text-muted-foreground">No LST stable swap pools found</p>
          ) : (
            <div className="space-y-4">
              {/* Mobile-optimized controls */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="text-sm font-medium text-foreground">Assets:</span>
                  <div className="flex gap-2 flex-wrap">
                    {['milkINIT', 'sINIT', 'xINIT'].map(symbol => (
                      <Button
                        key={symbol}
                        variant={visibleLines.has(symbol) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleLine(symbol)}
                        style={{
                          backgroundColor: visibleLines.has(symbol) ? getSymbolColor(symbol) : undefined,
                          borderColor: getSymbolColor(symbol),
                          color: visibleLines.has(symbol) ? 'white' : getSymbolColor(symbol)
                        }}
                      >
                        {symbol}
                      </Button>
                    ))}
                  </div>
                </div>
                
                {/* Time Range Selector */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="text-sm font-medium text-foreground">Time Range:</span>
                  <div className="flex gap-1 flex-wrap">
                    {[
                      { value: 'day', label: '1D' },
                      { value: 'week', label: '1W' },
                      { value: 'month', label: '1M' },
                      { value: 'year', label: '1Y' },
                      { value: 'all', label: 'All' }
                    ].map(range => (
                      <Button
                        key={range.value}
                        variant={timeRange === range.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setTimeRange(range.value)}
                        className="px-3 py-1 text-xs"
                      >
                        {range.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="h-64 sm:h-80 lg:h-96 w-full relative">
                {chartLoading && (
                  <div className="absolute inset-0 bg-card/80 flex items-center justify-center z-10">
                    <Skeleton className="h-full w-full" />
                  </div>
                )}
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={priceData}
                    margin={{ 
                      top: 10, 
                      right: 10, 
                      left: 10, 
                      bottom: 60 
                    }}
                  >
                    <CartesianGrid 
                      strokeDasharray="3 3" 
                      stroke="var(--border)"
                      opacity={0.3}
                    />
                    <XAxis 
                      dataKey="time" 
                      tick={{ 
                        fill: 'var(--muted-foreground)', 
                        fontSize: 12,
                        fontWeight: 500
                      }}
                      axisLine={{ stroke: 'var(--border)' }}
                      tickLine={{ stroke: 'var(--border)' }}
                    />
                    <YAxis 
                      tick={{ 
                        fill: 'var(--muted-foreground)', 
                        fontSize: 12,
                        fontWeight: 500
                      }}
                      axisLine={{ stroke: 'var(--border)' }}
                      tickLine={{ stroke: 'var(--border)' }}
                      width={45}
                      domain={['dataMin - 0.001', 'dataMax + 0.001']}
                      tickFormatter={(value) => {
                        if (typeof value === 'number') {
                          return value.toFixed(4);
                        }
                        return value;
                      }}
                    />
                    <Tooltip 
                      content={<CustomTooltip />}
                      cursor={{ 
                        stroke: 'var(--border)', 
                        strokeWidth: 1,
                        strokeDasharray: '5 5'
                      }}
                    />
                    <Legend 
                      wrapperStyle={{ 
                        color: 'var(--foreground)',
                        fontSize: '14px',
                        fontWeight: 500
                      }}
                    />
                    <ReferenceLine 
                      y={1.0} 
                      stroke="var(--muted-foreground)" 
                      strokeDasharray="8 8" 
                      strokeWidth={1}
                      opacity={0.6}
                      label={{ 
                        value: "1.00", 
                        position: "insideTopLeft",
                        style: {
                          fill: 'var(--muted-foreground)',
                          fontSize: '12px',
                          fontWeight: 500
                        }
                      }}
                    />
                    {['milkINIT', 'sINIT', 'xINIT'].map(symbol => (
                      visibleLines.has(symbol) && (
                        <Line
                          key={symbol}
                          type="monotone"
                          dataKey={symbol}
                          stroke={getSymbolColor(symbol)}
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ 
                            r: 4, 
                            fill: getSymbolColor(symbol),
                            stroke: 'var(--background)',
                            strokeWidth: 2
                          }}
                        />
                      )
                    )                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              {/* Liquidity Table */}
              <Card className="mt-4 sm:mt-6">
                <CardHeader>
                  <CardTitle>Pool Liquidity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Token</TableHead>
                        <TableHead>Pair</TableHead>
                        <TableHead className="text-right">Liquidity (USD)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pools.map((pool) => {
                        const lstCoin = pool.coins.find(coin => lstDenoms.includes(coin.denom));
                        const initCoin = pool.coins.find(coin => coin.denom === 'uinit');
                        const lstSymbol = lstCoin ? assetMap.get(lstCoin.denom) || 'Unknown' : 'Unknown';
                        const initSymbol = initCoin ? assetMap.get(initCoin.denom) || 'INIT' : 'INIT';
                        
                        return (
                          <TableRow key={pool.lp_metadata}>
                            <TableCell className="font-medium">{lstSymbol}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {lstSymbol} / {initSymbol}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              ${(pool.liquidity / 1e6).toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}