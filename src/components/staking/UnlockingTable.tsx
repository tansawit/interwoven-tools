'use client';

import { Fragment, useMemo, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Download, ExternalLink, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatAmount, formatCompact, formatPercent, formatShortDate } from '@/lib/format';
import type { StakingAsset, UnbondingPosition } from '@/lib/staking-types';

const EXPLORER_ACCOUNT_URL = 'https://scan.initia.xyz/interwoven-1/accounts/';
const COLLAPSED_ROWS = 20;

interface Amounts {
  init: number;
  lpTokens: number;
  /** INIT contained in the LP tokens */
  lpInit: number;
  total: number;
}

interface PositionRow extends Amounts {
  date: string;
  /** "Oct 25, 14:32 UTC" */
  time: string;
  validator: string;
  completionTime: string;
}

interface AddressRow extends Amounts {
  address: string;
  positions: PositionRow[];
  validators: string[];
}

/** UTC date (YYYY-MM-DD) an unbonding position completes */
export const positionDate = (position: UnbondingPosition) => position.completionTime.slice(0, 10);

/** INIT, LP and INIT-equivalent amounts of one unbonding position */
export function positionAmounts(position: UnbondingPosition, lp: StakingAsset | undefined): Amounts {
  const init = position.amounts.uinit ?? 0;
  const lpTokens = lp ? position.amounts[lp.denom] ?? 0 : 0;
  const lpInit = lpTokens * (lp?.initPerToken ?? 0);
  return { init, lpTokens, lpInit, total: init + lpInit };
}

const formatTime = (completionTime: string) =>
  // Chain times carry nanoseconds, which Date does not parse
  new Date(`${completionTime.slice(0, 19)}Z`).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'UTC',
  }) + ' UTC';

const shortAddress = (address: string) => `${address.slice(0, 10)}…${address.slice(-6)}`;

/** One row per address, largest INIT-equivalent unlock first */
function groupByAddress(
  positions: UnbondingPosition[],
  lp: StakingAsset | undefined,
  validatorNames: Record<string, string>
): AddressRow[] {
  const byAddress = new Map<string, AddressRow>();
  for (const position of positions) {
    const amounts = positionAmounts(position, lp);
    let row = byAddress.get(position.address);
    if (!row) {
      row = { address: position.address, init: 0, lpTokens: 0, lpInit: 0, total: 0, positions: [], validators: [] };
      byAddress.set(position.address, row);
    }
    row.init += amounts.init;
    row.lpTokens += amounts.lpTokens;
    row.lpInit += amounts.lpInit;
    row.total += amounts.total;
    const validator = validatorNames[position.validator] ?? shortAddress(position.validator);
    if (!row.validators.includes(validator)) row.validators.push(validator);
    row.positions.push({
      ...amounts,
      date: positionDate(position),
      time: formatTime(position.completionTime),
      validator,
      completionTime: position.completionTime,
    });
  }
  return [...byAddress.values()].sort((a, b) => b.total - a.total);
}

function dateRange(positions: PositionRow[]) {
  const first = positions[0].date;
  const last = positions.at(-1)!.date;
  return first === last ? formatShortDate(first) : `${formatShortDate(first)} – ${formatShortDate(last)}`;
}

