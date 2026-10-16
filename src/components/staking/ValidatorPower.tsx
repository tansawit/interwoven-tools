import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCompact, formatPercent } from '@/lib/format';
import type { ValidatorSummary } from '@/lib/staking-types';

const HALT_THRESHOLD = 1 / 3;

export function ValidatorPower({
  validators,
  maxValidators,
}: {
  validators: ValidatorSummary[];
  maxValidators: number;
}) {
  const total = validators.reduce((sum, validator) => sum + validator.votingPower, 0);
  const shares = validators.map((validator) => (total > 0 ? validator.votingPower / total : 0));

  // Smallest number of validators that together exceed 1/3 of voting power (can halt the chain)
  let haltingCount = 0;
  let haltingShare = 0;
  while (haltingCount < shares.length && haltingShare <= HALT_THRESHOLD) {
    haltingShare += shares[haltingCount++];
  }
  const maxShare = shares[0] ?? 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base sm:text-lg">Validator voting power</CardTitle>
        <CardDescription>
          {validators.length} of {maxValidators} active validator slots are filled. The top{' '}
          {haltingCount} together hold{' '}
          <span className="text-orange-400 font-medium">{formatPercent(haltingShare, 1)}</span> of
          voting power, more than the one third needed to halt the chain.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="space-y-2">
          {validators.map((validator, index) => {
            const share = shares[index];
            const isHalting = index < haltingCount;
            return (
              <li
                key={validator.operatorAddress}
                className="grid grid-cols-[1.5rem_minmax(0,9rem)_1fr_auto] sm:grid-cols-[1.5rem_12rem_1fr_9rem] items-center gap-2 sm:gap-3 text-xs sm:text-sm"
              >
                <span className="text-muted-foreground tabular-nums">{index + 1}</span>
                <span className="truncate" title={validator.moniker}>
                  {validator.moniker}
                </span>
                <div className="h-3 bg-muted">
                  <div
                    className={isHalting ? 'h-full bg-orange-400' : 'h-full bg-zinc-500'}
                    style={{ width: `${(share / maxShare) * 100}%` }}
                  />
                </div>
                <span className="text-right tabular-nums font-mono">
                  {formatPercent(share, 1)}
                  <span className="hidden sm:inline text-muted-foreground">
                    {' '}
                    · {formatCompact(validator.votingPower)} · {formatPercent(validator.commission, 0)} fee
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
