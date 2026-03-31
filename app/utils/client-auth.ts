import { auth } from "./firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";

let authReadyPromise: Promise<any> | null = null;

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
    // If we already have a current user, try to get a fresh token
    if (auth.currentUser) {
      try {
        // Force refresh to ensure a valid token
        const token = await auth.currentUser.getIdToken(true);
        console.log("🔑 Got fresh token:", token.substring(0, 10) + "...");
        return token;
      } catch (refreshError) {
        console.warn(
          "⚠️ Force refresh failed, trying without force",
          refreshError,
        );
        try {
          const token = await auth.currentUser.getIdToken(false);
          console.log(
            "🔑 Got token without force:",
            token.substring(0, 10) + "...",
          );
          return token;
        } catch (e) {
          console.error("❌ Failed to get token even without force", e);
          return null;
        }
      }
    }

    // No current user – wait for auth to initialize (user may still be null)
    const user = await waitForUser();
    if (!user) {
      console.warn("⚠️ No user after waiting");
      return null;
    }

    // Now we have a user, try to get a fresh token
    try {
      const token = await user.getIdToken(true);
      console.log(
        "🔑 Got fresh token after waiting:",
        token.substring(0, 10) + "...",
      );
      return token;
    } catch (refreshError) {
      console.warn(
        "⚠️ Force refresh after waiting failed, trying without force",
        refreshError,
      );
      try {
        const token = await user.getIdToken(false);
        console.log(
          "🔑 Got token without force after waiting:",
          token.substring(0, 10) + "...",
        );
        return token;
      } catch (e) {
        console.error("❌ Failed to get token after waiting", e);
        return null;
      }
    }
  } catch (e) {
    console.error("❌ Unexpected error in getAuthToken", e);
    return null;
  }
}

export async function authFetcher(url: string) {
  const token = await getAuthToken();
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
    console.log("📤 Sending request with token to", url);
  } else {
    console.warn("⚠️ No token available for", url);
  }
  const res = await fetch(url, { headers });
  const text = await res.text();
  let result;
  try {
    result = JSON.parse(text);
  } catch {
    result = { error: "Invalid JSON response", raw: text };
  }
  if (!res.ok) {
    console.error(`❌ ${url} failed (${res.status}):`, result);
    return result;
  }
  return result;
}

export async function authPost(url: string, data?: any) {
  const token = await getAuthToken();
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
    console.log("📤 Sending POST request with token to", url);
  } else {
    console.warn("⚠️ No token available for POST", url);
  }
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  });
  const result = await res.json();
  if (!res.ok) {
    console.error(`❌ POST ${url} failed:`, result);
    return result;
  }
  return result;
}

/**
 * PUT request with authentication.
 */
export async function authPut(url: string, data?: any) {
  const token = await getAuthToken();
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
    console.log("📤 Sending PUT request with token to", url);
  } else {
    console.warn("⚠️ No token available for PUT", url);
  }
  const res = await fetch(url, {
    method: "PUT",
    headers,
    body: JSON.stringify(data),
  });
  const result = await res.json();
  if (!res.ok) {
    console.error(`❌ PUT ${url} failed:`, result);
    return result;
  }
  return result;
}

/**
 * DELETE request with authentication.
 */
export async function authDelete(url: string) {
  const token = await getAuthToken();
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
    console.log("📤 Sending DELETE request with token to", url);
  } else {
    console.warn("⚠️ No token available for DELETE", url);
  }
  const res = await fetch(url, { method: "DELETE", headers });
  const result = await res.json();
  if (!res.ok) {
    console.error(`❌ DELETE ${url} failed:`, result);
    return result;
  }
  return result;
}
