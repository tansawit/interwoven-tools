'use client';

import { OracleTable } from '@/components/oracle-table';
import { PageLayout } from '@/components/page-layout';
import { useEffect, useState } from 'react';

interface CurrencyPair {
  Base: string;
  Quote: string;
}

interface OracleResponse {
  currency_pairs: CurrencyPair[];
}

interface PriceData {
  price: {
    price: string;
    block_timestamp: string;
    block_height: string;
  };
  nonce: string;
  decimals: string;
  id: string;
}

interface PriceResponse {
  prices: PriceData[];
}

export default function OraclePage() {
  const [currencyPairs, setCurrencyPairs] = useState<CurrencyPair[]>([]);
  const [priceData, setPriceData] = useState<Record<string, PriceData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsRefreshing(true);
        // Fetch currency pairs
        const pairsResponse = await fetch(
          'https://rest.testnet.initia.xyz/connect/oracle/v2/get_all_tickers'
        );
        if (!pairsResponse.ok) {
          throw new Error('Failed to fetch currency pairs');
        }
        const pairsData: OracleResponse = await pairsResponse.json();

        // Filter out TIMESTAMP/NANOSECOND pair
        const filteredPairs = pairsData.currency_pairs.filter(
          (pair) => !(pair.Base === 'TIMESTAMP' && pair.Quote === 'NANOSECOND')
        );
        setCurrencyPairs(filteredPairs);

        // Construct price query URL
        const priceQueryParams = filteredPairs
          .map(({ Base, Quote }) => `currency_pair_ids=${Base}%2F${Quote}`)
          .join('&');

        // Fetch prices
        const pricesResponse = await fetch(
          `https://rest.testnet.initia.xyz/connect/oracle/v2/get_prices?${priceQueryParams}`
        );
        if (!pricesResponse.ok) {
          throw new Error('Failed to fetch prices');
        }
        const pricesData: PriceResponse = await pricesResponse.json();

        // Create a map of currency pair to price data
        const priceMap: Record<string, PriceData> = {};
        pricesData.prices.forEach((price, index) => {
          const pair = filteredPairs[index];
          priceMap[`${pair.Base}/${pair.Quote}`] = price;
        });
        setPriceData(priceMap);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    };

    // Initial fetch
    fetchData();

    // Set up auto-refresh interval
    const intervalId = setInterval(fetchData, 5000); // 5 seconds

    // Cleanup interval on component unmount
    return () => clearInterval(intervalId);
  }, []); // Empty dependency array since we want this to run only once on mount

  return (
    <PageLayout
      title="Oracle"
      description="Interact with oracle services in the Interwoven ecosystem"
    >
      {error ? (
        <div className="p-4 border border-destructive/50 bg-destructive/10 rounded-lg">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      ) : isLoading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-[200px]" />
          <div className="h-[400px] bg-muted rounded" />
        </div>
      ) : (
        <OracleTable
          currencyPairs={currencyPairs}
          priceData={priceData}
          isRefreshing={isRefreshing}
        />
      )}
    </PageLayout>
  );
}
