'use client';

import { useEffect, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { SegmentedControl } from '@/components/staking/SegmentedControl';
import { fetchJson } from '@/lib/fetch-json';
import { formatAmount, formatCompact, formatShortDate } from '@/lib/format';
import type { HistoryPoint, HistoryRange, StakingAsset } from '@/lib/staking-types';

type Metric = 'staked' | 'unbonding' | 'value';

const RANGES: Array<{ value: HistoryRange; label: string }> = [
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
  { value: '180d', label: '180D' },
];
const METRICS: Array<{ value: Metric; label: string }> = [
  { value: 'staked', label: 'Staked' },
  { value: 'unbonding', label: 'Not bonded' },
  { value: 'value', label: 'USD value' },
];

const LINE_COLORS = ['#4ade80', '#c084fc'];

interface TrendRow {
  time: string;
  label: string;
  [assetName: string]: string | number;
}

function buildRows(history: HistoryPoint[], assets: StakingAsset[], metric: Metric): TrendRow[] {
  return history.map((point) => {
    const row: TrendRow = { time: point.time, label: formatShortDate(point.time) };
    for (const asset of assets) {
      const staked = point.staked[asset.denom] ?? 0;
      const notBonded = point.notBonded[asset.denom] ?? 0;
      row[asset.name] =
        metric === 'staked' ? staked : metric === 'unbonding' ? notBonded : staked * asset.price;
    }
    return row;
  });
}

interface TrendTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; payload: TrendRow }>;
  metric: Metric;
}

function TrendTooltip({ active, payload, metric }: TrendTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border p-3 text-xs space-y-1 shadow-lg">
      <p className="font-medium text-sm">{formatShortDate(payload[0].payload.time)}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: {metric === 'value' ? '$' : ''}
          {formatAmount(entry.value)}
        </p>
      ))}
    </div>
  );
}

export function StakeTrend({ assets }: { assets: StakingAsset[] }) {
  const [range, setRange] = useState<HistoryRange>('30d');
  const [metric, setMetric] = useState<Metric>('staked');
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchJson<HistoryPoint[]>(`/api/staking/history?range=${range}`, { timeoutMs: 60_000 })
      .then((data) => {
        if (cancelled) return;
        setHistory(data);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        console.error('Failed to fetch staking history:', e);
        setError(true);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  const selectRange = (next: HistoryRange) => {
    if (next === range) return;
    setLoading(true);
    setError(false);
    setRange(next);
  };

  const rows = buildRows(history, assets, metric);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base sm:text-lg">Staking over time</CardTitle>
            <CardDescription>
              {metric === 'staked' && 'Bonded tokens'}
              {metric === 'unbonding' && 'Not-bonded tokens (unbonding + inactive)'}
              {metric === 'value' && 'USD value of bonded tokens, at the current price'}
              . Sampled from historical chain state.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <SegmentedControl options={METRICS} value={metric} onChange={setMetric} label="Metric" />
            <SegmentedControl options={RANGES} value={range} onChange={selectRange} label="Time range" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64 sm:h-80 w-full">
          {loading ? (
            <Skeleton className="h-full w-full" />
          ) : error ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Failed to load history
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rows} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                  axisLine={{ stroke: 'var(--border)' }}
                  tickLine={false}
                  minTickGap={24}
                />
                <YAxis
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={52}
                  domain={['auto', 'auto']}
                  tickFormatter={(value) => (metric === 'value' ? '$' : '') + formatCompact(value)}
                />
                <Tooltip content={<TrendTooltip metric={metric} />} />
                {assets.map((asset, index) => (
                  <Line
                    key={asset.denom}
                    type="monotone"
                    dataKey={asset.name}
                    stroke={LINE_COLORS[index % LINE_COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
