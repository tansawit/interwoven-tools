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

    // Process pools in smaller batches to avoid overwhelming the REST API
    const batchSize = 3;
    const monitorData: PoolMonitorData[] = [];

    for (let i = 0; i < pools.length; i += batchSize) {
      const batch = pools.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(pools.length / batchSize)}`);
      
      const batchResults = await Promise.all(
        batch.map(async (pool) => {
          try {
            const bridgeId = pool.op_bridge_id;
            const metadata = pool.ibc_op_init_metadata;

            console.log(`Processing pool ${bridgeId}...`);

            // Get basic pool data first
            const [virtualPoolBalance, pegKeeperBalance] = await Promise.all([
              getPoolAmount(metadata),
              getPegKeeperBalance(metadata),
            ]);

            // Process swap simulations sequentially to reduce API load
            const swapResultsRaw = [];
            for (const ratio of minitswapConfig.offerRatios) {
              const offerAmount = Math.floor(ratio * Number(pool.virtual_pool.pool_size));
              const [returnAmount, fee] = await swapSimulation(
                metadata,
                minitswapConfig.initMetadata,
                offerAmount
              );
              swapResultsRaw.push({ offerAmount, returnAmount, fee });
            }

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
          } catch (error) {
            console.error(`Error processing pool ${pool.op_bridge_id}:`, error);
            // Return a placeholder for failed pools to avoid breaking the entire response
            const chainInfo = chains[pool.op_bridge_id];
            const prettyName = chainInfo?.pretty_name ?? `Unknown Chain (${pool.op_bridge_id})`;
            return {
              bridgeId: pool.op_bridge_id,
              prettyName: prettyName,
              virtualPoolBalanceL1: 0,
              virtualPoolBalanceL2: 0,
              pegKeeperBalanceL1: 0,
              pegKeeperBalanceL2: 0,
              swaps: [],
            };
          }
        })
      );
      
      monitorData.push(...batchResults);
      
      // Small delay between batches to be kind to the API
      if (i + batchSize < pools.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Sort the data alphabetically by prettyName
    monitorData.sort((a, b) => a.prettyName.localeCompare(b.prettyName));

    return NextResponse.json(monitorData);
  } catch (error) {
    console.error('Error fetching minitswap data:', error);
    return NextResponse.json({ error: 'Failed to fetch minitswap data' }, { status: 500 });
  }
}
