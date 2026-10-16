import { useState, useEffect, useMemo } from 'react';
import { Chain, getChains } from '@/lib/registry';

export type { Chain };

interface UseChainsOptions {
  /** Filter function to apply to chains. Must be stable (e.g. defined at module scope). */
  filter?: (chain: Chain) => boolean;
  /** Whether to auto-select the first chain */
  autoSelect?: boolean;
}

export const hasRestEndpoint = (chain: Chain) =>
  !!chain.apis?.rest && chain.apis.rest.length > 0;

// The registry rarely changes, so share one request across every page and component.
let chainsRequest: Promise<Chain[]> | null = null;

function loadChains(): Promise<Chain[]> {
  chainsRequest ??= getChains().catch((error) => {
    chainsRequest = null; // allow retrying after a failure
    throw error;
  });
  return chainsRequest;
}

export function useChains({ filter = hasRestEndpoint, autoSelect = true }: UseChainsOptions = {}) {
  const [allChains, setAllChains] = useState<Chain[]>([]);
  const [userSelectedChain, setSelectedChain] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadChains()
      .then((result) => {
        if (!cancelled) setAllChains(result);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        console.error('Failed to fetch chains:', e);
        setError(e instanceof Error ? e.message : 'Failed to fetch chains from registry');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const chains = useMemo(() => allChains.filter(filter), [allChains, filter]);

  const selectedChain =
    userSelectedChain || (autoSelect && chains.length > 0 ? chains[0].chain_name : '');

  const selectedChainData = useMemo(
    () => chains.find((chain) => chain.chain_name === selectedChain) || chains[0],
    [chains, selectedChain]
  );

  return {
    chains,
    selectedChain,
    setSelectedChain,
    loading,
    error,
    selectedChainData,
  };
}
