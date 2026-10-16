import { useCallback, useEffect, useState } from 'react';

interface FetchState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  lastUpdated: Date | null;
}

interface UseFetchOptions {
  /** Re-run the loader every `refreshInterval` milliseconds. */
  refreshInterval?: number;
}

/**
 * Runs `load` on mount (and on refresh/interval) and tracks its result.
 * `load` must be stable, e.g. defined at module scope.
 * Previous data is kept while refreshing and when a refresh fails.
 */
export function useFetch<T>(load: () => Promise<T>, { refreshInterval }: UseFetchOptions = {}) {
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    error: null,
    loading: true,
    lastUpdated: null,
  });
  const [refreshToken, setRefreshToken] = useState(0);

  const refresh = useCallback(() => {
    setState((current) => ({ ...current, loading: true, error: null }));
    setRefreshToken((token) => token + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    load().then(
      (data) => {
        if (!cancelled) setState({ data, error: null, loading: false, lastUpdated: new Date() });
      },
      (e: unknown) => {
        if (cancelled) return;
        console.error('Failed to fetch data:', e);
        const error = e instanceof Error ? e.message : 'Failed to fetch data';
        setState((current) => ({ ...current, error, loading: false }));
      }
    );
    return () => {
      cancelled = true;
    };
  }, [load, refreshToken]);

  useEffect(() => {
    if (!refreshInterval) return;
    const intervalId = setInterval(refresh, refreshInterval);
    return () => clearInterval(intervalId);
  }, [refresh, refreshInterval]);

  return { ...state, refresh };
}
