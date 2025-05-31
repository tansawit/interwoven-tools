import { Chain } from '@initia/initia-registry-types';
import { getPoolList, PoolsDetailResponseHasVirtualPool } from './minitswap-api';

const REGISTRY_URL = 'https://registry.initia.xyz/chains.json';

async function getRegistry(): Promise<Record<string, Chain>> {
  try {
    console.log(`Fetching registry from: ${REGISTRY_URL}`);
    const response = await fetch(REGISTRY_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} fetching registry`);
    }
    const registryData: Chain[] = await response.json();

    // Check if the response is an array
    if (!Array.isArray(registryData)) {
      console.warn('Registry data was not an array. Returning empty registry.', registryData);
      return {};
    }

    // Transform the array into a Record keyed by op_bridge_id
    const chainsRecord: Record<string, Chain> = {};
    for (const chain of registryData) {
      const bridgeId = chain.metadata?.op_bridge_id;
      if (bridgeId) {
        chainsRecord[bridgeId] = chain;
      } else {
        console.warn(
          `Chain ${chain.chain_name} (${chain.chain_id}) is missing op_bridge_id in metadata.`
        );
      }
    }

    console.log(`Successfully processed ${Object.keys(chainsRecord).length} chains from registry.`);
    return chainsRecord;
  } catch (error) {
    console.error('Failed to fetch or parse registry:', error);
    return {};
  }
}

export class PoolListManager {
  public chains: Record<string, Chain> = {};
  public virtualPools: PoolsDetailResponseHasVirtualPool[] = [];

  constructor() {
    // Do not start worker automatically
  }

  // Fetches the latest data
  public async update(): Promise<void> {
    try {
      this.chains = await getRegistry();
      this.virtualPools = await getPoolList();
    } catch (error) {
      console.error('Failed to update pool list:', error);
      this.chains = {};
      this.virtualPools = [];
    }
  }
}
