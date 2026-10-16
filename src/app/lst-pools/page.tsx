'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw } from 'lucide-react';
import { fetchJson } from '@/lib/fetch-json';
import { getAssetList } from '@/lib/registry';

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
}

interface DashboardDataPoint {
  price: number;
  start_timestamp?: string;
  /** Older API versions used camelCase keys. */
  startTimestamp?: string;
}

interface DashboardResponse {
  data: DashboardDataPoint[];
}

interface ChartData {
  time: string;
  timestamp: string;
  [key: string]: string | number;
}

const DEX_API_URL = 'https://dex-api.initia.xyz/indexer/dex/v2';
const INIT_DENOM = 'uinit';
const LST_SYMBOLS = ['milkINIT', 'sINIT', 'xINIT'];

/** Fetches price history for each LST (using its most liquid pool) and merges it into chart rows. */
async function fetchPriceData(
  pools: Pool[],
  assetMap: Map<string, string>,
  range: string
): Promise<ChartData[]> {
  const poolBySymbol = new Map<string, Pool>();
  for (const pool of pools) {
    const lstCoin = pool.coins.find((coin) => coin.denom !== INIT_DENOM);
    const symbol = lstCoin ? assetMap.get(lstCoin.denom) || 'Unknown' : 'Unknown';
    const current = poolBySymbol.get(symbol);
    if (!current || pool.liquidity > current.liquidity) poolBySymbol.set(symbol, pool);
  }

  const results = await Promise.all(
    [...poolBySymbol].map(async ([symbol, pool]) => {
      try {
        const { data } = await fetchJson<DashboardResponse>(
          `${DEX_API_URL}/dashboard/${pool.lp_metadata}?range=${range}`
        );
        return Array.isArray(data) ? { symbol, points: data } : null;
      } catch (err) {
        console.error(`Failed to fetch price data for pool ${pool.lp_metadata}:`, err);
        return null;
      }
    })
  );

  // Combine all price data into a single array for the chart
  const timeMap = new Map<string, ChartData>();
  for (const result of results) {
    if (!result) continue;
    for (const point of result.points) {
      const timestamp = point.start_timestamp ?? point.startTimestamp;
      if (!timestamp) continue;
      const date = new Date(timestamp);
      if (!timeMap.has(timestamp)) {
        timeMap.set(timestamp, { time: `${date.getUTCMonth() + 1}/${date.getUTCDate()}`, timestamp });
      }
      timeMap.get(timestamp)![result.symbol] = point.price;
    }
  }

  return Array.from(timeMap.values()).sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
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
  const [chartLoading, setChartLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assetMap, setAssetMap] = useState<Map<string, string>>(new Map());
  const [priceData, setPriceData] = useState<ChartData[]>([]);
  const [visibleLines, setVisibleLines] = useState<Set<string>>(new Set(LST_SYMBOLS));
  const [timeRange, setTimeRange] = useState<string>('week');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  // Load the asset registry and the pool list in parallel
  useEffect(() => {
    const loadPools = async () => {
      try {
        const [assetList, poolResponse] = await Promise.all([
          getAssetList('initia'),
          fetchJson<PoolResponse>(`${DEX_API_URL}/pools?pagination.limit=1000`),
        ]);

        const newAssetMap = new Map(assetList.assets.map((asset) => [asset.base, asset.symbol]));
        const lstDenoms = new Set(
          assetList.assets
            .filter((asset) => LST_SYMBOLS.includes(asset.symbol))
            .map((asset) => asset.base)
        );

        if (!Array.isArray(poolResponse.pools)) {
          throw new Error('Invalid API response structure');
        }

        const filteredPools = poolResponse.pools.filter((pool) => {
          if (pool.pool_type !== 'STABLE_SWAP' || pool.coins.length !== 2) return false;
          const denoms = pool.coins.map((coin) => coin.denom);
          return denoms.includes(INIT_DENOM) && denoms.some((denom) => lstDenoms.has(denom));
        });

        setAssetMap(newAssetMap);
        setPools(filteredPools);
      } catch (err) {
        console.error('Error fetching pools:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch pools');
      } finally {
        setLoading(false);
      }
    };

    loadPools();
  }, []);

  // Load chart data whenever the pools, time range or refresh token change
  useEffect(() => {
    if (pools.length === 0) return;
    let cancelled = false;

    fetchPriceData(pools, assetMap, timeRange)
      .then((chartData) => {
        if (!cancelled && chartData.length > 0) setPriceData(chartData);
      })
      .catch((err) => console.error('Error fetching price data:', err))
      .finally(() => {
        if (!cancelled) {
          setChartLoading(false);
          setRefreshing(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [pools, assetMap, timeRange, refreshToken]);

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

  const handleRefresh = () => {
    if (pools.length === 0) return;
    setRefreshing(true);
    setChartLoading(true);
    setRefreshToken((token) => token + 1);
  };

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
                    {LST_SYMBOLS.map(symbol => (
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
                        onClick={() => {
                          if (range.value === timeRange) return;
                          setChartLoading(true);
                          setTimeRange(range.value);
                        }}
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
                    {LST_SYMBOLS.map(symbol => (
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
                        const lstCoin = pool.coins.find(coin => coin.denom !== INIT_DENOM);
                        const initCoin = pool.coins.find(coin => coin.denom === INIT_DENOM);
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