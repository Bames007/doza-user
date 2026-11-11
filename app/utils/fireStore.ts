// app/utils/fileStore.ts
"use client";

/**
 * In-memory + sessionStorage cache for chat file bytes.
 * Files are fetched once per session, then served from memory.
 * sessionStorage survives refresh but not tab close.
 */

const CACHE_PREFIX = "doza:file:";
const MEM = new Map<string, string>();

export async function fetchFile(url: string): Promise<string> {
  // 1. Memory cache
  if (MEM.has(url)) return MEM.get(url)!;

  // 2. Session cache
  try {
    const cached = sessionStorage.getItem(CACHE_PREFIX + url);
    if (cached) {
      MEM.set(url, cached);
      return cached;
    }
  } catch {}

  // 3. Network
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  // The endpoint returns { dataUrl: "data:application/pdf;base64,..." }
  const json = await res.json();
  const dataUrl = json?.data?.dataUrl || json?.dataUrl;
  if (!dataUrl) throw new Error("Invalid file response");

  // Cache — swallow quota errors gracefully
  MEM.set(url, dataUrl);
  try {
    sessionStorage.setItem(CACHE_PREFIX + url, dataUrl);
  } catch {
    // Quota exceeded — memory cache still works
  }

  return dataUrl;
}

export function clearFileCache(url?: string) {
  if (url) {
    MEM.delete(url);
    try {
      sessionStorage.removeItem(CACHE_PREFIX + url);
    } catch {}
  } else {
    MEM.clear();
    try {
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const k = sessionStorage.key(i);
        if (k?.startsWith(CACHE_PREFIX)) sessionStorage.removeItem(k);
      }
    } catch {}
  }
}
