'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Activity } from 'lucide-react';

// Define the types for the staking pool data
interface TokenAmount {
  denom: string;
  amount: string;
}

interface VotingPowerWeight {
  denom: string;
  amount: string;
}

interface StakingPool {
  not_bonded_tokens: TokenAmount[];
  bonded_tokens: TokenAmount[];
  voting_power_weights: VotingPowerWeight[];
}

interface StakingData {
  pool: StakingPool;
}

// Price data interfaces
interface PriceData {
  [denom: string]: number;
}

interface PoolComposition {
  initAmount: number; // Amount of INIT in the pool
  totalShares: number; // Total LP shares
  initDenom: string; // The INIT denom (should be 'uinit')
}

interface ApiResponse {
  stakingData: StakingData;
  prices: PriceData;
  poolCompositions: { [denom: string]: PoolComposition };
}

// Token display names mapping
const TOKEN_NAMES: { [key: string]: string } = {
  uinit: 'INIT',
  'move/543b35a39cfadad3da3c23249c474455d15efd2f94f849473226dee8a3c7a9e1': 'INIT-USDC LP',
};

// Token decimals for proper formatting
const TOKEN_DECIMALS: { [key: string]: number } = {
  uinit: 6,
  'move/543b35a39cfadad3da3c23249c474455d15efd2f94f849473226dee8a3c7a9e1': 6,
};

const config = {
  interval: 60000, // 1 minute refresh interval
};

