const numberFormat = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 1234.5 -> "1,234.50" */
export const formatAmount = (value: number) => numberFormat.format(value);

/** 1234567 -> "1.2M" */
export function formatCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e9) return (value / 1e9).toFixed(1) + 'B';
  if (abs >= 1e6) return (value / 1e6).toFixed(1) + 'M';
  if (abs >= 1e3) return (value / 1e3).toFixed(1) + 'K';
  return value.toFixed(0);
}

/** 0.1234 -> "12.34%" */
export const formatPercent = (value: number, digits = 2) => `${(value * 100).toFixed(digits)}%`;

/** "2026-10-30" or an ISO time -> "Oct 30" */
export const formatShortDate = (date: string) =>
  new Date(date.length === 10 ? `${date}T00:00:00Z` : date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
