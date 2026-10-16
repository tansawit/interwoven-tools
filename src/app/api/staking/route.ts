import { NextResponse } from 'next/server';
import { cached, cacheHeaders } from '@/lib/server/cache';
import { getStakingOverview, getUnbondingSchedule, getValidators } from '@/lib/server/staking';
import type { StakingResponse } from '@/lib/staking-types';

const CACHE_TTL_MS = 30_000;
// The unbonding queue needs one request per validator, so refresh it less often.
const SCHEDULE_TTL_MS = 5 * 60_000;

async function loadStaking(): Promise<StakingResponse> {
  const validators = await cached('staking:validators', CACHE_TTL_MS, getValidators);
  const [overview, unbondingSchedule] = await Promise.all([
    getStakingOverview(validators),
    cached('staking:unbonding-schedule', SCHEDULE_TTL_MS, () => getUnbondingSchedule(validators)),
  ]);
  return { ...overview, unbondingSchedule };
}

export async function GET() {
  try {
    const data = await cached('staking', CACHE_TTL_MS, loadStaking);
    return NextResponse.json(data, { headers: cacheHeaders(CACHE_TTL_MS / 1000) });
  } catch (error) {
    console.error('Error in staking API:', error);
    return NextResponse.json({ error: 'Failed to fetch staking data' }, { status: 500 });
  }
}
