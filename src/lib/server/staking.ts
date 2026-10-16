import 'server-only';
import { bcs } from '@/lib/bcs';
import { fetchJson } from '@/lib/fetch-json';
import { INITIA_REST_URL, viewFunction } from '@/lib/move';
import type {
  AssetApr,
  HistoryPoint,
  HistoryRange,
  StakingAsset,
  UnbondingDay,
  ValidatorSummary,
} from '@/lib/staking-types';

interface Coin {
  denom: string;
  amount: string;
}

interface StakingPool {
  pool: {
    not_bonded_tokens: Coin[];
    bonded_tokens: Coin[];
    voting_power_weights: Coin[];
  };
}

interface Validator {
  operator_address: string;
  status: string;
  description: { moniker: string };
  commission: { commission_rates: { rate: string } };
  tokens: Coin[];
  voting_power: string;
}

interface UnbondingResponse {
  unbonding_responses: Array<{ entries: Array<{ completion_time: string; balance: Coin[] }> }>;
  pagination?: { next_key: string | null };
}

interface PoolInfo {
  coin_a_amount: string;
  coin_b_amount: string;
  total_share: string;
}

const DEX_API_URL = 'https://dex-api.initia.xyz/indexer';
const DECIMALS = 1e6;
const TOKEN_NAMES: Record<string, string> = {
  uinit: 'INIT',
  'move/543b35a39cfadad3da3c23249c474455d15efd2f94f849473226dee8a3c7a9e1': 'INIT-USDC LP',
};

const toAmount = (amount: string | undefined) => Number(amount ?? 0) / DECIMALS;
const amountOf = (coins: Coin[], denom: string) =>
  toAmount(coins.find((coin) => coin.denom === denom)?.amount);

/** Runs `fn` over `items` with at most `limit` calls in flight. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function getPool(height?: number) {
  return fetchJson<StakingPool>(`${INITIA_REST_URL}/initia/mstaking/v1/pool`, {
    headers: height ? { 'x-cosmos-block-height': String(height) } : undefined,
  });
}

export async function getValidators(): Promise<Validator[]> {
  const { validators } = await fetchJson<{ validators: Validator[] }>(
    `${INITIA_REST_URL}/initia/mstaking/v1/validators?pagination.limit=1000`
  );
  return validators;
}

async function getPrices(denoms: string[]): Promise<Record<string, number>> {
  try {
    const query = denoms.map(encodeURIComponent).join(',');
    const { prices } = await fetchJson<{ prices: Record<string, number> }>(
      `${DEX_API_URL}/price/v1/prices/${query}`
    );
    return prices;
  } catch (error) {
    console.error('Error fetching prices:', error);
    return {};
  }
}

async function getAprs(): Promise<Record<string, AssetApr>> {
  try {
    const { aprs } = await fetchJson<{
      aprs: Array<{ denom: string; staking_apr: number; swap_fee_apr: number; total_apr: number }>;
    }>(`${DEX_API_URL}/dex/v1/aprs`);
    return Object.fromEntries(
      aprs.map((apr) => [
        apr.denom,
        { staking: apr.staking_apr, swapFee: apr.swap_fee_apr, total: apr.total_apr },
      ])
    );
  } catch (error) {
    console.error('Error fetching APRs:', error);
    return {};
  }
}

interface LpPool {
  denom: string;
  coinA: string;
  coinB: string;
  info: PoolInfo;
}

/** Loads the two underlying coins and reserves of an Enshrined Liquidity LP token. */
async function getLpPool(denom: string): Promise<LpPool | null> {
  try {
    const metadata = `0x${denom.replace(/^move\//, '')}`; // LP denoms are `move/<metadata>`
    const [{ pool }, info] = await Promise.all([
      fetchJson<{ pool: { coins: Coin[] } }>(
        `${DEX_API_URL}/dex/v1/pools/${encodeURIComponent(denom)}`
      ),
      viewFunction<PoolInfo>(INITIA_REST_URL, '0x1', 'dex', 'get_pool_info', [bcs.address(metadata)]),
    ]);
    if (pool.coins.length < 2) return null;
    return { denom, coinA: pool.coins[0].denom, coinB: pool.coins[1].denom, info };
  } catch (error) {
    console.error(`Failed to load LP pool ${denom}:`, error);
    return null;
  }
}

