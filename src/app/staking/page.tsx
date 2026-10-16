'use client';

import { Activity, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DelegatorLookup } from '@/components/staking/DelegatorLookup';
import { StakeTable } from '@/components/staking/StakeTable';
import { StakeTrend } from '@/components/staking/StakeTrend';
import { StatTiles } from '@/components/staking/StatTiles';
import { UnlockSchedule } from '@/components/staking/UnlockSchedule';
import { fetchJson } from '@/lib/fetch-json';
import { useFetch } from '@/lib/hooks/useFetch';
import type { StakingResponse } from '@/lib/staking-types';

const REFRESH_INTERVAL = 60_000;

const loadStaking = () => fetchJson<StakingResponse>('/api/staking', { timeoutMs: 30_000 });

export default function StakingMonitor() {
  const { data, loading, error, lastUpdated, refresh } = useFetch(loadStaking, {
    refreshInterval: REFRESH_INTERVAL,
  });

  return (
    <div className="container mx-auto py-4 sm:py-6 lg:py-8 px-4 max-w-7xl">
      <div className="space-y-4 sm:space-y-6 lg:space-y-8">
        {/* Header */}
        <div className="text-center space-y-2 sm:space-y-4">
          <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold tracking-tight">
            Staking
          </h1>
          <p className="text-muted-foreground text-xs sm:text-base lg:text-lg px-2 sm:px-4">
            INIT and Enshrined Liquidity staking, validators and unbonding
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
              onClick={refresh}
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
              Loading staking data...
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

        {data && (
          <div className="space-y-4 sm:space-y-6">
            <StatTiles data={data} />
            <StakeTable assets={data.assets} />
            <UnlockSchedule
              positions={data.unbondingPositions}
              assets={data.assets}
              unbondingDays={data.unbondingDays}
              validatorNames={data.validatorNames}
            />
            <StakeTrend assets={data.assets} />
            <DelegatorLookup />
          </div>
        )}
      </div>
    </div>
  );
}
