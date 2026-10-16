'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatAmount, formatCompact, formatPercent, formatShortDate } from '@/lib/format';
import type { StakingAsset, UnbondingAccount, UnbondingDay } from '@/lib/staking-types';

const EXPLORER_ACCOUNT_URL = 'https://scan.initia.xyz/interwoven-1/accounts/';
const COLLAPSED_ROWS = 10;

export interface AccountRow {
  address: string;
  init: number;
  lpTokens: number;
  /** INIT contained in the unlocking LP tokens */
  lpInit: number;
  total: number;
  validators: string[];
}

/** Accounts for one day, largest INIT-equivalent unlock first */
export function toAccountRows(accounts: UnbondingAccount[], lp: StakingAsset | undefined): AccountRow[] {
  return accounts
    .map((account) => {
      const init = account.amounts.uinit ?? 0;
      const lpTokens = lp ? account.amounts[lp.denom] ?? 0 : 0;
      const lpInit = lpTokens * (lp?.initPerToken ?? 0);
      return { address: account.address, init, lpTokens, lpInit, total: init + lpInit, validators: account.validators };
    })
    .sort((a, b) => b.total - a.total);
}

const shortAddress = (address: string) => `${address.slice(0, 10)}…${address.slice(-6)}`;

function AddressLink({ address }: { address: string }) {
  return (
    <a
      href={`${EXPLORER_ACCOUNT_URL}${address}`}
      target="_blank"
      rel="noopener noreferrer"
      title={address}
      className="inline-flex items-center gap-1 font-mono hover:underline"
    >
      {shortAddress(address)}
      <ExternalLink className="h-3 w-3 text-muted-foreground" />
    </a>
  );
}

function downloadCsv(
  schedule: UnbondingDay[],
  lp: StakingAsset | undefined,
  validatorNames: Record<string, string>
) {
  const lines = [['date', 'address', 'init', 'lp_tokens', 'lp_init', 'total_init', 'validators'].join(',')];
  for (const day of schedule) {
    for (const row of toAccountRows(day.accounts, lp)) {
      const validators = row.validators.map((v) => validatorNames[v] ?? v).join('; ');
      lines.push(
        [
          day.date,
          row.address,
          row.init.toFixed(6),
          row.lpTokens.toFixed(6),
          row.lpInit.toFixed(6),
          row.total.toFixed(6),
          `"${validators.replaceAll('"', '""')}"`,
        ].join(',')
      );
    }
  }
  const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `init-unlocks-${schedule[0]?.date ?? 'empty'}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function UnlockingAccounts({
  date,
  rows,
  lp,
  validatorNames,
  schedule,
  onPrevious,
  onNext,
}: {
  date: string;
  rows: AccountRow[];
  lp: StakingAsset | undefined;
  validatorNames: Record<string, string>;
  schedule: UnbondingDay[];
  onPrevious?: () => void;
  onNext?: () => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const dayTotal = rows.reduce((sum, row) => sum + row.total, 0);
  const visibleRows = showAll ? rows : rows.slice(0, COLLAPSED_ROWS);
  const lpName = lp?.name ?? 'LP';

  return (
    <div className="mt-6 border-t border-border pt-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={onPrevious} disabled={!onPrevious} aria-label="Previous day">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm">
            <span className="font-medium">Unlocking on {formatShortDate(date)}</span>
            <span className="text-muted-foreground">
              {' '}
              · {rows.length} {rows.length === 1 ? 'address' : 'addresses'} · {formatCompact(dayTotal)} INIT
            </span>
          </div>
          <Button variant="ghost" size="icon" onClick={onNext} disabled={!onNext} aria-label="Next day">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => downloadCsv(schedule, lp, validatorNames)}
          disabled={schedule.length === 0}
        >
          <Download className="h-3.5 w-3.5" />
          CSV, all days
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">Nothing finishes unbonding on this day.</p>
      ) : (
        <div>
          {/* Cards on phones, table from sm up */}
          <ol className="sm:hidden space-y-2">
            {visibleRows.map((row, index) => (
              <li key={row.address} className="border border-border p-3 text-xs space-y-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="flex items-baseline gap-2 min-w-0">
                    <span className="text-muted-foreground tabular-nums">{index + 1}</span>
                    <AddressLink address={row.address} />
                  </span>
                  <span className="text-muted-foreground tabular-nums">
                    {formatPercent(dayTotal > 0 ? row.total / dayTotal : 0, 1)}
                  </span>
                </div>
                <div className="font-mono text-sm font-medium">{formatAmount(row.total)} INIT</div>
                <div className="font-mono text-muted-foreground space-y-0.5">
                  {row.init > 0 && <div>{formatAmount(row.init)} INIT</div>}
                  {row.lpTokens > 0 && (
                    <div>
                      {formatAmount(row.lpTokens)} {lpName} ≈ {formatCompact(row.lpInit)} INIT
                    </div>
                  )}
                </div>
                <div className="text-muted-foreground truncate">
                  {row.validators.map((v) => validatorNames[v] ?? shortAddress(v)).join(', ')}
                </div>
              </li>
            ))}
          </ol>
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="text-muted-foreground border-b border-border">
                  <th className="text-left font-normal py-2 pr-2">#</th>
                  <th className="text-left font-normal py-2 pr-4">Address</th>
                  <th className="text-right font-normal py-2 px-2">INIT</th>
                  <th className="text-right font-normal py-2 px-2">{lpName}</th>
                  <th className="text-right font-normal py-2 px-2">Total INIT</th>
                  <th className="text-right font-normal py-2 px-2">Share</th>
                  <th className="hidden md:table-cell text-left font-normal py-2 pl-4">Validators</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row, index) => {
                  const validators = row.validators.map((v) => validatorNames[v] ?? shortAddress(v)).join(', ');
                  return (
                    <tr key={row.address} className="border-b border-border/50 last:border-0">
                      <td className="py-2 pr-2 text-muted-foreground tabular-nums">{index + 1}</td>
                      <td className="py-2 pr-4">
                        <AddressLink address={row.address} />
                      </td>
                      <td className="py-2 px-2 text-right font-mono tabular-nums">
                        {row.init > 0 ? formatAmount(row.init) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="py-2 px-2 text-right font-mono tabular-nums">
                        {row.lpTokens > 0 ? (
                          <>
                            {formatAmount(row.lpTokens)}
                            <div className="text-muted-foreground text-xs">≈ {formatCompact(row.lpInit)} INIT</div>
                          </>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-right font-mono tabular-nums font-medium">
                        {formatAmount(row.total)}
                      </td>
                      <td className="py-2 px-2 text-right font-mono tabular-nums text-muted-foreground">
                        {formatPercent(dayTotal > 0 ? row.total / dayTotal : 0, 1)}
                      </td>
                      <td className="hidden md:table-cell py-2 pl-4 max-w-56 truncate text-muted-foreground" title={validators}>
                        {validators}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {rows.length > COLLAPSED_ROWS && (
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => setShowAll(!showAll)}>
              {showAll ? `Show top ${COLLAPSED_ROWS}` : `Show all ${rows.length}`}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
