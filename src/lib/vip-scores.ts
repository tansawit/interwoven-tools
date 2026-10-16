import { bcs } from '@/lib/bcs';
import { fetchJson } from '@/lib/fetch-json';
import { INITIA_REST_URL, viewFunction } from '@/lib/move';

export interface VIPStatus {
  stage: number;
  start_time: string;
  end_time: string;
  total_reward: number;
  data: Array<{ bridge_id: number; reward: number }>;
}

export interface BridgeInfo {
  bridge_id: string;
  vm_type: string;
  vip_l2_score_contract: string;
}

type Scores = Record<string, bigint>;

const VIP_MODULE_ADDRESS = '0x3a886b32a802582f2e446e74d4a24d1d7ed01adf46d2a8f65c5723887e708789';

export function getVIPStatus(): Promise<VIPStatus> {
  return fetchJson<VIPStatus>('https://vip-api.initia.xyz/vesting/status');
}

export function getBridgeInfos(): Promise<BridgeInfo[]> {
  return viewFunction<BridgeInfo[]>(INITIA_REST_URL, VIP_MODULE_ADDRESS, 'vip', 'get_bridge_infos', []);
}

export async function getMoveScores(
  restEndpoint: string,
  address: string,
  stage: number
): Promise<Scores> {
  const res: Scores = {};
  let nextKey = '';
  const limit = 1000;

  // Raw bytes of the start_after argument, or a single zero byte for "none".
  const encodeStartAfter = (str: string): string =>
    str === '' ? bcs.optionNone() : btoa(String.fromCharCode(...new TextEncoder().encode(str)));

  while (true) {
    const data = await viewFunction<{ scores: Array<{ addr: string; score: string }> }>(
      restEndpoint,
      address,
      'vip_score',
      'get_scores',
      [bcs.u64(stage), bcs.u16(limit), encodeStartAfter(nextKey)]
    );

    for (const score of data.scores) {
      res[score.addr] = BigInt(score.score);
    }

    if (data.scores.length !== limit) break;
    nextKey = data.scores[limit - 1].addr;
  }

  return res;
}

export async function getWasmScores(
  restEndpoint: string,
  address: string,
  stage: number
): Promise<Scores> {
  const res: Scores = {};
  let nextKey = '';
  const limit = 200;

  while (true) {
    const query = btoa(
      JSON.stringify({
        get_scores: {
          stage: Number(stage),
          limit,
          start_after: nextKey !== '' ? nextKey : undefined,
        },
      })
    );
    const result = await fetchJson<{ data?: { scores?: Array<{ addr: string; score: string }> } }>(
      `${restEndpoint}/cosmwasm/wasm/v1/contract/${address}/smart/${query}`
    );
    const scores = result.data?.scores;
    if (!scores) break;

    for (const score of scores) {
      res[score.addr] = BigInt(score.score);
    }

    if (scores.length !== limit) break;
    nextKey = scores[limit - 1].addr;
  }

  return res;
}

export async function getEvmScores(
  jsonRpcEndpoint: string,
  contractAddr: string,
  stage: number
): Promise<Scores> {
  const res: Scores = {};
  const limit = 500;
  let offset = 0;

  // getScores(uint256 stage, uint256 offset, uint256 limit)
  const functionSelector = '0x990357e5';
  const encodeUint256 = (value: number) => value.toString(16).padStart(64, '0');

  while (true) {
    const callData = `${functionSelector}${encodeUint256(stage)}${encodeUint256(offset)}${encodeUint256(limit)}`;
    const result = await fetchJson<{ result?: string; error?: { message?: string } }>(
      jsonRpcEndpoint,
      {
        method: 'POST',
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_call',
          params: [{ to: contractAddr, data: callData }, 'latest'],
          id: 1,
        }),
      }
    );

    if (result.error) {
      throw new Error(`EVM JSON RPC error: ${result.error.message || JSON.stringify(result.error)}`);
    }

    const responseData = result.result;
    if (!responseData || responseData.length <= 2) break;

    const decoded = decodeEvmScoresResponse(responseData);
    if (decoded.length === 0) break;

    for (const score of decoded) {
      res[score.addr] = BigInt(score.score);
    }

    if (decoded.length < limit) break;
    offset += limit;
  }

  return res;
}

/**
 * Decodes the ABI-encoded `ScoreResponse[]` returned by getScores, where each struct is
 * (address addr, uint64 amount, uint64 index), each padded to 32 bytes.
 */
function decodeEvmScoresResponse(data: string): Array<{ addr: string; score: string }> {
  const hex = data.slice(2);
  const arrayOffset = parseInt(hex.slice(0, 64), 16) * 2;
  const arrayLength = parseInt(hex.slice(arrayOffset, arrayOffset + 64), 16);
  const dataStart = arrayOffset + 64;
  const scores: Array<{ addr: string; score: string }> = [];

  for (let i = 0; i < arrayLength; i++) {
    const entryOffset = dataStart + i * 192;
    if (entryOffset + 192 > hex.length) break;

    const addrHex = hex.slice(entryOffset + 24, entryOffset + 64);
    const score = BigInt('0x' + hex.slice(entryOffset + 64, entryOffset + 128)).toString();

    // Skip empty slots: require a meaningful address and a non-zero score
    const nonZeroCount = addrHex.replace(/0/g, '').length;
    if (nonZeroCount >= 4 && score !== '0') {
      scores.push({ addr: '0x' + addrHex, score });
    }
  }

  return scores;
}
