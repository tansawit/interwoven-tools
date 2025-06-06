import { useState, useEffect } from 'react';

export interface Chain {
  chain_name: string;
  pretty_name: string;
  chain_id: string;
  network_type: string;
  apis?: {
    rest?: Array<{ address: string }>;
    rpc?: Array<{ address: string }>;
    'json-rpc'?: Array<{ address: string }>;
  };
  metadata?: {
    op_bridge_id?: string;
    minitia?: {
      type: string;
      version: string;
    };
  };
  logo_URIs?: {
    png?: string;
  };
}

interface UseChainsOptions {
  /** Filter function to apply to chains */
  filter?: (chain: Chain) => boolean;
  /** Whether to auto-select the first chain */
  autoSelect?: boolean;
}

export function useChains(options: UseChainsOptions = {}) {
  const [chains, setChains] = useState<Chain[]>([]);
  const [selectedChain, setSelectedChain] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const { filter, autoSelect = true } = options;

  const fetchChains = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('Fetching chains from registry...');
      const response = await fetch('https://registry.initia.xyz/chains.json');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: Chain[] = await response.json();
      console.log('Chains received:', result);

      // Apply custom filter if provided, otherwise default to chains with REST endpoints
      const filteredChains = result.filter(
        filter || ((chain) => chain.apis?.rest && chain.apis.rest.length > 0)
      );

      setChains(filteredChains);

      // Auto-select first chain if enabled and no chain is selected
      if (autoSelect && filteredChains.length > 0 && !selectedChain) {
        setSelectedChain(filteredChains[0].chain_name);
      }
    } catch (e: unknown) {
      console.error('Failed to fetch chains:', e);
      const errorMessage = e instanceof Error ? e.message : 'Failed to fetch chains from registry';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getSelectedChain = () =>
    chains.find((chain) => chain.chain_name === selectedChain) || chains[0];

  const refreshChains = () => {
    fetchChains();
  };

  useEffect(() => {
    fetchChains();
  }, []);

  return {
    chains,
    selectedChain,
    setSelectedChain,
    loading,
    error,
    getSelectedChain,
    refreshChains,
  };
}