function downloadCsv(rows: AddressRow[], filename: string) {
  const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;
  const lines = [['completion_time', 'address', 'validator', 'init', 'lp_tokens', 'lp_init', 'total_init'].join(',')];
  for (const row of rows) {
    for (const position of row.positions) {
      lines.push(
        [
          position.completionTime,
          row.address,
          quote(position.validator),
          position.init.toFixed(6),
          position.lpTokens.toFixed(6),
          position.lpInit.toFixed(6),
          position.total.toFixed(6),
        ].join(',')
      );
    }
  }
  const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function AddressLink({ address }: { address: string }) {
  return (
    <a
      href={`${EXPLORER_ACCOUNT_URL}${address}`}
      target="_blank"
      rel="noopener noreferrer"
      title={address}
      onClick={(event) => event.stopPropagation()}
      className="inline-flex items-center gap-1 font-mono hover:underline"
    >
      {shortAddress(address)}
      <ExternalLink className="h-3 w-3 text-muted-foreground" />
    </a>
  );
}

function Dash() {
  return <span className="text-muted-foreground">—</span>;
}

export function UnlockingTable({
  positions,
  lp,
  validatorNames,
  days,
  selectedDate,
  onSelectDate,
}: {
  positions: UnbondingPosition[];
  lp: StakingAsset | undefined;
  validatorNames: Record<string, string>;
  /** Every date in the unlock window, in order */
  days: string[];
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
}) {
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = positions.filter(
      (position) =>
        (!selectedDate || positionDate(position) === selectedDate) &&
        (!needle || position.address.toLowerCase().includes(needle))
    );
    return groupByAddress(filtered, lp, validatorNames);
  }, [positions, selectedDate, query, lp, validatorNames]);

  const total = rows.reduce((sum, row) => sum + row.total, 0);
  const positionCount = rows.reduce((sum, row) => sum + row.positions.length, 0);
  const visibleRows = showAll ? rows : rows.slice(0, COLLAPSED_ROWS);
  const lpName = lp?.name ?? 'LP';
  const dayIndex = selectedDate ? days.indexOf(selectedDate) : -1;

  const toggle = (address: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(address)) next.delete(address);
      else next.add(address);
      return next;
    });

  return (
    <div className="mt-6 border-t border-border pt-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm">
          {selectedDate ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onSelectDate(days[dayIndex - 1])}
                disabled={dayIndex <= 0}
                aria-label="Previous day"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-medium">Unlocking on {formatShortDate(selectedDate)}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onSelectDate(days[dayIndex + 1])}
                disabled={dayIndex < 0 || dayIndex >= days.length - 1}
                aria-label="Next day"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => onSelectDate(null)}>
                <X className="h-3.5 w-3.5" />
                All days
              </Button>
            </>
          ) : (
            <span className="font-medium">All unlocks, next {days.length - 1} days</span>
          )}
          <span className="text-muted-foreground w-full sm:w-auto sm:ml-2">
            {rows.length} {rows.length === 1 ? 'address' : 'addresses'} · {positionCount}{' '}
            {positionCount === 1 ? 'position' : 'positions'} · {formatCompact(total)} INIT
          </span>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter by address"
              className="h-8 pl-8 text-xs font-mono"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadCsv(rows, `init-unlocks-${selectedDate ?? 'all'}.csv`)}
            disabled={rows.length === 0}
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">
          {query ? 'No unlocking address matches that filter.' : 'Nothing finishes unbonding on this day.'}
        </p>
      ) : (
        <div>
          {/* Cards on phones, table from sm up */}
          <ol className="sm:hidden space-y-2">
            {visibleRows.map((row, index) => {
              const isOpen = expanded.has(row.address);
              return (
                <li key={row.address} className="border border-border p-3 text-xs space-y-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="flex items-baseline gap-2 min-w-0">
                      <span className="text-muted-foreground tabular-nums">{index + 1}</span>
                      <AddressLink address={row.address} />
                    </span>
                    <span className="text-muted-foreground tabular-nums">
                      {formatPercent(total > 0 ? row.total / total : 0, 1)}
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
                  <div className="text-muted-foreground truncate">{row.validators.join(', ')}</div>
                  <button
                    type="button"
                    onClick={() => toggle(row.address)}
                    aria-expanded={isOpen}
                    className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                  >
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    {row.positions.length} {row.positions.length === 1 ? 'position' : 'positions'} ·{' '}
                    {dateRange(row.positions)}
                  </button>
                  {isOpen && (
                    <ul className="border-t border-border/50 pt-1.5 space-y-1.5">
                      {row.positions.map((position, i) => (
                        <li key={i} className="flex justify-between gap-2">
                          <span className="min-w-0">
                            <div>{position.time}</div>
                            <div className="text-muted-foreground truncate">{position.validator}</div>
                          </span>
                          <span className="font-mono text-right shrink-0">
                            {formatAmount(position.total)}
                            <div className="text-muted-foreground">
                              {position.lpTokens > 0 ? `${formatAmount(position.lpTokens)} LP` : 'INIT'}
                            </div>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ol>

          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="text-muted-foreground border-b border-border">
                  <th className="w-6" />
                  <th className="text-left font-normal py-2 pr-2">#</th>
                  <th className="text-left font-normal py-2 pr-4">Address</th>
                  <th className="text-right font-normal py-2 px-2">INIT</th>
                  <th className="text-right font-normal py-2 px-2">{lpName}</th>
                  <th className="text-right font-normal py-2 px-2">Total INIT</th>
                  <th className="text-right font-normal py-2 px-2">Share</th>
                  <th className="text-left font-normal py-2 pl-4">Unlocks</th>
                  <th className="hidden lg:table-cell text-left font-normal py-2 pl-4">Validators</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row, index) => {
                  const isOpen = expanded.has(row.address);
                  return (
                    <Fragment key={row.address}>
                      <tr
                        onClick={() => toggle(row.address)}
                        aria-expanded={isOpen}
                        className="border-b border-border/50 cursor-pointer hover:bg-muted/40"
                      >
                        <td className="py-2 pl-1 text-muted-foreground">
                          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </td>
                        <td className="py-2 pr-2 text-muted-foreground tabular-nums">{index + 1}</td>
                        <td className="py-2 pr-4">
                          <AddressLink address={row.address} />
                        </td>
                        <td className="py-2 px-2 text-right font-mono tabular-nums">
                          {row.init > 0 ? formatAmount(row.init) : <Dash />}
                        </td>
                        <td className="py-2 px-2 text-right font-mono tabular-nums">
                          {row.lpTokens > 0 ? (
                            <>
                              {formatAmount(row.lpTokens)}
                              <div className="text-muted-foreground text-xs">≈ {formatCompact(row.lpInit)} INIT</div>
                            </>
                          ) : (
                            <Dash />
                          )}
                        </td>
                        <td className="py-2 px-2 text-right font-mono tabular-nums font-medium">
                          {formatAmount(row.total)}
                        </td>
                        <td className="py-2 px-2 text-right font-mono tabular-nums text-muted-foreground">
                          {formatPercent(total > 0 ? row.total / total : 0, 1)}
                        </td>
                        <td className="py-2 pl-4 text-muted-foreground">
                          <span className="text-foreground tabular-nums">{row.positions.length}</span> ·{' '}
                          {dateRange(row.positions)}
                        </td>
                        <td
                          className="hidden lg:table-cell py-2 pl-4 max-w-56 truncate text-muted-foreground"
                          title={row.validators.join(', ')}
                        >
                          {row.validators.join(', ')}
                        </td>
                      </tr>
                      {isOpen &&
                        row.positions.map((position, i) => (
                          <tr key={i} className="bg-muted/30 border-b border-border/30 text-xs">
                            <td />
                            <td />
                            <td className="py-1.5 pr-4">
                              {position.time}
                              <span className="lg:hidden text-muted-foreground"> · {position.validator}</span>
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono tabular-nums">
                              {position.init > 0 ? formatAmount(position.init) : <Dash />}
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono tabular-nums">
                              {position.lpTokens > 0 ? formatAmount(position.lpTokens) : <Dash />}
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono tabular-nums">
                              {formatAmount(position.total)}
                            </td>
                            <td />
                            <td className="py-1.5 pl-4">
                              {!selectedDate && (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    onSelectDate(position.date);
                                  }}
                                  className="text-muted-foreground hover:text-foreground hover:underline"
                                >
                                  Show {formatShortDate(position.date)}
                                </button>
                              )}
                            </td>
                            <td className="hidden lg:table-cell py-1.5 pl-4 max-w-56 truncate text-muted-foreground">
                              {position.validator}
                            </td>
                          </tr>
                        ))}
                    </Fragment>
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