/** Unbonding entries of every validator, summed per UTC day of completion. */
export async function getUnbondingSchedule(validators: Validator[]): Promise<UnbondingDay[]> {
  const byDate = new Map<string, Record<string, number>>();

  await mapLimit(validators, 10, async (validator) => {
    let nextKey: string | null | undefined = '';
    do {
      const params = new URLSearchParams({ 'pagination.limit': '1000' });
      if (nextKey) params.set('pagination.key', nextKey);
      const page: UnbondingResponse = await fetchJson<UnbondingResponse>(
        `${INITIA_REST_URL}/initia/mstaking/v1/validators/${validator.operator_address}/unbonding_delegations?${params}`
      );
      for (const { entries } of page.unbonding_responses) {
        for (const entry of entries) {
          const date = entry.completion_time.slice(0, 10);
          const amounts = byDate.get(date) ?? {};
          for (const coin of entry.balance) {
            amounts[coin.denom] = (amounts[coin.denom] ?? 0) + toAmount(coin.amount);
          }
          byDate.set(date, amounts);
        }
      }
      nextKey = page.pagination?.next_key;
    } while (nextKey);
  });

  return [...byDate]
    .map(([date, amounts]) => ({ date, amounts }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getStakingOverview(validators: Validator[]) {
  const [{ pool }, { params }, aprs, supply] = await Promise.all([
    getPool(),
    fetchJson<{ params: { unbonding_time: string; max_validators: number } }>(
      `${INITIA_REST_URL}/initia/mstaking/v1/params`
    ),
    getAprs(),
    fetchJson<{ amount: Coin }>(`${INITIA_REST_URL}/cosmos/bank/v1beta1/supply/by_denom?denom=uinit`),
  ]);

  const denoms = pool.bonded_tokens.map((coin) => coin.denom);
  const lpPools = new Map(
    (await Promise.all(denoms.filter((denom) => denom !== 'uinit').map(getLpPool)))
      .filter((lp): lp is LpPool => lp !== null)
      .map((lp) => [lp.denom, lp])
  );
  const prices = await getPrices([
    ...new Set(['uinit', ...[...lpPools.values()].flatMap((lp) => [lp.coinA, lp.coinB])]),
  ]);

  const active = validators.filter((validator) => validator.status === 'BOND_STATUS_BONDED');
  const inactive = validators.filter((validator) => validator.status !== 'BOND_STATUS_BONDED');

  const assets: StakingAsset[] = denoms.map((denom) => {
    const notBonded = amountOf(pool.not_bonded_tokens, denom);
    // The not-bonded pool holds stake on inactive validators plus everything still unbonding.
    const onInactive = inactive.reduce((sum, validator) => sum + amountOf(validator.tokens, denom), 0);

    let price = prices[denom] ?? 0;
    let initPerToken = denom === 'uinit' ? 1 : 0;
    const lp = lpPools.get(denom);
    if (lp) {
      const amountA = toAmount(lp.info.coin_a_amount);
      const amountB = toAmount(lp.info.coin_b_amount);
      const shares = toAmount(lp.info.total_share);
      const initAmount = lp.coinA === 'uinit' ? amountA : lp.coinB === 'uinit' ? amountB : 0;
      const value = amountA * (prices[lp.coinA] ?? 0) + amountB * (prices[lp.coinB] ?? 0);
      price = shares > 0 ? value / shares : 0;
      initPerToken = shares > 0 ? initAmount / shares : 0;
    }

    return {
      denom,
      name: TOKEN_NAMES[denom] ?? denom,
      price,
      staked: amountOf(pool.bonded_tokens, denom),
      unbonding: Math.max(0, notBonded - onInactive),
      inactive: Math.min(onInactive, notBonded),
      votingPowerWeight: Number(
        pool.voting_power_weights.find((weight) => weight.denom === denom)?.amount ?? 0
      ),
      initPerToken,
      apr: aprs[denom] ?? null,
    };
  });
  // INIT first
  assets.sort((a, b) => (a.denom === 'uinit' ? -1 : b.denom === 'uinit' ? 1 : 0));

  const activeValidators: ValidatorSummary[] = active
    .map((validator) => ({
      operatorAddress: validator.operator_address,
      moniker: validator.description.moniker.trim(),
      votingPower: toAmount(validator.voting_power),
      commission: Number(validator.commission.commission_rates.rate),
    }))
    .sort((a, b) => b.votingPower - a.votingPower);

  return {
    assets,
    initSupply: toAmount(supply.amount.amount),
    unbondingDays: Math.round(parseInt(params.unbonding_time) / 86400),
    maxValidators: params.max_validators,
    validators: activeValidators,
    validatorNames: Object.fromEntries(
      validators.map((validator) => [validator.operator_address, validator.description.moniker.trim()])
    ),
  };
}

const HISTORY_RANGES: Record<HistoryRange, { days: number; stepDays: number }> = {
  '30d': { days: 30, stepDays: 1 },
  '90d': { days: 90, stepDays: 2 },
  '180d': { days: 180, stepDays: 3 },
};

interface BlockResponse {
  block: { header: { height: string; time: string } };
}

/**
 * Samples the staking pool across the range using historical state queries.
 * Old block headers are pruned, so sample times are estimated from the recent average block time.
 */
export async function getStakingHistory(range: HistoryRange): Promise<HistoryPoint[]> {
  const { days, stepDays } = HISTORY_RANGES[range];
  const blockUrl = (height: number | 'latest') =>
    `${INITIA_REST_URL}/cosmos/base/tendermint/v1beta1/blocks/${height}`;

  const latest = await fetchJson<BlockResponse>(blockUrl('latest'));
  const latestHeight = parseInt(latest.block.header.height);
  const latestTime = new Date(latest.block.header.time).getTime();

  const referenceHeight = latestHeight - 200_000;
  const reference = await fetchJson<BlockResponse>(blockUrl(referenceHeight));
  const secondsPerBlock =
    (latestTime - new Date(reference.block.header.time).getTime()) / 1000 / 200_000;

  const samples = Array.from({ length: Math.floor(days / stepDays) + 1 }, (_, i) => {
    const secondsAgo = (days - i * stepDays) * 86400;
    return {
      height: latestHeight - Math.round(secondsAgo / secondsPerBlock),
      time: new Date(latestTime - secondsAgo * 1000).toISOString(),
    };
  });

  const points = await mapLimit(samples, 8, async ({ height, time }) => {
    try {
      const { pool } = await getPool(height);
      const toRecord = (coins: Coin[]) =>
        Object.fromEntries(coins.map((coin) => [coin.denom, toAmount(coin.amount)]));
      return { time, height, staked: toRecord(pool.bonded_tokens), notBonded: toRecord(pool.not_bonded_tokens) };
    } catch (error) {
      console.error(`Failed to load staking pool at height ${height}:`, error);
      return null;
    }
  });

  return points.filter((point): point is HistoryPoint => point !== null);
}
