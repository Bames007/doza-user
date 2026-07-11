// app/utils/client-auth.ts

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
    if (auth.currentUser) {
      try {
        const token = await auth.currentUser.getIdToken(true);
        return token;
      } catch {
        try {
          const token = await auth.currentUser.getIdToken(false);
          return token;
        } catch {
          return null;
        }
      }
    }

    const user = await waitForUser();
    if (!user) return null;

    try {
      const token = await user.getIdToken(true);
      return token;
    } catch {
      try {
        const token = await user.getIdToken(false);
        return token;
      } catch {
        return null;
      }
    }
  } catch {
    return null;
  }
}

export async function authFetcher(url: string) {
  const token = await getAuthToken();
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, { headers });
  const text = await res.text();
  let result;
  try {
    result = JSON.parse(text);
  } catch {
    result = { error: "Invalid JSON response" };
  }

  if (!res.ok) {
    // Only log the status – never the response body
    console.error(`❌ ${url} failed (${res.status})`);
    return result;
  }
  return result;
}

export async function authPost(url: string, data?: any) {
  const token = await getAuthToken();
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  });
  const result = await res.json();

  if (!res.ok) {
    console.error(`❌ POST ${url} failed (${res.status})`);
    return result;
  }
  return result;
}

export async function authPut(url: string, data?: any) {
  const token = await getAuthToken();
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method: "PUT",
    headers,
    body: JSON.stringify(data),
  });
  const result = await res.json();

  if (!res.ok) {
    console.error(`❌ PUT ${url} failed (${res.status})`);
    return result;
  }
  return result;
}

export async function authDelete(url: string) {
  const token = await getAuthToken();
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, { method: "DELETE", headers });
  const result = await res.json();

  if (!res.ok) {
    console.error(`❌ DELETE ${url} failed (${res.status})`);
    return result;
  }
  return result;
}
