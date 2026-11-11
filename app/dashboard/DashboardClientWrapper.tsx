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
import MiniChatPill from "./components/ui/MiniChatPill";
import { cn } from "@/app/utils/utils";
import BubbleTransition from "@/app/components/BubbleTransitions";

// ─── Deep link support ─────────────────────────────────────────
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

    setActivePanel(panel as PanelId);

    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("panel");
      window.history.replaceState({}, "", url.toString());
    } catch {}
  }, [setActivePanel]);

  return null;
}

// ✅ NEW — Global chat pill. Lives inside DashboardProvider so it can
// call setActivePanel, but rendered as a sibling of the layout so the
// fixed positioning never fights with overflow/transform on layout divs.
function GlobalChatPill({ isMobile }: { isMobile: boolean }) {
  const { setActivePanel } = useDashboard();
  return (
    <MiniChatPill
      isMobile={isMobile}
      onOpenChat={() => setActivePanel("appointment")}
    />
  );
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

        {/* ✅ NEW — Global chat pill, always available above every panel */}
        <GlobalChatPill isMobile={isMobile} />
      </DashboardProvider>
    </UserProvider>
  );
}
