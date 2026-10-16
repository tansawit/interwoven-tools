'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetchJson } from '@/lib/fetch-json';
import { formatAmount, formatShortDate } from '@/lib/format';

interface DelegatorData {
  address: string;
  delegated: Record<string, number>;
  unbonding: Record<string, number>;
  unbondingEntries: Array<{ completionTime: string; amounts: Record<string, number> }>;
  rewards: Record<string, number>;
  validatorCount: number;
}

const NAMES: Record<string, string> = {
  uinit: 'INIT',
  'move/543b35a39cfadad3da3c23249c474455d15efd2f94f849473226dee8a3c7a9e1': 'INIT-USDC LP',
};
const nameOf = (denom: string) => NAMES[denom] ?? denom;

function Amounts({ amounts }: { amounts: Record<string, number> }) {
  const entries = Object.entries(amounts).filter(([, amount]) => amount > 0);
  if (entries.length === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="space-y-0.5">
      {entries.map(([denom, amount]) => (
        <div key={denom} className="font-mono">
          {formatAmount(amount)} <span className="text-muted-foreground">{nameOf(denom)}</span>
        </div>
      ))}
    </div>
  );
}

export function DelegatorLookup() {
  const [address, setAddress] = useState('');
  const [data, setData] = useState<DelegatorData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookup = async () => {
    const trimmed = address.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      setData(
        await fetchJson<DelegatorData>(
          `/api/staking/delegator?address=${encodeURIComponent(trimmed)}`,
          { timeoutMs: 20_000 }
        )
      );
    } catch (e) {
      console.error('Failed to look up delegator:', e);
      setError('No delegations found for that address, or the lookup failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base sm:text-lg">Address lookup</CardTitle>
        <CardDescription>
          See the delegations, pending unbondings and claimable rewards for any init address.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="flex flex-col sm:flex-row gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            lookup();
          }}
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="init1…"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="pl-9 font-mono text-xs sm:text-sm"
            />
          </div>
          <Button type="submit" variant="outline" disabled={loading || !address.trim()}>
            {loading ? 'Looking up…' : 'Look up'}
          </Button>
        </form>

        {error && <p className="text-sm text-red-400">{error}</p>}

        {data && (
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                Delegated ({data.validatorCount} validator{data.validatorCount === 1 ? '' : 's'})
              </p>
              <div className="text-sm text-green-400">
                <Amounts amounts={data.delegated} />
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Unbonding</p>
              <div className="text-sm text-orange-400">
                <Amounts amounts={data.unbonding} />
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Claimable rewards</p>
              <div className="text-sm text-blue-400">
                <Amounts amounts={data.rewards} />
              </div>
            </div>
          </div>
        )}

        {data && data.unbondingEntries.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Unbonding completes</p>
            <ul className="space-y-1 text-xs">
              {data.unbondingEntries.map((entry, index) => (
                <li key={index} className="flex justify-between gap-4 border-b border-border pb-1">
                  <span>{formatShortDate(entry.completionTime)}</span>
                  <span className="text-right">
                    <Amounts amounts={entry.amounts} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
