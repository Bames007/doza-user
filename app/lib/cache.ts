// lib/cache.ts
type CacheEntry<T> = {
  value: T;
  expires: number;
};

class InMemoryCache {
  private store = new Map<string, CacheEntry<any>>();

  set<T>(key: string, value: T, ttlSeconds: number): void {
    const expires = Date.now() + ttlSeconds * 1000;
    this.store.set(key, { value, expires });
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expires) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  clear(): void {
    this.store.clear();
  }
}

export const cache = new InMemoryCache();
