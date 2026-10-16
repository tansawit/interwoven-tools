import { NextRequest, NextResponse } from 'next/server';
import { fetchJson } from '@/lib/fetch-json';
import {
  Chain,
  getAssetList,
  getChains,
  REGISTRY_URL,
  RegistryAsset,
  TESTNET_REGISTRY_URL,
} from '@/lib/registry';
import { cached, cacheHeaders } from '@/lib/server/cache';

interface SupplyResponse {
  supply: Array<{ denom: string; amount: string }>;
  pagination?: { next_key: string | null };
}

interface ChainAssetSupplies {
  chain_name: string;
  pretty_name: string;
  assets: RegistryAsset[];
  supplies: Record<string, string>;
}

const CACHE_TTL_MS = 60_000;
const INIT_WRAPPED_SYMBOL = /^INIT\.[a-zA-Z0-9]+$/;

/** Fetches every page of the chain's total supply (pages are capped at 100 entries by default). */
async function fetchSupplies(restEndpoint: string): Promise<Record<string, string>> {
  const supplies: Record<string, string> = {};
  let nextKey: string | null | undefined = '';

  do {
    const params = new URLSearchParams({ 'pagination.limit': '1000' });
    if (nextKey) params.set('pagination.key', nextKey);
    const page: SupplyResponse = await fetchJson<SupplyResponse>(
      `${restEndpoint}/cosmos/bank/v1beta1/supply?${params}`
    );
    for (const { denom, amount } of page.supply) supplies[denom] = amount;
    nextKey = page.pagination?.next_key;
  } while (nextKey);

  return supplies;
}

async function loadChainAssetSupplies(
  chain: Chain,
  registryUrl: string
): Promise<ChainAssetSupplies> {
  const restEndpoint = chain.apis?.rest?.[0]?.address;
  const [assetList, supplies] = await Promise.allSettled([
    getAssetList(chain.chain_name, registryUrl),
    restEndpoint ? fetchSupplies(restEndpoint) : Promise.resolve({}),
  ]);

  if (assetList.status === 'rejected') {
    console.error(`No asset list found for ${chain.chain_name}:`, assetList.reason);
  }
  if (supplies.status === 'rejected') {
    console.error(`Failed to fetch supply for ${chain.chain_name}:`, supplies.reason);
  }

  return {
    chain_name: chain.chain_name,
    pretty_name: chain.pretty_name,
    assets: assetList.status === 'fulfilled' ? assetList.value.assets : [],
    supplies: supplies.status === 'fulfilled' ? supplies.value : {},
  };
}

/** Converts a base-denom amount to whole display units (truncating). */
function toDisplayAmount(asset: RegistryAsset, amount: string): bigint {
  const exponent = asset.denom_units.find((unit) => unit.denom === asset.display)?.exponent || 0;
  return BigInt(amount) / BigInt(10) ** BigInt(exponent);
}

async function loadAssetDistribution(registryUrl: string) {
  const chains = await getChains(registryUrl);
  const chainAssetSupplies = await Promise.all(
    chains
      .filter((chain) => chain.apis?.rest && chain.apis.rest.length > 0)
      .map((chain) => loadChainAssetSupplies(chain, registryUrl))
  );

  // Collect all unique symbols across all chains, skipping INIT.{xxx} format assets
  const allSymbols = new Set<string>();
  for (const chainData of chainAssetSupplies) {
    for (const asset of chainData.assets) {
      if (!INIT_WRAPPED_SYMBOL.test(asset.symbol)) allSymbols.add(asset.symbol);
    }
  }

  // Total amount bridged out of each source chain. Key: "sourceChain:symbol"
  const bridgedAmounts = new Map<string, bigint>();
  for (const chainData of chainAssetSupplies) {
    for (const asset of chainData.assets) {
      const sourceChain = asset.traces?.[0]?.counterparty?.chain_name;
      if (!sourceChain || INIT_WRAPPED_SYMBOL.test(asset.symbol)) continue;

      const supplyAmount = chainData.supplies[asset.base];
      if (supplyAmount && supplyAmount !== '0') {
        const key = `${sourceChain}:${asset.symbol}`;
        bridgedAmounts.set(
          key,
          (bridgedAmounts.get(key) ?? BigInt(0)) + toDisplayAmount(asset, supplyAmount)
        );
      }
    }
  }

  // Build one row per chain; source chains exclude the amount bridged elsewhere
  const tableData = chainAssetSupplies.map((chainData) => {
    const row: Record<string, string | null> = {
      chain_name: chainData.chain_name,
      pretty_name: chainData.pretty_name,
    };
    const assetsBySymbol = new Map<string, RegistryAsset>();
    for (const asset of chainData.assets) {
      if (!assetsBySymbol.has(asset.symbol)) assetsBySymbol.set(asset.symbol, asset);
    }

    for (const symbol of allSymbols) {
      const asset = assetsBySymbol.get(symbol);
      if (!asset) {
        row[symbol] = null; // This chain doesn't have this asset
        continue;
      }

      const supplyAmount = chainData.supplies[asset.base];
      if (!supplyAmount) {
        row[symbol] = '0';
        continue;
      }

      const bridgedAmount = bridgedAmounts.get(`${chainData.chain_name}:${symbol}`) ?? BigInt(0);
      const displayAmount = toDisplayAmount(asset, supplyAmount) - bridgedAmount;
      row[symbol] = (displayAmount < BigInt(0) ? BigInt(0) : displayAmount).toString();
    }

    return row;
  });

  // Calculate totals for each symbol
  const totalRow: Record<string, string | null> = {
    chain_name: 'total',
    pretty_name: 'Total',
  };
  for (const symbol of allSymbols) {
    totalRow[symbol] = tableData
      .reduce((total, row) => total + BigInt(row[symbol] ?? 0), BigInt(0))
      .toString();
  }
  tableData.push(totalRow);

  return {
    symbols: Array.from(allSymbols).sort(),
    data: tableData,
  };
}

export async function GET(request: NextRequest) {
  try {
    const isTestnet = request.nextUrl.searchParams.get('testnet') === 'true';
    const registryUrl = isTestnet ? TESTNET_REGISTRY_URL : REGISTRY_URL;
    const data = await cached(`assets-distribution:${registryUrl}`, CACHE_TTL_MS, () =>
      loadAssetDistribution(registryUrl)
    );
    return NextResponse.json(data, { headers: cacheHeaders(CACHE_TTL_MS / 1000) });
  } catch (error) {
    console.error('Error in assets-distribution API:', error);
    return NextResponse.json({ error: 'Failed to fetch asset distribution data' }, { status: 500 });
  }
}
