import { NextRequest, NextResponse } from 'next/server';
import { fetchJson } from '@/lib/fetch-json';
import { INITIA_REST_URL } from '@/lib/move';
import { cacheHeaders } from '@/lib/server/cache';

interface Coin {
  denom: string;
  amount: string;
}

interface DelegationResponse {
  delegation_responses: Array<{
    delegation: { validator_address: string };
    balance: Coin[];
  }>;
}

interface UnbondingDelegationsResponse {
  unbonding_responses: Array<{
    validator_address: string;
    entries: Array<{ completion_time: string; balance: Coin[] }>;
  }>;
}

interface RewardsResponse {
  rewards: Array<{ validator_address: string; reward: Array<{ denom: string; amount: string }> }>;
  total: Array<{ denom: string; amount: string }>;
}

const DECIMALS = 1e6;
const toAmount = (amount: string | undefined) => Number(amount ?? 0) / DECIMALS;

function sumByDenom(coins: Coin[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const coin of coins) totals[coin.denom] = (totals[coin.denom] ?? 0) + toAmount(coin.amount);
  return totals;
}

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address')?.trim();
  if (!address || !/^init1[0-9a-z]{38,}$/.test(address)) {
    return NextResponse.json({ error: 'Provide a valid init1… delegator address' }, { status: 400 });
  }

  try {
    const [delegations, unbondings, rewards] = await Promise.all([
      fetchJson<DelegationResponse>(
        `${INITIA_REST_URL}/initia/mstaking/v1/delegations/${address}?pagination.limit=500`
      ),
      fetchJson<UnbondingDelegationsResponse>(
        `${INITIA_REST_URL}/initia/mstaking/v1/delegators/${address}/unbonding_delegations?pagination.limit=500`
      ),
      fetchJson<RewardsResponse>(
        `${INITIA_REST_URL}/cosmos/distribution/v1beta1/delegators/${address}/rewards`
      ).catch(() => ({ rewards: [], total: [] }) as RewardsResponse),
    ]);

    const delegated = sumByDenom(delegations.delegation_responses.flatMap((d) => d.balance));
    const unbonding = sumByDenom(
      unbondings.unbonding_responses.flatMap((u) => u.entries.flatMap((e) => e.balance))
    );
    const unbondingEntries = unbondings.unbonding_responses
      .flatMap((u) => u.entries.map((e) => ({ completionTime: e.completion_time, amounts: sumByDenom(e.balance) })))
      .sort((a, b) => a.completionTime.localeCompare(b.completionTime));

    return NextResponse.json(
      {
        address,
        delegated,
        unbonding,
        unbondingEntries,
        rewards: sumByDenom(rewards.total),
        validatorCount: delegations.delegation_responses.length,
      },
      { headers: cacheHeaders(15) }
    );
  } catch (error) {
    console.error('Error in delegator API:', error);
    return NextResponse.json({ error: 'Failed to fetch delegator data' }, { status: 500 });
  }
}
