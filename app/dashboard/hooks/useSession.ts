// app/dashboard/hooks/useSession.ts
// Real-time listener for the user's active sessions.
// Backed by a module-level cache so remounts render instantly.

import { useEffect, useState } from "react";
import { ref, onValue, off } from "firebase/database";
import { db } from "@/app/utils/firebaseConfig";

// Session-scoped cache. One entry per userId. Module-level so it
// survives panel unmount/remount without putting session data in
// sessionStorage (which Firebase's SDK already caches locally anyway).
const sessionsCache = new Map<string, any[]>();

export function useActiveSession(userId?: string) {
  // Initialize from cache if we have it — no skeleton on remount
  const cached = userId ? sessionsCache.get(userId) : undefined;
  const [sessions, setSessions] = useState<any[]>(cached ?? []);
  const [loading, setLoading] = useState(!cached && Boolean(userId));

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    // If we have cached data, we're not in a loading state — the
    // listener below will still fire with fresh data when available
    if (sessionsCache.has(userId)) {
      setLoading(false);
    }

    const sessionsRef = ref(db, `doza/users/${userId}/activeSessions`);
    const unsubscribe = onValue(sessionsRef, (snap) => {
      let data: any[] = [];
      if (snap.exists()) {
        const val = snap.val();
        data = Object.entries(val).map(([centerId, session]) => ({
          ...(session as any),
          centerId,
        }));
      }
      // Update cache + state
      sessionsCache.set(userId, data);
      setSessions(data);
      setLoading(false);
    });

    return () => off(sessionsRef);
  }, [userId]);

  return { sessions, loading };
}
