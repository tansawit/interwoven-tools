'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Activity } from 'lucide-react';

// Define the types for the data fetched from the API
interface SwapResult {
  offerAmount: number;
  returnAmount: number;
  feeAmount: number;
  initPrice: number;
}

interface PoolMonitorData {
  bridgeId: string;
  prettyName: string;
  virtualPoolBalanceL1: number;
  virtualPoolBalanceL2: number;
  pegKeeperBalanceL1: number;
  pegKeeperBalanceL2: number;
  swaps: SwapResult[];
}

const config = {
  interval: 60000, // 1 minute refresh interval
  offerRatios: [0.1, 0.2, 0.5],
};

export default function MinitswapMonitor() {
  const [data, setData] = useState<PoolMonitorData[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPool, setSelectedPool] = useState<PoolMonitorData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const monitorResponse = await fetch('/api/minitswap/monitor');

      if (!monitorResponse.ok) {
        throw new Error(`HTTP error! status: ${monitorResponse.status}`);
      }

      const result: PoolMonitorData[] = await monitorResponse.json();
      setData(result);
      setLastUpdated(new Date());
    } catch (e: unknown) {
      console.error('Failed to fetch data:', e);
      const errorMessage = e instanceof Error ? e.message : 'Failed to fetch data';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const intervalId = setInterval(fetchData, config.interval);
    return () => clearInterval(intervalId);
  }, []);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(num);
  };

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return 'text-green-600 dark:text-green-400';
    if (balance < 0) return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  return (
    <div className="container mx-auto py-6 sm:py-8 px-4 max-w-7xl">
      <div className="space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Minitswap</h1>
          <p className="text-muted-foreground text-base sm:text-lg px-4">
            Monitoring of Minitswap pools and balances
          </p>

          {/* Status Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span className="text-xs sm:text-sm">
                {lastUpdated ? `Last updated: ${lastUpdated.toLocaleTimeString()}` : 'Loading...'}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 text-xs sm:text-sm"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {loading && !data && (
          <div className="text-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground text-sm sm:text-base">Loading pool data...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card className="border-red-200 dark:border-red-800">
            <CardContent className="pt-6">
              <div className="text-center text-red-600 dark:text-red-400">
                <p className="font-semibold text-sm sm:text-base">Error loading data</p>
                <p className="text-xs sm:text-sm mt-1">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pool Data */}
        {data && (
          <div className="space-y-6">
            {/* Mobile Cards View */}
            <div className="block lg:hidden space-y-4">
              {data.map((pool) => {
                const firstSwapPrice = pool.swaps.length > 0 ? pool.swaps[0].initPrice : NaN;

                return (
                  <Card key={pool.bridgeId} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">{pool.prettyName}</h3>
                          <p className="text-xs text-muted-foreground font-mono">{pool.bridgeId}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedPool(pool);
                            setIsModalOpen(true);
                          }}
                          className="text-xs"
                        >
                          Details
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground block">Virtual Pool (L1)</span>
                          <span className="font-mono text-xs">
                            {formatNumber(pool.virtualPoolBalanceL1)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Virtual Pool (L2)</span>
                          <span className="font-mono text-xs">
                            {formatNumber(pool.virtualPoolBalanceL2)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Peg Keeper (L1)</span>
                          <span
                            className={`font-mono text-xs ${getBalanceColor(
                              pool.pegKeeperBalanceL1
                            )}`}
                          >
                            {formatNumber(pool.pegKeeperBalanceL1)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Peg Keeper (L2)</span>
                          <span
                            className={`font-mono text-xs ${getBalanceColor(
                              pool.pegKeeperBalanceL2
                            )}`}
                          >
                            {formatNumber(pool.pegKeeperBalanceL2)}
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center border-t pt-3">
                        <span className="text-muted-foreground text-sm">Swap Price (5K):</span>
                        <span className="font-mono text-sm">
                          {isNaN(firstSwapPrice) ? 'N/A' : formatNumber(firstSwapPrice)}
                        </span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto border border-border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="border-b border-border">
                    <th className="text-left p-4 font-semibold">Chain</th>
                    <th className="text-left p-4 font-semibold">Bridge ID</th>
                    <th className="text-right p-4 font-semibold">Virtual Pool (L1)</th>
                    <th className="text-right p-4 font-semibold">Virtual Pool (L2)</th>
                    <th className="text-right p-4 font-semibold">Peg Keeper (L1)</th>
                    <th className="text-right p-4 font-semibold">Peg Keeper (L2)</th>
                    <th className="text-right p-4 font-semibold">Swap Price (5K)</th>
                    <th className="text-center p-4 font-semibold">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((pool, index) => {
                    const firstSwapPrice = pool.swaps.length > 0 ? pool.swaps[0].initPrice : NaN;

                    return (
                      <tr
                        key={pool.bridgeId}
                        className={`border-b border-border hover:bg-muted/30 ${
                          index % 2 === 0 ? 'bg-background' : 'bg-muted/10'
                        }`}
                      >
                        <td className="p-4 font-medium">{pool.prettyName}</td>
                        <td className="p-4 font-mono text-muted-foreground">{pool.bridgeId}</td>
                        <td className="p-4 font-mono text-right">
                          {formatNumber(pool.virtualPoolBalanceL1)}
                        </td>
                        <td className="p-4 font-mono text-right">
                          {formatNumber(pool.virtualPoolBalanceL2)}
                        </td>
                        <td
                          className={`p-4 font-mono text-right ${getBalanceColor(
                            pool.pegKeeperBalanceL1
                          )}`}
                        >
                          {formatNumber(pool.pegKeeperBalanceL1)}
                        </td>
                        <td
                          className={`p-4 font-mono text-right ${getBalanceColor(
                            pool.pegKeeperBalanceL2
                          )}`}
                        >
                          {formatNumber(pool.pegKeeperBalanceL2)}
                        </td>
                        <td className="p-4 font-mono text-right">
                          {isNaN(firstSwapPrice) ? 'N/A' : formatNumber(firstSwapPrice)}
                        </td>
                        <td className="p-4 text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedPool(pool);
                              setIsModalOpen(true);
                            }}
                            className="text-xs"
                          >
                            Details
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal for Swap Details */}
        {isModalOpen && selectedPool && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden bg-black border-border">
              <CardHeader className="border-b border-border">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg sm:text-xl">
                      {selectedPool.prettyName} - Swap Details
                    </CardTitle>
                    <CardDescription className="font-mono text-xs sm:text-sm">
                      {selectedPool.bridgeId}
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsModalOpen(false)}
                    className="text-xs"
                  >
                    Close
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="overflow-auto p-4 sm:p-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Offer Amount</th>
                        <th className="text-left p-2">Return Amount</th>
                        <th className="text-left p-2">Fee Amount</th>
                        <th className="text-left p-2">Effective Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPool.swaps.map((swap, index) => (
                        <tr key={index} className="border-b">
                          <td className="p-2 font-mono">{formatNumber(swap.offerAmount)}</td>
                          <td className="p-2 font-mono">{formatNumber(swap.returnAmount)}</td>
                          <td className="p-2 font-mono">{formatNumber(swap.feeAmount)}</td>
                          <td className="p-2 font-mono">
                            {isNaN(swap.initPrice) ? 'N/A' : formatNumber(swap.initPrice)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
