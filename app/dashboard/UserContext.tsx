"use client";

import { createContext, useContext, ReactNode } from "react";

export interface User {
  id: string;
  email: string;
  fullName: string;
  avatar?: string;
  subscription?: string;
  profile?: Record<string, any>;
}

const UserContext = createContext<User | null>(null);

export function UserProvider({
  user,
  children,
}: {
  user: User;
  children: ReactNode;
}) {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

export function useUserContext() {
  return useContext(UserContext);
}
