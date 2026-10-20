// app/utils/client-auth.ts
import logger from "./logger";

// -------------------------------------------------------------------
// 1. Helper – read user identity from localStorage (for headers only)
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
// 3. authFetcher – with offline handling & smarter 401 guard
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
      credentials: "include", // ← always send cookies
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

    // 🔐 Session expired or missing – but avoid redirect loops
    if (res.status === 401 && typeof window !== "undefined") {
      // Skip redirect for auth endpoints and if already on login page
      const isAuthEndpoint = url.includes("/api/auth/");
      const isLoginPage = window.location.pathname === "/login";
      const isHomePage = window.location.pathname === "/";

      if (!isAuthEndpoint && !isLoginPage && !isHomePage) {
        // Clear stale user data
        localStorage.removeItem("userSession");
        localStorage.removeItem("userId");
        localStorage.removeItem("userName");
        localStorage.removeItem("userRole");
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
// 4. Other HTTP methods (with same 401 guard)
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
      const isAuthEndpoint = url.includes("/api/auth/");
      const isLoginPage = window.location.pathname === "/login";
      if (!isAuthEndpoint && !isLoginPage) {
        localStorage.removeItem("userSession");
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
      const isAuthEndpoint = url.includes("/api/auth/");
      const isLoginPage = window.location.pathname === "/login";
      if (!isAuthEndpoint && !isLoginPage) {
        localStorage.removeItem("userSession");
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
      const isAuthEndpoint = url.includes("/api/auth/");
      const isLoginPage = window.location.pathname === "/login";
      if (!isAuthEndpoint && !isLoginPage) {
        localStorage.removeItem("userSession");
        window.location.href = "/login";
      }
      throw new Error("AUTH_REQUIRED");
    }
    throw new Error(`HTTP ${res.status}: ${result.error || res.statusText}`);
  }
  return result;
}
