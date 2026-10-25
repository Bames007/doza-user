"use client";

import { useEffect } from "react";

/**
 * Registers the Doza service worker.
 * - Safe in dev: SW has no fetch handler, so it won't interfere with HMR.
 * - Calls reg.update() on every load so deploys propagate quickly.
 * - Silent on failure — non-critical for the app to function.
 */
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    // Register once per page load; the browser dedupes internally.
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        // Nudge the browser to check for an update on every navigation.
        reg.update().catch(() => {});
      })
      .catch((err) => {
        console.warn("[SW] Registration failed:", err);
      });
  }, []);

  return null;
}
