import { NextRequest, NextResponse } from 'next/server';

interface Chain {
  chain_name: string;
  pretty_name: string;
  apis?: {
    rest?: Array<{ address: string }>;
  };
}

interface Asset {
  base: string;
  display: string;
  symbol: string;
  denom_units: {
    denom: string;
    exponent: number;
  }[];
  traces?: {
    type: string;
    counterparty?: {
      chain_name: string;
      base_denom: string;
      channel_id?: string;
    };
    chain?: {
      channel_id?: string;
      path?: string;
      bridge_id?: string;
    };
  }[];
}

interface AssetList {
  chain_name: string;
  assets: Asset[];
}

interface Supply {
  denom: string;
  amount: string;
}

interface SupplyResponse {
  supply: Supply[];
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const isTestnet = searchParams.get('testnet') === 'true';
    const registryBase = isTestnet 
      ? 'https://registry.testnet.initia.xyz' 
      : 'https://registry.initia.xyz';

    // Fetch all chains
    const chainsResponse = await fetch(`${registryBase}/chains.json`);
    if (!chainsResponse.ok) {
      throw new Error('Failed to fetch chains');
    }
    const chains: Chain[] = await chainsResponse.json();

    // Filter chains that have REST endpoints
    const validChains = chains.filter(chain => chain.apis?.rest && chain.apis.rest.length > 0);

    // Fetch assets for each chain and their supplies
    const chainAssetSupplies = await Promise.all(
      validChains.map(async (chain) => {
        try {
          // Fetch asset list for this chain
          const assetListResponse = await fetch(`${registryBase}/chains/${chain.chain_name}/assetlist.json`);
          if (!assetListResponse.ok) {
            console.log(`No asset list found for ${chain.chain_name}`);
            return {
              chain_name: chain.chain_name,
              pretty_name: chain.pretty_name,
              assets: [],
              supplies: {}
            };
          }
          
          const assetList: AssetList = await assetListResponse.json();
          
          // Get REST endpoint for this chain
          const restEndpoint = chain.apis?.rest?.[0]?.address;
          if (!restEndpoint) {
            console.log(`No REST endpoint for ${chain.chain_name}`);
            return {
              chain_name: chain.chain_name,
              pretty_name: chain.pretty_name,
              assets: assetList.assets,
              supplies: {}
            };
          }

          // Fetch supplies from the chain
          const supplyResponse = await fetch(`${restEndpoint}/cosmos/bank/v1beta1/supply`);
          if (!supplyResponse.ok) {
            console.log(`Failed to fetch supply for ${chain.chain_name}`);
            return {
              chain_name: chain.chain_name,
              pretty_name: chain.pretty_name,
              assets: assetList.assets,
              supplies: {}
            };
          }

          const supplyData: SupplyResponse = await supplyResponse.json();
          
          // Create a map of supplies by denom
          const supplyMap: Record<string, string> = {};
          supplyData.supply.forEach(supply => {
            supplyMap[supply.denom] = supply.amount;
          });

          return {
            chain_name: chain.chain_name,
            pretty_name: chain.pretty_name,
            assets: assetList.assets,
            supplies: supplyMap
          };
        } catch (error) {
          console.error(`Error processing chain ${chain.chain_name}:`, error);
          return {
            chain_name: chain.chain_name,
            pretty_name: chain.pretty_name,
            assets: [],
            supplies: {}
          };
        }
      })
    );

    // Process the data to create the table structure
    // Collect all unique symbols across all chains
    const allSymbols = new Set<string>();
    chainAssetSupplies.forEach(chainData => {
      chainData.assets.forEach((asset: Asset) => {
        // Skip INIT.{xxx} format assets
        if (!asset.symbol.match(/^INIT\.[a-zA-Z0-9]+$/)) {
          allSymbols.add(asset.symbol);
        } else {
          console.log(`Excluding INIT token from allSymbols: ${asset.symbol}`);
        }
      });
    });

    // Create a map to track bridged amounts
    // Key: "sourceChain:symbol", Value: total bridged amount
    const bridgedAmounts = new Map<string, bigint>();
    
