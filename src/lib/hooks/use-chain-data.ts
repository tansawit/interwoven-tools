import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Chain, Asset, Balance } from '../types';
import { TEST_ADDRESS, REGISTRY_URL } from '../constants';

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

const cache: {
  chains?: CacheItem<Chain[]>;
  assets?: { [chainName: string]: CacheItem<Asset[]> };
  balances?: { [chainName: string]: CacheItem<Balance[]> };
} = {};

export function useChainData() {
  const [chains, setChains] = useState<Chain[]>([]);
  const [selectedChain, setSelectedChain] = useState('');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCacheValid = useCallback(<T>(cacheItem?: CacheItem<T>): boolean => {
    if (!cacheItem) return false;
    return Date.now() - cacheItem.timestamp < CACHE_DURATION;
  }, []);

  const fetchChainData = useCallback(async () => {
    try {
      if (cache.chains && isCacheValid(cache.chains)) {
        setChains(cache.chains.data);
        return;
      }

      const response = await fetch(REGISTRY_URL);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      cache.chains = { data, timestamp: Date.now() };
      setChains(data);
      setError(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error fetching chain data';
      setError(errorMessage);
      console.error('Error fetching chain data:', error);
    }
  }, [isCacheValid]);

  const fetchAssetData = useCallback(
    async (chainName: string) => {
      if (!chainName) return;

      setIsLoadingAssets(true);
      try {
        if (cache.assets?.[chainName] && isCacheValid(cache.assets[chainName])) {
          setAssets(cache.assets[chainName].data);
          setIsLoadingAssets(false);
          return;
        }

        const selectedChainData = chains.find((chain) => chain.chain_name === chainName);
        if (!selectedChainData?.metadata?.assetlist) {
          setAssets([]);
          return;
        }

        const response = await fetch(selectedChainData.metadata.assetlist);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const assetData = data.assets || [];

        if (!cache.assets) cache.assets = {};
        cache.assets[chainName] = { data: assetData, timestamp: Date.now() };

        setAssets(assetData);
        setError(null);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error fetching asset data';
        setError(errorMessage);
        console.error('Error fetching asset data:', error);
        setAssets([]);
      } finally {
        setIsLoadingAssets(false);
      }
    },
    [chains, isCacheValid]
  );

  const fetchBalances = useCallback(
    async (chainName: string) => {
      if (!chainName) return;

      setIsLoadingBalances(true);
      try {
        if (cache.balances?.[chainName] && isCacheValid(cache.balances[chainName])) {
          setBalances(cache.balances[chainName].data);
          setIsLoadingBalances(false);
          return;
        }

        const selectedChainData = chains.find((chain) => chain.chain_name === chainName);
        if (!selectedChainData?.apis?.rest?.[0]?.address) {
          setBalances([]);
          return;
        }

        const fullUrl = `${selectedChainData.apis.rest[0].address}/cosmos/bank/v1beta1/balances/${TEST_ADDRESS}`;
        const response = await fetch(fullUrl, {
          mode: 'cors',
          headers: {
            Accept: 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (!data || !Array.isArray(data.balances)) {
          throw new Error('Invalid response format');
        }

        if (!cache.balances) cache.balances = {};
        cache.balances[chainName] = { data: data.balances, timestamp: Date.now() };

        setBalances(data.balances);
        setError(null);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error fetching balances';
        setError(errorMessage);
        console.error('Error fetching balances:', error);
        setBalances([]);
      } finally {
        setIsLoadingBalances(false);
      }
    },
    [chains, isCacheValid]
  );

  useEffect(() => {
    fetchChainData();
  }, [fetchChainData]);

  useEffect(() => {
    if (selectedChain) {
      fetchAssetData(selectedChain);
      fetchBalances(selectedChain);
    } else {
      setAssets([]);
      setBalances([]);
    }
  }, [selectedChain, fetchAssetData, fetchBalances]);

  const isLoading = useMemo(
    () => isLoadingAssets || isLoadingBalances,
    [isLoadingAssets, isLoadingBalances]
  );

  return {
    chains,
    selectedChain,
    setSelectedChain,
    assets,
    balances,
    isLoadingAssets,
    isLoadingBalances,
    isLoading,
    error,
    refetch: {
      chains: fetchChainData,
      assets: () => fetchAssetData(selectedChain),
      balances: () => fetchBalances(selectedChain),
    },
  };
}
