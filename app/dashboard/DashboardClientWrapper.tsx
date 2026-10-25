// app/dashboard/DashboardClientWrapper.tsx
"use client";

import {
  ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { UserProvider, User } from "./UserContext";
import { DashboardProvider } from "./DashboardContext";
import UserDashboardSidebar from "./components/UserDashboardSidebar";
import { cn } from "@/app/utils/utils";
import BubbleTransition from "@/app/components/BubbleTransitions";

export default function DashboardClientWrapper({
  user,
  children,
}: {
  user: User;
  children: ReactNode;
}) {
  // ─── Mobile detection — runs BEFORE first paint ──────────────
  // Prevents the "desktop layout flash → mobile layout" jump on phones.
  const [isMobile, setIsMobile] = useState(false);
  useLayoutEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ─── Bubble lifecycle ─────────────────────────────────────────
  // Start with the bubble VISIBLE from frame 0 — this is the key
  // difference from before. No dashboard paint before the bubble.
  const [showBubble, setShowBubble] = useState(true);
  const [bubblePhase, setBubblePhase] = useState<"closing" | "opening">(
    "closing",
  );
  const [closingDone, setClosingDone] = useState(false);

  // ─── Readiness signals ────────────────────────────────────────
  // Dashboard "ready" = children laid out AND painted (two rAFs).
  // Do NOT let the bubble open before this — otherwise the user
  // sees the dashboard emerge slowly / blank.
  const dashboardReadyRef = useRef(false);
  const minimumHoldRef = useRef(false);

  useEffect(() => {
    let raf1 = 0;
    let raf2 = 0;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        dashboardReadyRef.current = true;
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, []);

  // Tiny safety net — bubble never blinks shorter than this
  useEffect(() => {
    const t = setTimeout(() => {
      minimumHoldRef.current = true;
    }, 400);
    return () => clearTimeout(t);
  }, []);

  // ─── Phase transitions ───────────────────────────────────────
  const handleAnimationComplete = useCallback(() => {
    if (bubblePhase === "closing") {
      setClosingDone(true);
    } else {
      // Opening finished → unmount bubble instantly.
      // No AnimatePresence exit fade = dashboard is visible instantly
      // (it was already painted behind the opening panels).
      setShowBubble(false);
    }
  }, [bubblePhase]);

  // Hold in the "closed" state until dashboard is ready
  useEffect(() => {
    if (!closingDone || bubblePhase !== "closing") return;

    let cancelled = false;
    let rafId = 0;
    const tick = () => {
      if (cancelled) return;
      if (dashboardReadyRef.current && minimumHoldRef.current) {
        setBubblePhase("opening");
        return;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [closingDone, bubblePhase]);

  // Dashboard paints ONLY when it can be seen:
  //   closing → hidden (bubble wrapper covers it anyway)
  //   opening → visible (paint behind the sliding panels)
  //   done    → visible
  const dashboardVisible = !showBubble || bubblePhase === "opening";

  return (
    <UserProvider user={user}>
      <DashboardProvider>
        {/* Rendered conditionally — NO AnimatePresence.
            When showBubble flips to false, the bubble unmounts in
            the same commit. Its opening animation already slid the
            panels off-screen, so unmounting is invisible. */}
        {showBubble && (
          <BubbleTransition
            role="user"
            phase={bubblePhase}
            onAnimationComplete={handleAnimationComplete}
          />
        )}

        <div
          className={cn(
            "flex h-screen overflow-hidden bg-slate-50",
            dashboardVisible ? "visible" : "invisible",
          )}
        >
          <UserDashboardSidebar isMobile={isMobile} />
          <main
            id="dashboard-scroll"
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
