// app/hooks/useSession.ts
// Listens to the user's active session in real‑time

import { useEffect, useState } from "react";
import { ref, onValue, off } from "firebase/database";
import { db } from "@/app/utils/firebaseConfig";

export function useActiveSession(userId?: string) {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    const sessionRef = ref(db, `doza/users/${userId}/activeSession`);
    const unsubscribe = onValue(sessionRef, (snap) => {
      setLoading(false);
      if (snap.exists()) {
        setSession(snap.val());
      } else {
        setSession(null);
      }
    });
    return () => off(sessionRef);
  }, [userId]);

  return { session, loading };
}
