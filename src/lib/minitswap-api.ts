import { bcs, RESTClient } from '@initia/initia.js';
import { minitswapConfig } from './minitswap-config';

// Initialize RESTClient here, assuming server-side usage
const restClient = new RESTClient(minitswapConfig.restUri);

export type PoolsDetailResponseHasVirtualPool = PoolsDetailResponse & {
  virtual_pool: VirtualPoolDetail;
};

interface PoolsDetailResponse {
  ibc_channel: string;
  ibc_op_init_denom: string;
  ibc_op_init_metadata: string;
  op_bridge_id: string;
  stableswap_pool: null;
  virtual_pool: null | VirtualPoolDetail;
}

interface VirtualPoolDetail {
  active: boolean;
  ann: string;
  ibc_op_init_pool_amount: string;
  init_pool_amount: string;
  last_recovered_timestamp: string;
  max_ratio: string;
  peg_keeper_owned_ibc_op_init_balance: string;
  pool_size: string;
  recover_param: string;
  recover_velocity: string;
  virtual_ibc_op_init_balance: string;
  virtual_init_balance: string;
}

export async function getPegKeeperBalance(ibcOpInitMetadata: string): Promise<[number, number]> {
  return restClient.move.viewFunction<[number, number]>(
    '0x1',
    'minitswap',
    'get_peg_keeper_balance',
    [],
    [bcs.object().serialize(ibcOpInitMetadata).toBase64(), bcs.bool().serialize(true).toBase64()]
  );
}

export async function getPoolAmount(ibcOpInitMetadata: string): Promise<[number, number]> {
  return restClient.move.viewFunction<[number, number]>(
    '0x1',
    'minitswap',
    'get_pool_amount',
    [],
    [bcs.object().serialize(ibcOpInitMetadata).toBase64(), bcs.bool().serialize(true).toBase64()]
  );
}

export async function getPoolList(): Promise<PoolsDetailResponseHasVirtualPool[]> {
  const res = await restClient.move.viewFunction<PoolsDetailResponse[]>(
    '0x1',
    'minitswap',
    'get_pools_detail_list',
    [],
    [bcs.option(bcs.object()).serialize(null).toBase64(), bcs.u64().serialize(30).toBase64()]
  );

  return res.filter(
    (v: PoolsDetailResponse) => v.virtual_pool !== null
  ) as PoolsDetailResponseHasVirtualPool[];
}

export async function swapSimulation(
  ibcOpInitMetadata: string,
  initMetadata: string,
  amount: number
): Promise<[number, number]> {
  return restClient.move.viewFunction<[number, number]>(
    '0x1',
    'minitswap',
    'swap_simulation',
    [],
    [
      bcs.object().serialize(ibcOpInitMetadata).toBase64(),
      bcs.object().serialize(initMetadata).toBase64(),
      bcs.u64().serialize(amount).toBase64(),
    ]
  );
}
