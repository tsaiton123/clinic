export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function createHttpClient(baseUrl: string, fetcher: typeof fetch = fetch, now = Date.now) {
  const cache = new Map<string, { value: unknown; expires: number }>();
  const pending = new Map<string, Promise<unknown>>();
  const listeners = new Set<() => void>();
  let generation = 0;

  function clearCache() {
    generation += 1;
    cache.clear();
    pending.clear();
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }

  async function request<T>(
    path: string,
    options: RequestInit = {},
    token?: string | null,
    cacheMs = 0,
  ): Promise<T> {
    const method = (options.method ?? "GET").toUpperCase();
    // Explicitly abortable requests have their own lifecycle, never a shared fetch.
    const shareable = method === "GET" && !options.signal;
    const key = JSON.stringify([token ?? "", path, Array.from(new Headers(options.headers))]);
    const cached = shareable && cacheMs > 0 ? cache.get(key) : undefined;
    if (cached && cached.expires > now()) return cached.value as T;
    cache.delete(key);
    const existing = shareable ? pending.get(key) : undefined;
    if (existing) return existing as Promise<T>;

    const startedGeneration = generation;
    const run = async (): Promise<T> => {
      const headers = new Headers(options.headers);
      if (options.body != null && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
      if (token) headers.set("Authorization", `Bearer ${token}`);
      const response = await fetcher(`${baseUrl}${path}`, { ...options, headers });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new ApiError(response.status, body.detail ?? "API request failed");
      }
      if (method !== "GET" && method !== "HEAD") {
        clearCache();
        listeners.forEach((listener) => listener());
      }
      const value = response.status === 204 ? undefined : await response.json();
      if (shareable && cacheMs > 0 && generation === startedGeneration) {
        // Bounded, memory-only cache; logout and successful mutations clear it.
        if (cache.size >= 100) cache.delete(cache.keys().next().value!);
        cache.set(key, { value, expires: now() + cacheMs });
      }
      return value as T;
    };
    const result = run();
    if (shareable) pending.set(key, result);
    try {
      return await result;
    } finally {
      if (pending.get(key) === result) pending.delete(key);
    }
  }

  return { request, clearCache, subscribe };
}
