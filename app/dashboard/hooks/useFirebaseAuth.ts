// app/hooks/useFirebaseAuth.ts
import { useEffect, useState } from "react";
import { auth } from "@/app/utils/firebaseConfig";
import { onAuthStateChanged, User } from "firebase/auth";

export function useFirebaseAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return { user, loading };
}