    // First pass: identify all bridged assets and their amounts
    chainAssetSupplies.forEach(chainData => {
      chainData.assets.forEach((asset: Asset) => {
        if (asset.traces && asset.traces.length > 0 && !asset.symbol.match(/^INIT\.[a-zA-Z0-9]+$/)) {
          // This is a bridged asset
          const trace = asset.traces[0]; // Use the first trace
          if (trace.counterparty?.chain_name) {
            const sourceChain = trace.counterparty.chain_name;
            const symbol = asset.symbol;
            
            // Get the supply amount for this asset on the destination chain
            const supplyAmount = chainData.supplies[asset.base];
            if (supplyAmount && supplyAmount !== '0') {
              // Find the display denom unit to get the exponent
              const displayUnit = asset.denom_units.find(unit => unit.denom === asset.display);
              const exponent = displayUnit?.exponent || 0;
              
              // Convert to display amount
              const displayAmount = BigInt(supplyAmount) / BigInt(10 ** exponent);
              
              // Add to bridged amounts
              const key = `${sourceChain}:${symbol}`;
              const currentAmount = bridgedAmounts.get(key) || BigInt(0);
              bridgedAmounts.set(key, currentAmount + displayAmount);
              
              console.log(`Found bridged asset: ${symbol} on ${chainData.chain_name} from ${sourceChain}, amount: ${displayAmount}`);
            }
          }
        }
      });
    });

    // Build the table data
    const tableData = chainAssetSupplies.map(chainData => {
      const row: Record<string, string | null> = {
        chain_name: chainData.chain_name,
        pretty_name: chainData.pretty_name,
      };

      // For each symbol, find the corresponding asset and supply
      allSymbols.forEach(symbol => {
        const asset = chainData.assets.find((a: Asset) => a.symbol === symbol && !a.symbol.match(/^INIT\.[a-zA-Z0-9]+$/));
        if (asset) {
          // Get the base denom amount
          const supplyAmount = chainData.supplies[asset.base];
          if (supplyAmount) {
            // Find the display denom unit to get the exponent
            const displayUnit = asset.denom_units.find(unit => unit.denom === asset.display);
            const exponent = displayUnit?.exponent || 0;
            
            // Convert to display amount
            let displayAmount = BigInt(supplyAmount) / BigInt(10 ** exponent);
            
            // If this is the source chain for bridged assets, subtract the bridged amounts
            // Skip subtraction for INIT.{xxx} format assets
            const bridgedKey = `${chainData.chain_name}:${symbol}`;
            const bridgedAmount = bridgedAmounts.get(bridgedKey) || BigInt(0);
            if (bridgedAmount > BigInt(0) && !symbol.match(/^INIT\.[a-zA-Z0-9]+$/)) {
              console.log(`Subtracting bridged amount for ${symbol} on ${chainData.chain_name}: ${bridgedAmount}`);
              displayAmount = displayAmount - bridgedAmount;
              // Ensure we don't go negative
              if (displayAmount < BigInt(0)) {
                displayAmount = BigInt(0);
              }
            }
            
            row[symbol] = displayAmount.toString();
          } else {
            row[symbol] = '0';
          }
        } else {
          row[symbol] = null; // This chain doesn't have this asset
        }
      });

      return row;
    });

    // Calculate totals for each symbol
    const totalRow: Record<string, string | null> = {
      chain_name: 'total',
      pretty_name: 'Total',
    };

    allSymbols.forEach(symbol => {
      let total = BigInt(0);
      let hasAnyValue = false;

      tableData.forEach(row => {
        const value = row[symbol];
        if (value && value !== '0') {
          total += BigInt(value);
          hasAnyValue = true;
        }
      });

      totalRow[symbol] = hasAnyValue ? total.toString() : '0';
    });

    // Add the total row to the data
    tableData.push(totalRow);

    return NextResponse.json({
      symbols: Array.from(allSymbols).sort(),
      data: tableData
    });
  } catch (error) {
    console.error('Error in assets-distribution API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch asset distribution data' },
      { status: 500 }
    );
  }
}