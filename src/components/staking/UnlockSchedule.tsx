'use client';

import { useMemo } from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatAmount, formatCompact, formatShortDate } from '@/lib/format';
import type { StakingAsset, UnbondingDay } from '@/lib/staking-types';

const INIT_COLOR = '#fb923c'; // orange-400, matches the Unbonding column
const LP_COLOR = '#c084fc'; // purple-400
const CUMULATIVE_COLOR = '#ffffff';

interface UnlockRow {
  date: string;
  label: string;
  init: number;
  /** INIT contained in the unlocking LP tokens */
  lpInit: number;
  lpTokens: number;
  cumulative: number;
}

interface UnlockTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: UnlockRow }>;
  lpName: string;
}

function UnlockTooltip({ active, payload, lpName }: UnlockTooltipProps) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="bg-card border border-border p-3 text-xs space-y-1 shadow-lg">
      <p className="font-medium text-sm">{formatShortDate(row.date)}</p>
      <p style={{ color: INIT_COLOR }}>INIT: {formatAmount(row.init)}</p>
      <p style={{ color: LP_COLOR }}>
        {lpName}: {formatAmount(row.lpTokens)} LP ≈ {formatAmount(row.lpInit)} INIT
      </p>
      <p className="text-muted-foreground">Day total: {formatAmount(row.init + row.lpInit)} INIT</p>
      <p>Cumulative: {formatAmount(row.cumulative)} INIT</p>
    </div>
  );
}

export function UnlockSchedule({
  schedule,
  assets,
  unbondingDays,
}: {
  schedule: UnbondingDay[];
  assets: StakingAsset[];
  unbondingDays: number;
}) {
  const lp = assets.find((asset) => asset.denom !== 'uinit');

  const rows = useMemo(() => {
    const byDate = new Map(schedule.map((day) => [day.date, day.amounts]));
    const today = new Date();
    const result: UnlockRow[] = [];
    let cumulative = 0;

    // One bar per day, including days where nothing unlocks
    for (let i = 0; i <= unbondingDays; i++) {
      const date = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + i)
      )
        .toISOString()
        .slice(0, 10);
      const amounts = byDate.get(date) ?? {};
      const init = amounts.uinit ?? 0;
      const lpTokens = lp ? amounts[lp.denom] ?? 0 : 0;
      const lpInit = lpTokens * (lp?.initPerToken ?? 0);
      cumulative += init + lpInit;
      result.push({ date, label: formatShortDate(date), init, lpInit, lpTokens, cumulative });
    }
    return result;
  }, [schedule, unbondingDays, lp]);

  const total = rows.at(-1)?.cumulative ?? 0;
  const peak = rows.reduce((max, row) => (row.init + row.lpInit > max.init + max.lpInit ? row : max), rows[0]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base sm:text-lg">Unlock schedule</CardTitle>
        <CardDescription>
          {formatCompact(total)} INIT finishes unbonding over the next {unbondingDays} days
          {peak && peak.init + peak.lpInit > 0 &&
            `, the most on ${formatShortDate(peak.date)} (${formatCompact(peak.init + peak.lpInit)})`}
          . LP tokens are counted by the INIT they contain.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64 sm:h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={rows} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                axisLine={{ stroke: 'var(--border)' }}
                tickLine={false}
                minTickGap={16}
              />
              <YAxis
                yAxisId="daily"
                tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={48}
                tickFormatter={formatCompact}
              />
              <YAxis
                yAxisId="cumulative"
                orientation="right"
                tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={48}
                tickFormatter={formatCompact}
              />
              <Tooltip
                content={<UnlockTooltip lpName={lp?.name ?? 'LP'} />}
                cursor={{ fill: 'var(--muted)', opacity: 0.5 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar yAxisId="daily" dataKey="init" name="INIT" stackId="unlock" fill={INIT_COLOR} isAnimationActive={false} />
              <Bar
                yAxisId="daily"
                dataKey="lpInit"
                name={`INIT in ${lp?.name ?? 'LP'}`}
                stackId="unlock"
                fill={LP_COLOR}
                isAnimationActive={false}
              />
              <Line
                yAxisId="cumulative"
                dataKey="cumulative"
                name="Cumulative (right axis)"
                type="stepAfter"
                stroke={CUMULATIVE_COLOR}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
