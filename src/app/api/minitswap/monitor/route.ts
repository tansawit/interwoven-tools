import { NextResponse } from 'next/server';
import { minitswapConfig } from '@/lib/minitswap-config';
import { getPegKeeperBalance, getPoolAmount, swapSimulation } from '@/lib/minitswap-api';
import { PoolListManager } from '@/lib/minitswap-registry';
import { Chain } from '@initia/initia-registry-types';

// Simple in-memory cache
interface CacheEntry {
  data: PoolMonitorData[];
  timestamp: number;
}

let cache: CacheEntry | null = null;

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
    // Check cache first
    const now = Date.now();
    if (cache && (now - cache.timestamp) < minitswapConfig.cacheTTL) {
      console.log('Serving from cache');
      return NextResponse.json(cache.data);
    }

    console.log('Cache miss, fetching fresh data...');
    
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

    // Process pools with optimized batching and timeouts
    const batchSize = 5; // Increased batch size
    const monitorData: PoolMonitorData[] = [];

    // Helper function to add timeout to promises
    const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
      return Promise.race([
        promise,
        new Promise<T>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), timeoutMs)
        ),
      ]);
    };

    for (let i = 0; i < pools.length; i += batchSize) {
      const batch = pools.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(pools.length / batchSize)}`);
      
      const batchResults = await Promise.all(
        batch.map(async (pool) => {
          try {
            const bridgeId = pool.op_bridge_id;
            const metadata = pool.ibc_op_init_metadata;

            console.log(`Processing pool ${bridgeId}...`);

            // Get basic pool data with timeout
            const [virtualPoolBalance, pegKeeperBalance] = await withTimeout(
              Promise.all([
                getPoolAmount(metadata),
                getPegKeeperBalance(metadata),
              ]),
              minitswapConfig.apiTimeout
            );

            // Process only one swap simulation instead of three for speed
            const ratio = minitswapConfig.offerRatios[0]; // Use only first ratio (0.1)
            const offerAmount = Math.floor(ratio * Number(pool.virtual_pool.pool_size));
            
            const [returnAmount, fee] = await withTimeout(
              swapSimulation(metadata, minitswapConfig.initMetadata, offerAmount),
              minitswapConfig.apiTimeout
            );

            const initPrice = offerAmount !== 0 ? returnAmount / offerAmount : NaN;
            const swaps: SwapResult[] = [{
              offerAmount: offerAmount / 1e6,
              returnAmount: returnAmount / 1e6,
              feeAmount: fee / 1e6,
              initPrice: initPrice,
            }];

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
      // Removed artificial delay between batches for speed
    }

    // Sort the data alphabetically by prettyName
    monitorData.sort((a, b) => a.prettyName.localeCompare(b.prettyName));

    // Cache the results
    cache = {
      data: monitorData,
      timestamp: Date.now(),
    };

    console.log(`Fresh data cached, returning ${monitorData.length} pools`);
    return NextResponse.json(monitorData);
  } catch (error) {
    console.error('Error fetching minitswap data:', error);
    return NextResponse.json({ error: 'Failed to fetch minitswap data' }, { status: 500 });
  }
}
