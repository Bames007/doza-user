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
import { DashboardProvider, useDashboard, PanelId } from "./DashboardContext";
import UserDashboardSidebar from "./components/UserDashboardSidebar";
import { cn } from "@/app/utils/utils";
import BubbleTransition from "@/app/components/BubbleTransitions";

// ─── Deep link support ─────────────────────────────────────────
// Reads ?panel=xxx on mount and applies it before the dashboard
// paints. Notification clicks land directly on the target panel.
//
// Uses window.location (NOT useSearchParams) to avoid Next 14's
// Suspense bailout — this component runs once on mount anyway.
const VALID_PANELS: PanelId[] = [
  "dashboard",
  "health-tracker",
  "medications",
  "challenges",
  "family-friends",
  "doza-panel",
  "doza-medics",
  "doza-map",
  "profile",
  "settings",
  "moodboard-history",
  "doza-therapist",
  "help",
  "doza-sport-shop",
  "doza-medical-shop",
  "appointment",
  "notifications",
];

function DeepLinkHandler() {
  const { setActivePanel } = useDashboard();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const panel = params.get("panel");
    if (!panel) return;
    if (!VALID_PANELS.includes(panel as PanelId)) return;

    // Apply the panel — the DeepLinkHandler runs at the same commit
    // as BubbleTransition, so the target panel is what the bubble
    // reveals, not the default dashboard.
    setActivePanel(panel as PanelId);

    // Clean the URL so ?panel= doesn't persist across refreshes.
    // Use replace (not push) so the browser back button still works
    // as users expect (no ghost entry for the deep-linked state).
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("panel");
      window.history.replaceState({}, "", url.toString());
    } catch {}
  }, [setActivePanel]);

  return null;
}

export default function DashboardClientWrapper({
  user,
  children,
}: {
  user: User;
  children: ReactNode;
}) {
  // ─── Mobile detection — runs BEFORE first paint ──────────────
  const [isMobile, setIsMobile] = useState(false);
  useLayoutEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ─── Bubble lifecycle ─────────────────────────────────────────
  const [showBubble, setShowBubble] = useState(true);
  const [bubblePhase, setBubblePhase] = useState<"closing" | "opening">(
    "closing",
  );
  const [closingDone, setClosingDone] = useState(false);

  // ─── Readiness signals ────────────────────────────────────────
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

  const dashboardVisible = !showBubble || bubblePhase === "opening";

  return (
    <UserProvider user={user}>
      <DashboardProvider>
        {/* Deep link: ?panel=medications → opens that panel on mount */}
        <DeepLinkHandler />

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
