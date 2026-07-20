// app/utils/client-auth.ts

import { auth } from "./firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import logger from "./logger";

let authReadyPromise: Promise<any> | null = null;
let authTokenCache: string | null = null;
let tokenExpiry: number = 0;

// --- Helper to read user identity from localStorage ---
function getUserIdentity(): { id: string; name: string; role: string } {
  let id = "";
  let name = "";
  let role = "";

  if (typeof window !== "undefined") {
    // 🔍 Try to read from the main userSession
    const sessionData = localStorage.getItem("userSession");
    if (sessionData) {
      try {
        const session = JSON.parse(sessionData);
        const user = session.user || session;
        id = user.id || "";
        name = user.fullName || user.name || user.userName || "";
        role = user.role || "";
      } catch {}
    }

    // Fallback to individual keys (if set by DashboardContext)
    if (!id) id = localStorage.getItem("userId") || "";
    if (!name) name = localStorage.getItem("userName") || "";
    if (!role) role = localStorage.getItem("userRole") || "";
  }

  return { id, name, role };
}

function waitForUser(): Promise<any> {
  if (authReadyPromise) return authReadyPromise;
  authReadyPromise = new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
  return authReadyPromise;
}

export async function getAuthToken(): Promise<string | null> {
  try {
    if (authTokenCache && Date.now() < tokenExpiry) {
      return authTokenCache;
    }

    if (auth.currentUser) {
      try {
        const token = await auth.currentUser.getIdToken(true);
        authTokenCache = token;
        tokenExpiry = Date.now() + 5 * 60 * 1000;
        return token;
      } catch {
        try {
          const token = await auth.currentUser.getIdToken(false);
          authTokenCache = token;
          tokenExpiry = Date.now() + 5 * 60 * 1000;
          return token;
        } catch {
          return null;
        }
      }
    }

    const user = (await Promise.race([
      waitForUser(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 10000),
      ),
    ])) as any;

    if (!user) {
      logger.warn("No Firebase user found after waiting");
      return null;
    }

    try {
      const token = await user.getIdToken(true);
      authTokenCache = token;
      tokenExpiry = Date.now() + 5 * 60 * 1000;
      return token;
    } catch {
      try {
        const token = await user.getIdToken(false);
        authTokenCache = token;
        tokenExpiry = Date.now() + 5 * 60 * 1000;
        return token;
      } catch {
        return null;
      }
    }
  } catch (error) {
    logger.error({ error: String(error) }, "Failed to get auth token");
    return null;
  }
}

// --- Helper to build headers with both auth and identity ---
// Returns both headers and the token, so we can log token presence.
async function buildHeaders(
  extraHeaders?: Record<string, string>,
): Promise<{ headers: Record<string, string>; token: string | null }> {
  const token = await getAuthToken();
  const identity = getUserIdentity();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...extraHeaders,
  };

  // Add Authorization token if available
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  } else {
    logger.warn("No auth token available for request");
  }

  // ✅ Always add user identity headers (critical for approval chain)
  if (identity.id) headers["x-user-id"] = identity.id;
  if (identity.name) headers["x-user-name"] = identity.name;
  if (identity.role) headers["x-user-role"] = identity.role;

  return { headers, token };
}

// --- Fetchers ---

export async function authFetcher(url: string, options?: RequestInit) {
  const { headers, token } = await buildHeaders(
    options?.headers as Record<string, string>,
  );
  const res = await fetch(url, { ...options, headers, credentials: "include" });
  const text = await res.text();
  let result;
  try {
    result = JSON.parse(text);
  } catch {
    result = { error: "Invalid JSON response" };
  }

  if (!res.ok) {
    logger.error(
      { url, status: res.status, tokenPresent: !!token },
      `API request failed: ${url} (${res.status})`,
    );
    throw new Error(`HTTP ${res.status}: ${result.error || res.statusText}`);
  }
  return result;
}

export async function authPost(url: string, data?: any) {
  const { headers, token } = await buildHeaders();
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
    credentials: "include",
  });
  const result = await res.json();
  if (!res.ok) {
    logger.error(
      { url, status: res.status, tokenPresent: !!token },
      `POST request failed: ${url} (${res.status})`,
    );
    throw new Error(`HTTP ${res.status}: ${result.error || res.statusText}`);
  }
  return result;
}

export async function authPut(url: string, data?: any) {
  const { headers, token } = await buildHeaders();
  const res = await fetch(url, {
    method: "PUT",
    headers,
    body: JSON.stringify(data),
    credentials: "include",
  });
  const result = await res.json();
  if (!res.ok) {
    logger.error(
      { url, status: res.status, tokenPresent: !!token },
      `PUT request failed: ${url} (${res.status})`,
    );
    throw new Error(`HTTP ${res.status}: ${result.error || res.statusText}`);
  }
  return result;
}

export async function authDelete(url: string) {
  const { headers, token } = await buildHeaders();
  const res = await fetch(url, {
    method: "DELETE",
    headers,
    credentials: "include",
  });
  const result = await res.json();
  if (!res.ok) {
    logger.error(
      { url, status: res.status, tokenPresent: !!token },
      `DELETE request failed: ${url} (${res.status})`,
    );
    throw new Error(`HTTP ${res.status}: ${result.error || res.statusText}`);
  }
  return result;
}
