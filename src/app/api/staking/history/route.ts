import { NextRequest, NextResponse } from 'next/server';
import { cached, cacheHeaders } from '@/lib/server/cache';
import { getStakingHistory } from '@/lib/server/staking';
import type { HistoryRange } from '@/lib/staking-types';

const CACHE_TTL_MS = 60 * 60_000;
const RANGES: HistoryRange[] = ['30d', '90d', '180d'];

export async function GET(request: NextRequest) {
  const range = request.nextUrl.searchParams.get('range') ?? '30d';
  if (!RANGES.includes(range as HistoryRange)) {
    return NextResponse.json({ error: `range must be one of ${RANGES.join(', ')}` }, { status: 400 });
  }

  try {
    const data = await cached(`staking-history:${range}`, CACHE_TTL_MS, () =>
      getStakingHistory(range as HistoryRange)
    );
    return NextResponse.json(data, { headers: cacheHeaders(CACHE_TTL_MS / 1000) });
  } catch (error) {
    console.error('Error in staking history API:', error);
    return NextResponse.json({ error: 'Failed to fetch staking history' }, { status: 500 });
  }
}
