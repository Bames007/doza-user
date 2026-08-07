// app/dashboard/DashboardClientWrapper.tsx

"use client";

import { ReactNode, useEffect, useState } from "react";
import { UserProvider, User } from "./UserContext";
import { DashboardProvider } from "./DashboardContext";
import UserDashboardSidebar from "./components/UserDashboardSidebar";
import { cn } from "@/app/utils/utils";
import BubbleTransition from "@/app/components/BubbleTransitions";
import { AnimatePresence } from "framer-motion";

export default function DashboardClientWrapper({
  user,
  children,
}: {
  user: User;
  children: ReactNode;
}) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Bubble state
  const [showBubble, setShowBubble] = useState(false);
  const [bubblePhase, setBubblePhase] = useState<"closing" | "opening">(
    "closing",
  );

  useEffect(() => {
    const fromLogin = sessionStorage.getItem("fromLogin");
    if (fromLogin) {
      sessionStorage.removeItem("fromLogin");
      setShowBubble(false);
      return;
    }
    // Start the intro animation after a tiny paint delay
    const timer = setTimeout(() => {
      setShowBubble(true);
      setBubblePhase("closing");
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleAnimationComplete = () => {
    if (bubblePhase === "closing") {
      setBubblePhase("opening");
    } else if (bubblePhase === "opening") {
      setShowBubble(false);
    }
  };

  return (
    <UserProvider user={user}>
      <DashboardProvider>
        {/* Bubble transition overlay */}
        <AnimatePresence>
          {showBubble && (
            <BubbleTransition
              role="user"
              phase={bubblePhase}
              onAnimationComplete={handleAnimationComplete}
            />
          )}
        </AnimatePresence>

        {/* Main dashboard – hidden while bubble is visible */}
        <div
          className={cn(
            "flex h-screen overflow-hidden bg-slate-50 transition-opacity duration-500",
            showBubble ? "opacity-0" : "opacity-100",
          )}
        >
          <UserDashboardSidebar isMobile={isMobile} />
          <main
            className={cn(
              "flex-1 overflow-y-auto bg-slate-50",
              isMobile && "pt-14 pb-24",
            )}
          >
            {children}
          </main>
        </div>
      </DashboardProvider>
    </UserProvider>
  );
}
