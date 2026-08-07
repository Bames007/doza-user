// app/dashboard/hooks/useProfile.ts
"use client";

import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { authFetcher } from "@/app/utils/client-auth";
import { useUserContext } from "../UserContext";
import { auth } from "@/app/utils/firebaseConfig";

export interface UserInfo {
  id: string;
  email: string | null;
  fullName: string;
  avatar: string | null;
  subscription?: string;
  profile: Record<string, any>;
}

export function useUser() {
  // 1. Server‑provided user from context (e.g., after login)
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
      mutateProfile: undefined,
    };
  }

  // 2. Fallback: client‑side Firebase Auth + SWR profile fetch
  const [authUser, setAuthUser] = useState<{
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
  } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
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
    mutate,
  } = useSWR(authUser ? "/api/user/profile" : null, authFetcher, {
    dedupingInterval: 300_000,
    revalidateOnFocus: false,
  });

  const profile = data?.success ? data.data : {};

  // Build fullName from multiple possible sources
  let fullName = "User";
  if (profile.fullName) {
    fullName = profile.fullName;
  } else if (profile.fname || profile.lname) {
    fullName = `${profile.fname || ""} ${profile.lname || ""}`.trim();
  } else if (profile.displayName) {
    fullName = profile.displayName;
  } else if (profile.name) {
    fullName = profile.name;
  } else if (authUser?.displayName) {
    fullName = authUser.displayName;
  }

  // Build avatar URL
  let avatar: string | null = null;
  if (profile.avatarId) {
    avatar = `/assets/avatars/${profile.avatarId}.jpg`;
  } else if (profile.selectedImage) {
    avatar = profile.selectedImage;
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
    mutateProfile: mutate,
  };
}
