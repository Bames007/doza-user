// app/utils/client-auth.ts
import logger from "./logger";

// -------------------------------------------------------------------
// Typed error — carries status, machine-readable code, and meta
// -------------------------------------------------------------------
export class ApiError extends Error {
  status: number;
  code?: string;
  meta?: Record<string, unknown>;
  constructor(
    message: string,
    status: number,
    code?: string,
    meta?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.meta = meta;
  }
}

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
// Shared 4xx/5xx logger — 4xx is a client problem (warn), 5xx is ours (error)
// -------------------------------------------------------------------
function logHttpFailure(
  method: string,
  url: string,
  status: number,
  code?: string,
) {
  if (status >= 400 && status < 500) {
    logger.warn(
      { url, status, code },
      `${method} rejected: ${url} (${status})`,
    );
  } else {
    logger.error(
      { url, status },
      `${method} request failed: ${url} (${status})`,
    );
  }
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
      credentials: "include", // always send cookies
    });
  } catch {
    logger.warn({ url }, "Network error – likely offline");
    throw new Error("NETWORK_OFFLINE");
  }

  const text = await res.text();
  let result: any;
  try {
    result = JSON.parse(text);
  } catch {
    result = { error: `Invalid response (status ${res.status})` };
  }

  if (!res.ok) {
    logHttpFailure(
      (options?.method || "GET").toUpperCase(),
      url,
      res.status,
      result?.code,
    );

    if (res.status === 401 && typeof window !== "undefined") {
      const isAuthEndpoint = url.includes("/api/auth/");
      const isLoginPage = window.location.pathname === "/login";
      const isHomePage = window.location.pathname === "/";

      if (!isAuthEndpoint && !isLoginPage && !isHomePage) {
        localStorage.removeItem("userSession");
        localStorage.removeItem("userId");
        localStorage.removeItem("userName");
        localStorage.removeItem("userRole");
        window.location.href = "/login";
      }
      throw new Error("AUTH_REQUIRED");
    }

    const message =
      result?.error || result?.message || `Request failed (${res.status})`;
    throw new ApiError(message, res.status, result?.code, result?.meta);
  }

  return result;
}

// -------------------------------------------------------------------
// 4. POST / PUT / DELETE
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

  const result = await res.json().catch(() => ({}) as any);

  if (!res.ok) {
    logHttpFailure("POST", url, res.status, result?.code);

    if (res.status === 401 && typeof window !== "undefined") {
      const isAuthEndpoint = url.includes("/api/auth/");
      const isLoginPage = window.location.pathname === "/login";
      if (!isAuthEndpoint && !isLoginPage) {
        localStorage.removeItem("userSession");
        window.location.href = "/login";
      }
      throw new Error("AUTH_REQUIRED");
    }

    const message =
      result?.error || result?.message || res.statusText || "Request failed";
    throw new ApiError(message, res.status, result?.code, result?.meta);
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

  const result = await res.json().catch(() => ({}) as any);

  if (!res.ok) {
    logHttpFailure("PUT", url, res.status, result?.code);

    if (res.status === 401 && typeof window !== "undefined") {
      const isAuthEndpoint = url.includes("/api/auth/");
      const isLoginPage = window.location.pathname === "/login";
      if (!isAuthEndpoint && !isLoginPage) {
        localStorage.removeItem("userSession");
        window.location.href = "/login";
      }
      throw new Error("AUTH_REQUIRED");
    }

    const message =
      result?.error || result?.message || res.statusText || "Request failed";
    throw new ApiError(message, res.status, result?.code, result?.meta);
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

  const result = await res.json().catch(() => ({}) as any);

  if (!res.ok) {
    logHttpFailure("DELETE", url, res.status, result?.code);

    if (res.status === 401 && typeof window !== "undefined") {
      const isAuthEndpoint = url.includes("/api/auth/");
      const isLoginPage = window.location.pathname === "/login";
      if (!isAuthEndpoint && !isLoginPage) {
        localStorage.removeItem("userSession");
        window.location.href = "/login";
      }
      throw new Error("AUTH_REQUIRED");
    }

    const message =
      result?.error || result?.message || res.statusText || "Request failed";
    throw new ApiError(message, res.status, result?.code, result?.meta);
  }

  return result;
}