export default function StakingMonitor() {
  const [data, setData] = useState<StakingData | null>(null);
  const [prices, setPrices] = useState<PriceData>({});
  const [poolCompositions, setPoolCompositions] = useState<{ [denom: string]: PoolComposition }>(
    {}
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching staking data and prices...');
      const response = await fetch('/api/staking');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: ApiResponse = await response.json();
      console.log('API response received:', result);

      setData(result.stakingData);
      setPrices(result.prices);
      setPoolCompositions(result.poolCompositions || {});
      setLastUpdated(new Date());
    } catch (e: unknown) {
      console.error('Failed to fetch staking data:', e);
      const errorMessage = e instanceof Error ? e.message : 'Failed to fetch staking data';
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

  const formatLargeNumber = (value: number) => {
    if (value >= 1e9) {
      return (value / 1e9).toFixed(1) + 'B';
    }
    if (value >= 1e6) {
      return (value / 1e6).toFixed(1) + 'M';
    }
    if (value >= 1e3) {
      return (value / 1e3).toFixed(1) + 'K';
    }
    return value.toFixed(0);
  };

  const formatAmountWithUSD = (amount: string, denom: string) => {
    const decimals = TOKEN_DECIMALS[denom] || 6;
    const numAmount = parseFloat(amount) / Math.pow(10, decimals);
    const price = prices[denom] || 0;
    const usdValue = numAmount * price;

    const formattedAmount = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numAmount);

    const formattedUSD = formatLargeNumber(usdValue);

    return `${formattedAmount} (~$${formattedUSD})`;
  };

  const calculateInitEquivalent = (lpAmount: string, denom: string) => {
    // For INIT itself, just show the unstaking amount
    if (denom === 'uinit') {
      const decimals = TOKEN_DECIMALS[denom] || 6;
      const initAmount = parseFloat(lpAmount) / Math.pow(10, decimals);
      const initPrice = prices['uinit'] || 0;
      const initUSDValue = initAmount * initPrice;

      const formattedInit = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(initAmount);

      const formattedUSD = formatLargeNumber(initUSDValue);

      return `${formattedInit} (~$${formattedUSD})`;
    }

    const poolComposition = poolCompositions[denom];
    if (!poolComposition) {
      return null;
    }

    const decimals = TOKEN_DECIMALS[denom] || 6;
    const lpTokens = parseFloat(lpAmount) / Math.pow(10, decimals);

    // Calculate the share of the pool that these LP tokens represent
    const poolShare = lpTokens / poolComposition.totalShares;

    // Calculate the INIT equivalent
    const initEquivalent = poolShare * poolComposition.initAmount;
    const initPrice = prices['uinit'] || 0;
    const initUSDValue = initEquivalent * initPrice;

    const formattedInit = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(initEquivalent);

    const formattedUSD = formatLargeNumber(initUSDValue);

    return `${formattedInit} (~$${formattedUSD})`;
  };

  const getTokenName = (denom: string) => {
    return TOKEN_NAMES[denom] || denom;
  };

  const calculateTotalStaked = (bondedTokens: TokenAmount[], denom: string) => {
    const token = bondedTokens.find((t) => t.denom === denom);
    return token ? parseFloat(token.amount) / Math.pow(10, TOKEN_DECIMALS[denom] || 6) : 0;
  };

  const calculateTotalUnstaking = (notBondedTokens: TokenAmount[], denom: string) => {
    const token = notBondedTokens.find((t) => t.denom === denom);
    return token ? parseFloat(token.amount) / Math.pow(10, TOKEN_DECIMALS[denom] || 6) : 0;
  };

  const getVotingPowerWeight = (weights: VotingPowerWeight[], denom: string) => {
    const weight = weights.find((w) => w.denom === denom);
    return weight ? parseFloat(weight.amount) : 0;
  };

  return (
    <div className="container mx-auto py-4 sm:py-6 lg:py-8 px-4 max-w-7xl">
      <div className="space-y-4 sm:space-y-6 lg:space-y-8">
        {/* Header */}
        <div className="text-center space-y-2 sm:space-y-4">
          <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold tracking-tight">
            Staking
          </h1>
          <p className="text-muted-foreground text-xs sm:text-base lg:text-lg px-2 sm:px-4">
            Monitoring of INIT and Enshrined Liquidity pools
          </p>

          {/* Status Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Activity className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>
                {lastUpdated ? `Last updated: ${lastUpdated.toLocaleTimeString()}` : 'Loading...'}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 text-xs"
            >
              <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {loading && !data && (
          <div className="text-center py-8 sm:py-12">
            <RefreshCw className="h-6 w-6 sm:h-8 sm:w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground text-xs sm:text-sm lg:text-base">
              Loading staking data and prices...
            </p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card className="border-red-200 dark:border-red-800">
            <CardContent className="pt-4 sm:pt-6">
              <div className="text-center text-red-600 dark:text-red-400">
                <p className="font-semibold text-xs sm:text-sm lg:text-base">Error loading data</p>
                <p className="text-xs sm:text-sm mt-1">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Staking Data */}
        {data && (
          <div className="space-y-4 sm:space-y-6">
            {/* Mobile Cards View */}
            <div className="block lg:hidden space-y-3 sm:space-y-4">
              {data.pool.bonded_tokens
                .sort((a, b) => {
                  // Always show INIT (uinit) first
                  if (a.denom === 'uinit') return -1;
                  if (b.denom === 'uinit') return 1;
                  return 0;
                })
                .map((bondedToken) => {
                  const notBondedToken = data.pool.not_bonded_tokens.find(
                    (t) => t.denom === bondedToken.denom
                  );
                  const votingWeight = getVotingPowerWeight(
                    data.pool.voting_power_weights,
                    bondedToken.denom
                  );
                  const stakedAmount = calculateTotalStaked(
                    data.pool.bonded_tokens,
                    bondedToken.denom
                  );
                  const unstakingAmount = calculateTotalUnstaking(
                    data.pool.not_bonded_tokens,
                    bondedToken.denom
                  );
                  const totalAmount = stakedAmount + unstakingAmount;
                  const tokenPrice = prices[bondedToken.denom] || 0;
                  const totalUSDValue = totalAmount * tokenPrice;
                  const initEquivalent = calculateInitEquivalent(
                    notBondedToken?.amount || '0',
                    bondedToken.denom
                  );

                  return (
                    <Card key={bondedToken.denom} className="p-3 sm:p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-base sm:text-lg">
                            {getTokenName(bondedToken.denom)}
                          </h3>
                          <span className="text-xs sm:text-sm text-muted-foreground">
                            {(votingWeight * 100).toFixed(2)}% Voting Power
                          </span>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-xs sm:text-sm">
                            <span className="text-muted-foreground">Staked:</span>
                            <span className="font-mono text-green-600 dark:text-green-400 text-xs break-all text-right">
                              {formatAmountWithUSD(bondedToken.amount, bondedToken.denom)}
                            </span>
                          </div>

                          <div className="flex justify-between text-xs sm:text-sm">
                            <span className="text-muted-foreground">Unstaking:</span>
                            <span className="font-mono text-orange-600 dark:text-orange-400 text-xs break-all text-right">
                              {formatAmountWithUSD(
                                notBondedToken?.amount || '0',
                                bondedToken.denom
                              )}
                            </span>
                          </div>

                          <div className="flex justify-between text-xs sm:text-sm">
                            <span className="text-muted-foreground">INIT Unstaking:</span>
                            <span className="font-mono text-blue-600 dark:text-blue-400 text-xs break-all text-right">
                              {initEquivalent}
                            </span>
                          </div>

                          <div className="flex justify-between text-xs sm:text-sm font-semibold border-t pt-2">
                            <span>Total:</span>
                            <span className="font-mono text-xs break-all text-right">
                              {new Intl.NumberFormat('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }).format(totalAmount)}{' '}
                              (~${formatLargeNumber(totalUSDValue)})
                            </span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="border-b border-border">
                    <th className="text-left p-4 font-semibold">Token</th>
                    <th className="text-right p-4 font-semibold">Staked</th>
                    <th className="text-right p-4 font-semibold">Unstaking</th>
                    <th className="text-right p-4 font-semibold">INIT Unstaking</th>
                    <th className="text-right p-4 font-semibold">Total</th>
                    <th className="text-right p-4 font-semibold">Voting Power Weight</th>
                  </tr>
                </thead>
                <tbody>
                  {data.pool.bonded_tokens
                    .sort((a, b) => {
                      // Always show INIT (uinit) first
                      if (a.denom === 'uinit') return -1;
                      if (b.denom === 'uinit') return 1;
                      return 0;
                    })
                    .map((bondedToken, index) => {
                      const notBondedToken = data.pool.not_bonded_tokens.find(
                        (t) => t.denom === bondedToken.denom
                      );
                      const votingWeight = getVotingPowerWeight(
                        data.pool.voting_power_weights,
                        bondedToken.denom
                      );
                      const stakedAmount = calculateTotalStaked(
                        data.pool.bonded_tokens,
                        bondedToken.denom
                      );
                      const unstakingAmount = calculateTotalUnstaking(
                        data.pool.not_bonded_tokens,
                        bondedToken.denom
                      );
                      const totalAmount = stakedAmount + unstakingAmount;
                      const tokenPrice = prices[bondedToken.denom] || 0;
                      const totalUSDValue = totalAmount * tokenPrice;
                      const initEquivalent = calculateInitEquivalent(
                        notBondedToken?.amount || '0',
                        bondedToken.denom
                      );

                      return (
                        <tr
                          key={bondedToken.denom}
                          className={`border-b border-border hover:bg-muted/30 ${
                            index % 2 === 0 ? 'bg-background' : 'bg-muted/10'
                          }`}
                        >
                          <td className="p-4 font-medium">{getTokenName(bondedToken.denom)}</td>
                          <td className="p-4 font-mono text-right text-green-600 dark:text-green-400">
                            {formatAmountWithUSD(bondedToken.amount, bondedToken.denom)}
                          </td>
                          <td className="p-4 font-mono text-right text-orange-600 dark:text-orange-400">
                            {formatAmountWithUSD(notBondedToken?.amount || '0', bondedToken.denom)}
                          </td>
                          <td className="p-4 font-mono text-right text-blue-600 dark:text-blue-400">
                            {initEquivalent}
                          </td>
                          <td className="p-4 font-mono text-right font-semibold">
                            {new Intl.NumberFormat('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }).format(totalAmount)}{' '}
                            (~${formatLargeNumber(totalUSDValue)})
                          </td>
                          <td className="p-4 font-mono text-right">
                            {(votingWeight * 100).toFixed(2)}%
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
