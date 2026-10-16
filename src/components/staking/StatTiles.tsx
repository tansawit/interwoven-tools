import { Card } from '@/components/ui/card';
import { formatCompact, formatPercent } from '@/lib/format';
import type { StakingResponse } from '@/lib/staking-types';

function StatTile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Card className="gap-1 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl sm:text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </Card>
  );
}

export function StatTiles({ data }: { data: StakingResponse }) {
  const init = data.assets.find((asset) => asset.denom === 'uinit');
  const lpAssets = data.assets.filter((asset) => asset.denom !== 'uinit');

  const initValue = (init?.staked ?? 0) * (init?.price ?? 0);
  const lpValue = lpAssets.reduce((sum, asset) => sum + asset.staked * asset.price, 0);
  const initInLp = lpAssets.reduce((sum, asset) => sum + asset.staked * asset.initPerToken, 0);
  const initSecuring = (init?.staked ?? 0) + initInLp;
  const lp = lpAssets[0];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <StatTile
        label="Total staked value"
        value={`$${formatCompact(initValue + lpValue)}`}
        sub={`INIT $${formatCompact(initValue)}, LP $${formatCompact(lpValue)}`}
      />
      <StatTile
        label="INIT supply staked"
        value={formatPercent(initSecuring / data.initSupply, 1)}
        sub={`${formatCompact(init?.staked ?? 0)} direct + ${formatCompact(initInLp)} in staked LP`}
      />
      <StatTile
        label="INIT staking APR"
        value={init?.apr ? formatPercent(init.apr.staking) : '—'}
        sub={
          lp?.apr
            ? `${lp.name}: ${formatPercent(lp.apr.total, 1)} incl. ${formatPercent(lp.apr.swapFee, 1)} fees`
            : 'Annualized staking rewards'
        }
      />
      <StatTile
        label="Active validators"
        value={`${data.validators.length} / ${data.maxValidators}`}
        sub={`${data.unbondingDays}-day unbonding period`}
      />
    </div>
  );
}
