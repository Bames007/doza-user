import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { authFetcher } from "@/app/utils/client-auth";
import { useUserContext } from "../UserContext";

export interface UserInfo {
  id: string;
  email: string | null;
  fullName: string;
  avatar: string | null;
  subscription?: string;
  profile: Record<string, any>;
}

export function useUser() {
  // 1. Try to get server‑provided user from context
  const contextUser = useUserContext();

  if (contextUser) {
    return {
      user: {
        id: contextUser.id,
        email: contextUser.email,
        fullName: contextUser.fullName,
        avatar: contextUser.avatar || null,
        subscription: contextUser.subscription,
        profile: contextUser.profile || {},
      } as UserInfo,
      isLoading: false,
      error: null,
    };
  }

  // 2. Fallback to client‑side auth (existing logic)
  const [authUser, setAuthUser] = useState<{
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
  } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
        });
      } else {
        setAuthUser(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const {
    data,
    error,
    isLoading: profileLoading,
  } = useSWR(authUser ? "/api/user/profile" : null, authFetcher);

  const profile = data?.success ? data.data : {};

  // Debug logs
  useEffect(() => {
    if (!authLoading && authUser) {
      console.log("🔥 Auth user:", authUser);
      console.log("📦 Profile from API:", profile);
    }
  }, [authLoading, authUser, profile]);

  let fullName = "User";
  if (profile.fullName) fullName = profile.fullName;
  else if (profile.displayName) fullName = profile.displayName;
  else if (profile.name) fullName = profile.name;
  else if (authUser?.displayName) fullName = authUser.displayName;

  let avatar: string | null = null;
  if (profile.avatarId) {
    avatar = `/assets/avatars/${profile.avatarId}.jpg`;
  } else if (authUser?.photoURL) {
    avatar = authUser.photoURL;
  }

  const user: UserInfo | null = authUser
    ? {
        id: authUser.uid,
        email: authUser.email,
        fullName,
        avatar,
        subscription: profile.subscription,
        profile,
      }
    : null;

  return {
    user,
    isLoading: authLoading || profileLoading,
    error,
  };
}
