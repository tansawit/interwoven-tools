import 'server-only';

interface Entry<T> {
  value?: T;
  updatedAt: number;
  pending?: Promise<T>;
}

const store = new Map<string, Entry<unknown>>();

function refresh<T>(key: string, load: () => Promise<T>): Promise<T> {
  const previous = store.get(key) as Entry<T> | undefined;
  const pending = load().then(
    (value) => {
      store.set(key, { value, updatedAt: Date.now() });
      return value;
    },
    (error) => {
      const current = store.get(key);
      if (current?.pending === pending) current.pending = undefined;
      throw error;
    }
  );
  store.set(key, { value: previous?.value, updatedAt: previous?.updatedAt ?? 0, pending });
  return pending;
}

/**
 * In-memory stale-while-revalidate cache for expensive upstream aggregations.
 *
 * - Fresh values (younger than `ttlMs`) are returned immediately.
 * - Stale values (younger than `maxStaleMs`) are returned immediately while a single
 *   background refresh runs.
 * - Concurrent cold requests share one in-flight load instead of each hitting upstream.
 */
export async function cached<T>(
  key: string,
  ttlMs: number,
  load: () => Promise<T>,
  maxStaleMs = ttlMs * 10
): Promise<T> {
  const entry = store.get(key) as Entry<T> | undefined;
  const age = Date.now() - (entry?.updatedAt ?? 0);

  if (entry?.value !== undefined && age < maxStaleMs) {
    if (age >= ttlMs && !entry.pending) {
      refresh(key, load).catch((error) => console.error(`Background refresh of ${key} failed:`, error));
    }
    return entry.value;
  }

  return entry?.pending ?? refresh(key, load);
}

/** Cache-Control header letting a CDN share responses between visitors. */
export function cacheHeaders(ttlSeconds: number) {
  return {
    'Cache-Control': `public, s-maxage=${ttlSeconds}, stale-while-revalidate=${ttlSeconds * 10}`,
  };
}
