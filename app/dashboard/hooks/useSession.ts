// app/hooks/useSession.ts
// Listens to the user's active session in real‑time

import { useEffect, useState } from "react";
import { ref, onValue, off } from "firebase/database";
import { db } from "@/app/utils/firebaseConfig";

export function useActiveSession(userId?: string) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    // Listen to the map, not a single node
    const sessionsRef = ref(db, `doza/users/${userId}/activeSessions`);
    const unsubscribe = onValue(sessionsRef, (snap) => {
      setLoading(false);
      if (snap.exists()) {
        const data = snap.val();
        const sessionArray = Object.entries(data).map(
          ([centerId, session]) => ({
            ...(session as any),
            centerId,
          }),
        );
        setSessions(sessionArray);
      } else {
        setSessions([]);
      }
    });
    return () => off(sessionsRef);
  }, [userId]);

  return { sessions, loading };
}
