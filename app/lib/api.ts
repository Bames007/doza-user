// app/lib/api.ts

import logger from "@/app/utils/logger";

type FetchOptions = RequestInit & {
  cacheKey?: string;
  cacheDuration?: number;
  maxRetries?: number;
  headers?: Record<string, string>;
  userId?: string;
};

/**
 * Get authentication headers from localStorage (userSession) or explicit userId.
 */
function getAuthHeaders(userId?: string): Record<string, string> {
  let finalUserId = userId || "";
  let userName = "";
  let userRole = "";

  if (typeof window !== "undefined") {
    const sessionData = localStorage.getItem("userSession");
    if (sessionData) {
      try {
        const session = JSON.parse(sessionData);
        const user = session.user || session;
        finalUserId = finalUserId || user.id || "";
        userName = user.fullName || user.name || user.userName || "";
        userRole = user.role || "";
      } catch {}
    }
    // fallback to individual keys
    if (!finalUserId) finalUserId = localStorage.getItem("userId") || "";
    if (!userName) userName = localStorage.getItem("userName") || "";
    if (!userRole) userRole = localStorage.getItem("userRole") || "";
  }
  return {
    "x-user-id": finalUserId,
    "x-user-name": userName,
    "x-user-role": userRole,
  };
}

/**
 * Sleep helper for retry backoff
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Internal fetch with retry logic (no caching)
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries = 3,
  userId?: string,
): Promise<Response> {
  let lastError: Error;
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new Error("Device is offline");
  }

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const headers = new Headers(options.headers || {});
      const authHeaders = getAuthHeaders(userId);
      for (const [key, value] of Object.entries(authHeaders)) {
        if (value) headers.set(key, value);
      }
      if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
        headers.set("Content-Type", "application/json");
      }

      const response = await fetch(url, {
        ...options,
        headers,
        credentials: "include", // ✅ also send session cookie
      });

      if (!response.ok) {
        let errorMsg = response.statusText;
        try {
          const json = await response.clone().json();
          errorMsg = json.error || json.message || errorMsg;
        } catch {}
        throw new Error(`HTTP ${response.status}: ${errorMsg}`);
      }
      return response;
    } catch (error: any) {
      lastError = error;
      const isClientError = error.message?.includes("HTTP 4");
      if (isClientError || attempt === maxRetries - 1) break;
      const delay = 1000 * Math.pow(2, attempt);
      logger.warn(
        `Retry ${attempt + 1}/${maxRetries} for ${url} in ${delay}ms`,
      );
      await sleep(delay);
    }
  }
  throw lastError!;
}

/**
 * Enhanced fetch with retry, cache, and authentication.
 * Returns the parsed JSON.
 */
export async function apiFetch<T = any>(
  url: string,
  options: FetchOptions = {},
): Promise<T> {
  const {
    cacheKey,
    cacheDuration = 5 * 60 * 1000,
    maxRetries = 3,
    userId,
    ...fetchOptions
  } = options;

  if (cacheKey && typeof window !== "undefined") {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        const age = Date.now() - (parsed.timestamp || 0);
        if (age < cacheDuration) {
          logger.debug(`Using cached data for ${cacheKey}`);
          return parsed.data;
        } else {
          localStorage.removeItem(cacheKey);
        }
      } catch {}
    }
  }

  try {
    const response = await fetchWithRetry(
      url,
      fetchOptions,
      maxRetries,
      userId,
    );
    const json = await response.json();
    const result = json.success !== undefined ? json.data : json;

    if (cacheKey && typeof window !== "undefined") {
      localStorage.setItem(
        cacheKey,
        JSON.stringify({ data: result, timestamp: Date.now() }),
      );
    }
    return result;
  } catch (error) {
    throw error;
  }
}

export async function apiPost<T = any>(
  url: string,
  body: any,
  options?: FetchOptions,
): Promise<T> {
  return apiFetch<T>(url, {
    ...options,
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function apiPut<T = any>(
  url: string,
  body: any,
  options?: FetchOptions,
): Promise<T> {
  return apiFetch<T>(url, {
    ...options,
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function apiDelete<T = any>(
  url: string,
  options?: FetchOptions,
): Promise<T> {
  return apiFetch<T>(url, {
    ...options,
    method: "DELETE",
  });
}
