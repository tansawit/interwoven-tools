const DEFAULT_TIMEOUT_MS = 10_000;

export interface FetchJsonOptions extends RequestInit {
  /** Abort the request after this many milliseconds. */
  timeoutMs?: number;
}

/**
 * fetch() wrapper that applies a timeout, throws on non-2xx responses and parses JSON.
 * Works on both the server and in the browser.
 */
export async function fetchJson<T>(url: string, options: FetchJsonOptions = {}): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, headers, ...init } = options;
  const signal = init.signal
    ? AbortSignal.any([init.signal, AbortSignal.timeout(timeoutMs)])
    : AbortSignal.timeout(timeoutMs);

  const response = await fetch(url, {
    ...init,
    headers: init.body ? { 'Content-Type': 'application/json', ...headers } : headers,
    signal,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status} (${url})`);
  }

  return response.json() as Promise<T>;
}
