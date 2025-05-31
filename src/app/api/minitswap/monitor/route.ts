import { NextResponse } from 'next/server';
import { minitswapConfig } from '@/lib/minitswap-config';
import { getPegKeeperBalance, getPoolAmount, swapSimulation } from '@/lib/minitswap-api';
import { PoolListManager } from '@/lib/minitswap-registry';
import { Chain } from '@initia/initia-registry-types';

// Define a structure for the data returned by the API
interface PoolMonitorData {
  bridgeId: string;
  prettyName: string;
  virtualPoolBalanceL1: number;
  virtualPoolBalanceL2: number;
  pegKeeperBalanceL1: number;
  pegKeeperBalanceL2: number;
  swaps: SwapResult[];
}

interface SwapResult {
  offerAmount: number;
  returnAmount: number;
  feeAmount: number;
  initPrice: number;
}

export async function GET() {
  try {
    // Initialize the pool list manager and fetch registry + pools
    const poolListManager = new PoolListManager();
    await poolListManager.update();

    const pools = poolListManager.virtualPools;
    const chains: Record<string, Chain> = poolListManager.chains;

    // Log the bridge IDs to see what they actually are
    console.log(
      'Bridge IDs found:',
      pools.map((p) => p.op_bridge_id)
    );

    const monitorData: PoolMonitorData[] = await Promise.all(
      pools.map(async (pool) => {
        const bridgeId = pool.op_bridge_id;
        const metadata = pool.ibc_op_init_metadata;

        const [virtualPoolBalance, pegKeeperBalance, swapResultsRaw] = await Promise.all([
          getPoolAmount(metadata),
          getPegKeeperBalance(metadata),
          Promise.all(
            minitswapConfig.offerRatios.map(async (ratio) => {
              const offerAmount = Math.floor(ratio * Number(pool.virtual_pool.pool_size));
              const [returnAmount, fee] = await swapSimulation(
                metadata,
                minitswapConfig.initMetadata,
                offerAmount
              );
              return { offerAmount, returnAmount, fee };
            })
          ),
        ]);

        const swaps: SwapResult[] = swapResultsRaw.map((swapRes) => {
          const initPrice =
            swapRes.offerAmount !== 0 ? swapRes.returnAmount / swapRes.offerAmount : NaN;
          return {
            offerAmount: swapRes.offerAmount / 1e6,
            returnAmount: swapRes.returnAmount / 1e6,
            feeAmount: swapRes.fee / 1e6,
            initPrice: initPrice,
          };
        });

        const chainInfo = chains[bridgeId];
        const prettyName = chainInfo?.pretty_name ?? `Unknown Chain (${bridgeId})`;

        return {
          bridgeId: bridgeId,
          prettyName: prettyName,
          virtualPoolBalanceL1: virtualPoolBalance[0] / 1e6,
          virtualPoolBalanceL2: virtualPoolBalance[1] / 1e6,
          pegKeeperBalanceL1: -pegKeeperBalance[0] / 1e6, // Note the negation
          pegKeeperBalanceL2: pegKeeperBalance[1] / 1e6,
          swaps: swaps,
        };
      })
    );

    // Sort the data alphabetically by prettyName
    monitorData.sort((a, b) => a.prettyName.localeCompare(b.prettyName));

    return NextResponse.json(monitorData);
  } catch (error) {
    console.error('Error fetching minitswap data:', error);
    return NextResponse.json({ error: 'Failed to fetch minitswap data' }, { status: 500 });
  }
}
