"use client";

import { DashboardProvider } from "./DashboardContext";
import UserDashboardSidebar from "./components/UserDashboardSidebar";
import { UserProvider } from "./UserContext";
import { ReactNode, useState, useEffect } from "react";

interface DashboardClientWrapperProps {
  user: {
    id: string;
    email: string;
    fullName: string;
    avatar?: string;
    subscription?: string;
    profile?: Record<string, any>;
  };
  children: ReactNode;
}

export default function DashboardClientWrapper({
  user,
  children,
}: DashboardClientWrapperProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return (
    <DashboardProvider>
      <UserProvider user={user}>
        <div className="flex h-screen bg-gradient-to-b from-emerald-100 to-white">
          <UserDashboardSidebar user={user} isMobile={isMobile} />
          <main
            className={`flex-1 overflow-auto ${isMobile ? "pt-16 pb-24" : ""}`}
          >
            {children}
          </main>
        </div>
      </UserProvider>
    </DashboardProvider>
  );
}
