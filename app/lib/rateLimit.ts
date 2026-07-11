// lib/rateLimit.ts
type RateLimitEntry = {
  count: number;
  resetAt: number;
};

class RateLimiter {
  private store = new Map<string, RateLimitEntry>();

  /**
   * @param key - unique identifier (e.g., `userId:endpoint`)
   * @param limit - max requests per window
   * @param windowSeconds - time window in seconds
   * @returns true if allowed, false if limited
   */
  check(key: string, limit: number, windowSeconds: number): boolean {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry) {
      this.store.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
      return true;
    }

    if (now > entry.resetAt) {
      // Reset window
      this.store.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
      return true;
    }

    if (entry.count < limit) {
      entry.count++;
      return true;
    }

    return false; // Rate limited
  }
}

export const rateLimiter = new RateLimiter();
