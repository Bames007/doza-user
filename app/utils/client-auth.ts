// app/utils/client-auth.ts
import logger from "./logger";

// -------------------------------------------------------------------
// 1. Helper – read user identity from localStorage (unchanged)
// -------------------------------------------------------------------
function getUserIdentity(): { id: string; name: string; role: string } {
  let id = "",
    name = "",
    role = "";
  if (typeof window !== "undefined") {
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
    if (!id) id = localStorage.getItem("userId") || "";
    if (!name) name = localStorage.getItem("userName") || "";
    if (!role) role = localStorage.getItem("userRole") || "";
  }
  return { id, name, role };
}

// -------------------------------------------------------------------
// 2. Build headers – includes x-user-id for non‑auth identification
// -------------------------------------------------------------------
async function buildHeaders(extraHeaders?: Record<string, string>) {
  const identity = getUserIdentity();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...extraHeaders,
  };
  if (identity.id) headers["x-user-id"] = identity.id;
  if (identity.name) headers["x-user-name"] = identity.name;
  if (identity.role) headers["x-user-role"] = identity.role;
  return { headers };
}

// -------------------------------------------------------------------
// 3. authFetcher – now with offline & 401 handling
// -------------------------------------------------------------------
export async function authFetcher(url: string, options?: RequestInit) {
  const { headers } = await buildHeaders(
    options?.headers as Record<string, string>,
  );

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers,
      credentials: "include", // sends session cookie automatically
    });
  } catch (fetchError: any) {
    // Network offline – no response at all
    logger.warn({ url }, "Network error – likely offline");
    throw new Error("NETWORK_OFFLINE");
  }

  // Try to parse response body
  const text = await res.text();
  let result;
  try {
    result = JSON.parse(text);
  } catch {
    result = { error: `Invalid response (status ${res.status})` };
  }

  if (!res.ok) {
    // Log the error for debugging
    logger.error(
      { url, status: res.status, body: text.substring(0, 200) },
      `API request failed: ${url} (${res.status})`,
    );

    // 🔐 Session expired or missing → redirect to login
    if (res.status === 401 && typeof window !== "undefined") {
      // Clear stale user data
      localStorage.removeItem("userSession");
      // Only redirect if we're not already on the login page
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
      throw new Error("AUTH_REQUIRED");
    }

    // Other server errors
    throw new Error(
      result.error ||
        `HTTP ${res.status}: ${text.substring(0, 100)}${text.length > 100 ? "…" : ""}`,
    );
  }

  return result;
}

// -------------------------------------------------------------------
// 4. Other HTTP methods (unchanged, but use the same 401 guard)
// -------------------------------------------------------------------
export async function authPost(url: string, data?: any) {
  const { headers } = await buildHeaders();
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
      credentials: "include",
    });
  } catch {
    throw new Error("NETWORK_OFFLINE");
  }
  const result = await res.json();
  if (!res.ok) {
    logger.error(
      { url, status: res.status },
      `POST request failed: ${url} (${res.status})`,
    );
    if (res.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("userSession");
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
      throw new Error("AUTH_REQUIRED");
    }
    throw new Error(`HTTP ${res.status}: ${result.error || res.statusText}`);
  }
  return result;
}

export async function authPut(url: string, data?: any) {
  const { headers } = await buildHeaders();
  let res: Response;
  try {
    res = await fetch(url, {
      method: "PUT",
      headers,
      body: JSON.stringify(data),
      credentials: "include",
    });
  } catch {
    throw new Error("NETWORK_OFFLINE");
  }
  const result = await res.json();
  if (!res.ok) {
    logger.error(
      { url, status: res.status },
      `PUT request failed: ${url} (${res.status})`,
    );
    if (res.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("userSession");
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
      throw new Error("AUTH_REQUIRED");
    }
    throw new Error(`HTTP ${res.status}: ${result.error || res.statusText}`);
  }
  return result;
}

export async function authDelete(url: string) {
  const { headers } = await buildHeaders();
  let res: Response;
  try {
    res = await fetch(url, {
      method: "DELETE",
      headers,
      credentials: "include",
    });
  } catch {
    throw new Error("NETWORK_OFFLINE");
  }
  const result = await res.json();
  if (!res.ok) {
    logger.error(
      { url, status: res.status },
      `DELETE request failed: ${url} (${res.status})`,
    );
    if (res.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("userSession");
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
      throw new Error("AUTH_REQUIRED");
    }
    throw new Error(`HTTP ${res.status}: ${result.error || res.statusText}`);
  }
  return result;
}
