import { formatAmount, formatCompact, formatPercent } from '@/lib/format';
import type { StakingAsset } from '@/lib/staking-types';

function AmountCell({
  amount,
  asset,
  className,
  showInit = false,
}: {
  amount: number;
  asset: StakingAsset;
  className?: string;
  showInit?: boolean;
}) {
  return (
    <div className={className}>
      <div className="font-mono">{formatAmount(amount)}</div>
      <div className="text-xs text-muted-foreground font-mono">
        ~${formatCompact(amount * asset.price)}
        {showInit && asset.denom !== 'uinit' && ` · ≈ ${formatCompact(amount * asset.initPerToken)} INIT`}
      </div>
    </div>
  );
}

/** Staked / unbonding / inactive stake per bond denom. */
export function StakeTable({ assets }: { assets: StakingAsset[] }) {
  const totalVotingPower = assets.reduce(
    (sum, asset) => sum + asset.staked * asset.votingPowerWeight,
    0
  );
  const rows = assets.map((asset) => ({
    asset,
    total: asset.staked + asset.unbonding + asset.inactive,
    votingPowerShare:
      totalVotingPower > 0 ? (asset.staked * asset.votingPowerWeight) / totalVotingPower : 0,
  }));

  return (
    <>
      {/* Mobile Cards View */}
      <div className="block lg:hidden space-y-3">
        {rows.map(({ asset, total, votingPowerShare }) => (
          <div key={asset.denom} className="border border-border bg-card p-3 sm:p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base">{asset.name}</h3>
              <span className="text-xs text-muted-foreground">
                {formatPercent(votingPowerShare, 1)} of voting power
              </span>
            </div>
            <dl className="space-y-2 text-xs">
              {(
                [
                  ['Staked', asset.staked, 'text-green-400', false],
                  ['Unbonding', asset.unbonding, 'text-orange-400', true],
                  ['On inactive validators', asset.inactive, 'text-muted-foreground', true],
                ] as const
              ).map(([label, amount, color, showInit]) => (
                <div key={label} className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className={`text-right break-all ${color}`}>
                    <AmountCell amount={amount} asset={asset} showInit={showInit} />
                  </dd>
                </div>
              ))}
              <div className="flex justify-between gap-4 border-t border-border pt-2 font-semibold">
                <dt>Total</dt>
                <dd className="text-right">
                  <AmountCell amount={total} asset={asset} />
                </dd>
              </div>
            </dl>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="border-b border-border">
              <th className="text-left p-4 font-semibold">Token</th>
              <th className="text-right p-4 font-semibold">Staked</th>
              <th className="text-right p-4 font-semibold">Unbonding</th>
              <th className="text-right p-4 font-semibold">On inactive validators</th>
              <th className="text-right p-4 font-semibold">Total</th>
              <th className="text-right p-4 font-semibold">Voting power</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ asset, total, votingPowerShare }) => (
              <tr key={asset.denom} className="border-b border-border hover:bg-muted/30">
                <td className="p-4 font-medium">{asset.name}</td>
                <td className="p-4 text-right text-green-400">
                  <AmountCell amount={asset.staked} asset={asset} />
                </td>
                <td className="p-4 text-right text-orange-400">
                  <AmountCell amount={asset.unbonding} asset={asset} showInit />
                </td>
                <td className="p-4 text-right text-muted-foreground">
                  <AmountCell amount={asset.inactive} asset={asset} showInit />
                </td>
                <td className="p-4 text-right font-semibold">
                  <AmountCell amount={total} asset={asset} />
                </td>
                <td className="p-4 text-right">
                  <div className="font-mono">{formatPercent(votingPowerShare, 1)}</div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {asset.votingPowerWeight.toFixed(2)}× per token
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
