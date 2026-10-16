import { NextResponse } from 'next/server';
import { bcs } from '@/lib/bcs';
import { fetchJson } from '@/lib/fetch-json';
import { INITIA_REST_URL, viewFunction } from '@/lib/move';
import { cached, cacheHeaders } from '@/lib/server/cache';

interface TokenAmount {
  denom: string;
  amount: string;
}

interface StakingData {
  pool: {
    not_bonded_tokens: TokenAmount[];
    bonded_tokens: TokenAmount[];
    voting_power_weights: TokenAmount[];
  };
}

interface PriceData {
  [denom: string]: number;
}

interface PoolComposition {
  initAmount: number;
  totalShares: number;
  initDenom: string;
}

interface DexPoolResponse {
  pool: {
    coins: Array<{ denom: string; metadata: string }>;
  };
}

interface PoolInfo {
  coin_a_amount: string;
  coin_b_amount: string;
  total_share: string;
}

interface LpPool {
  denom: string;
  coinA: string;
  coinB: string;
  info: PoolInfo;
}

const DEX_API_URL = 'https://dex-api.initia.xyz/indexer';
const CACHE_TTL_MS = 30_000;

async function fetchPrices(denoms: string[]): Promise<PriceData> {
  try {
    const query = denoms.map(encodeURIComponent).join(',');
    const { prices } = await fetchJson<{ prices: PriceData }>(
      `${DEX_API_URL}/price/v1/prices/${query}`
    );
    return prices;
  } catch (error) {
    console.error('Error fetching prices:', error);
    return {};
  }
}

/** Loads the two underlying coins and reserves of an Enshrined Liquidity LP token. */
async function fetchLpPool(denom: string): Promise<LpPool | null> {
  try {
    // LP denoms are `move/<metadata address>`.
    const metadata = `0x${denom.replace(/^move\//, '')}`;
    const [{ pool }, info] = await Promise.all([
      fetchJson<DexPoolResponse>(`${DEX_API_URL}/dex/v1/pools/${encodeURIComponent(denom)}`),
      viewFunction<PoolInfo>(INITIA_REST_URL, '0x1', 'dex', 'get_pool_info', [bcs.address(metadata)]),
    ]);
    if (pool.coins.length < 2) return null;
    return { denom, coinA: pool.coins[0].denom, coinB: pool.coins[1].denom, info };
  } catch (error) {
    console.error(`Failed to process LP token ${denom}:`, error);
    return null;
  }
}

async function loadStakingData() {
  const stakingData = await fetchJson<StakingData>(`${INITIA_REST_URL}/initia/mstaking/v1/pool`);

  const lpDenoms = stakingData.pool.bonded_tokens
    .map((token) => token.denom)
    .filter((denom) => denom !== 'uinit');
  const lpPools = (await Promise.all(lpDenoms.map(fetchLpPool))).filter(
    (pool): pool is LpPool => pool !== null
  );

  const priceDenoms = new Set(['uinit', ...lpPools.flatMap((pool) => [pool.coinA, pool.coinB])]);
  const tokenPrices = await fetchPrices([...priceDenoms]);

  const prices: PriceData = Object.fromEntries(lpDenoms.map((denom) => [denom, 0]));
  prices.uinit = tokenPrices.uinit || 0;
  const poolCompositions: { [denom: string]: PoolComposition } = {};

  for (const { denom, coinA, coinB, info } of lpPools) {
    const amountA = parseFloat(info.coin_a_amount) / 1e6;
    const amountB = parseFloat(info.coin_b_amount) / 1e6;
    const totalShares = parseFloat(info.total_share) / 1e6;

    poolCompositions[denom] = {
      initAmount: coinA === 'uinit' ? amountA : coinB === 'uinit' ? amountB : 0,
      totalShares,
      initDenom: 'uinit',
    };

    const totalValue = amountA * (tokenPrices[coinA] || 0) + amountB * (tokenPrices[coinB] || 0);
    prices[denom] = totalShares > 0 ? totalValue / totalShares : 0;
  }

  return { stakingData, prices, poolCompositions };
}

export async function GET() {
  try {
    const data = await cached('staking', CACHE_TTL_MS, loadStakingData);
    return NextResponse.json(data, { headers: cacheHeaders(CACHE_TTL_MS / 1000) });
  } catch (error) {
    console.error('Error in staking API:', error);
    return NextResponse.json({ error: 'Failed to fetch staking data and prices' }, { status: 500 });
  }
}
