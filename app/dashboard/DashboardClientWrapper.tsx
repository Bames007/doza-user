"use client";

import { ReactNode } from "react";
import { UserProvider, User } from "./UserContext";
import { DashboardProvider } from "./DashboardContext";
import UserDashboardSidebar from "./components/UserDashboardSidebar";

export default function DashboardClientWrapper({
  user,
  children,
}: {
  user: User;
  children: ReactNode;
}) {
  // Simple mobile detection – you can replace with useMediaQuery
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  return (
    <UserProvider user={user}>
      <DashboardProvider>
        <div className="flex h-screen overflow-hidden">
          <UserDashboardSidebar isMobile={isMobile} />
          <main className="flex-1 overflow-y-auto bg-slate-50">{children}</main>
        </div>
      </DashboardProvider>
    </UserProvider>
  );
}
