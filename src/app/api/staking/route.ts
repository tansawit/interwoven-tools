import { NextResponse } from 'next/server';

// Interfaces
interface PriceData {
  [denom: string]: number;
}

interface PoolComposition {
  initAmount: number;
  totalShares: number;
  initDenom: string;
}

interface PoolInfo {
  pool: {
    lp: string;
    lp_metadata: string;
    is_minitswap_pool: boolean;
    pool_type: string;
    coins: Array<{
      denom: string;
      metadata: string;
      weight: string;
    }>;
    swap_fee_apr: number;
    staking_apr: number;
    total_apr: number;
    volume_24h: number;
    liquidity: number;
    value_per_lp: number;
    swap_fee_rate: number;
  };
}

interface PoolDetailData {
  coin_a_amount: string;
  coin_b_amount: string;
  total_share: string;
}

interface PoolDetailResponse {
  data: PoolDetailData;
}

// LP token to base64 mapping for the DEX API
const LP_TOKEN_BASE64: { [key: string]: string } = {
  'move/543b35a39cfadad3da3c23249c474455d15efd2f94f849473226dee8a3c7a9e1':
    'VDs1o5z62tPaPCMknEdEVdFe/S+U+ElHMibe6KPHqeE=',
};

const config = {
  priceApiUrl: 'https://celatone-price-cacher-h2bc4rnx5a-as.a.run.app/initia/interwoven-1',
  dexApiUrl: 'https://dex-api.initia.xyz/indexer/dex/v1/pools',
  poolDetailApiUrl:
    'https://rest.initia.xyz/initia/move/v1/accounts/0x1/modules/dex/view_functions/get_pool_info',
};

async function fetchPrices(denoms: string[]): Promise<PriceData> {
  try {
    const denomsQuery = denoms.join(',');
    const response = await fetch(`${config.priceApiUrl}?ids=${denomsQuery}`);
    if (!response.ok) {
      console.error(`Failed to fetch prices: ${response.status}`);
      return {};
    }
    const result = await response.json();
    console.log('Price data received:', result);
    return result;
  } catch (error) {
    console.error('Error fetching prices:', error);
    return {};
  }
}

async function fetchPoolInfo(poolDenom: string): Promise<PoolInfo | null> {
  try {
    // URL encode the denom to handle forward slashes
    const encodedDenom = encodeURIComponent(poolDenom);
    const response = await fetch(`${config.dexApiUrl}/${encodedDenom}`);
    if (!response.ok) {
      console.error(`Failed to fetch pool info for ${poolDenom}: ${response.status}`);
      return null;
    }
    const result = await response.json();
    console.log('Pool info received:', result);
    return result;
  } catch (error) {
    console.error('Error fetching pool info:', error);
    return null;
  }
}

async function fetchPoolDetails(base64Denom: string): Promise<PoolDetailResponse | null> {
  try {
    const response = await fetch(config.poolDetailApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type_args: [],
        args: [base64Denom],
      }),
    });
    if (!response.ok) {
      console.error(`Failed to fetch pool details: ${response.status}`);
      return null;
    }
    const result = await response.json();
    console.log('Pool details raw response:', result);

    // Parse the data field which is a JSON string
    if (result.data && typeof result.data === 'string') {
      const parsedData = JSON.parse(result.data);
      console.log('Pool details parsed:', parsedData);
      return { data: parsedData };
    }

    return null;
  } catch (error) {
    console.error('Error fetching pool details:', error);
    return null;
  }
}

export async function GET() {
  try {
    console.log('Fetching staking prices...');

    // Fetch staking data first
    const stakingResponse = await fetch('https://rest.initia.xyz/initia/mstaking/v1/pool');
    if (!stakingResponse.ok) {
      throw new Error(`Failed to fetch staking data: ${stakingResponse.status}`);
    }
    const stakingData = await stakingResponse.json();

    const priceData: PriceData = {};
    const poolCompositions: { [denom: string]: PoolComposition } = {};

    // Fetch INIT price
    try {
      console.log('Fetching INIT price...');
      const initPrices = await fetchPrices(['uinit']);
      console.log('INIT price response:', initPrices);
      priceData['uinit'] = initPrices.uinit || 0;
      console.log(`INIT price set to: ${priceData['uinit']}`);
    } catch (error) {
      console.error('Failed to fetch INIT price:', error);
      priceData['uinit'] = 0;
    }

    // Calculate LP token prices and get pool compositions
    for (const token of stakingData.pool.bonded_tokens) {
      if (token.denom !== 'uinit') {
        console.log(`Processing LP token ${token.denom}...`);
        try {
          // Get pool info to find underlying tokens
          const poolInfo = await fetchPoolInfo(token.denom);
          if (poolInfo && poolInfo.pool.coins && poolInfo.pool.coins.length >= 2) {
            // Get pool details for amounts
            const base64Denom = LP_TOKEN_BASE64[token.denom];
            if (base64Denom) {
              const poolDetails = await fetchPoolDetails(base64Denom);
              if (poolDetails && poolDetails.data) {
                const { coin_a_amount, coin_b_amount, total_share } = poolDetails.data;

                // Find which coin is INIT
                const denom1 = poolInfo.pool.coins[0].denom;
                const denom2 = poolInfo.pool.coins[1].denom;

                let initAmount = 0;
                if (denom1 === 'uinit') {
                  initAmount = parseFloat(coin_a_amount) / 1e6;
                } else if (denom2 === 'uinit') {
                  initAmount = parseFloat(coin_b_amount) / 1e6;
                }

                // Store pool composition
                poolCompositions[token.denom] = {
                  initAmount,
                  totalShares: parseFloat(total_share) / 1e6,
                  initDenom: 'uinit',
                };

                // Calculate LP price
                const prices = await fetchPrices([denom1, denom2]);
                const price1 = prices[denom1] || 0;
                const price2 = prices[denom2] || 0;

                const coin1Value = (parseFloat(coin_a_amount) / 1e6) * price1;
                const coin2Value = (parseFloat(coin_b_amount) / 1e6) * price2;
                const totalValue = coin1Value + coin2Value;
                const totalShares = parseFloat(total_share) / 1e6;

                const lpTokenPrice = totalShares > 0 ? totalValue / totalShares : 0;
                priceData[token.denom] = lpTokenPrice;
                console.log(`LP price set to: ${priceData[token.denom]}`);
              }
            }
          }
        } catch (error) {
          console.error(`Failed to process LP token ${token.denom}:`, error);
          priceData[token.denom] = 0;
        }
      }
    }

    console.log('Final price data:', priceData);
    console.log('Pool compositions:', poolCompositions);

    return NextResponse.json({
      stakingData,
      prices: priceData,
      poolCompositions,
    });
  } catch (error) {
    console.error('Error in staking API:', error);
    return NextResponse.json({ error: 'Failed to fetch staking data and prices' }, { status: 500 });
  }
}
