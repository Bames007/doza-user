// app/dashboard/components/AppointmentCountdown.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import useSWR from "swr";
import {
  Video,
  Home,
  X,
  ArrowRight,
  BellRing,
  Clock,
  Calendar,
} from "lucide-react";
import { useDashboard } from "../../DashboardContext";
import { authFetcher } from "@/app/utils/client-auth";
import { cn } from "@/app/utils/utils";

// ─── Constants ─────────────────────────────────────────
const DISMISS_KEY = "appt:countdown:dismissed";
const SHOW_BEFORE_MS = 60 * 60 * 1000; // visible from 60 min before
const HIDE_AFTER_MS = 5 * 60 * 1000; // hidden 5 min after start
const URGENT_MS = 5 * 60 * 1000; // < 5 min → urgent
const SOON_MS = 15 * 60 * 1000; // < 15 min → soon
const TICK_MS = 1000;

type Apt = {
  id: string;
  medicName?: string;
  date: string;
  time: string;
  scheduledAt?: string;
  consultType?: string;
  duration?: string | null;
  status?: string;
};

type Urgency = "calm" | "soon" | "urgent" | "inSession";

// ─── Helpers ───────────────────────────────────────────
function getScheduledMs(apt: Apt): number {
  if (apt.scheduledAt) return new Date(apt.scheduledAt).getTime();
  const [y, m, d] = apt.date.split("-").map(Number);
  const [h, min] = apt.time.split(":").map(Number);
  return new Date(y, m - 1, d, h, min, 0, 0).getTime();
}

// ✅ CHANGE 1 — Detect real page load vs SPA panel switch
//
// Module-level flag survives component remounts (panel switches) because
// the JS module isn't re-evaluated — only the React component remounts.
// On a full page reload (F5 / navigation) the whole module re-runs, so
// the flag resets to `false` and we can detect "this is a fresh load".
let hasHandledFreshNavigation = false;

/**
 * Returns true only on the FIRST component mount after a real page load
 * (initial navigation OR refresh). On panel switches, module state persists
 * so this returns false.
 *
 * - `navigate`     → user typed URL / clicked link → treat as fresh
 * - `reload`       → F5 / Ctrl+R → treat as fresh
 * - `back_forward` → back/forward button → treat as SPA-ish, keep dismissed
 * - `prerender`    → rare, treat as fresh (safe default)
 */
function isFirstMountAfterPageLoad(): boolean {
  if (typeof window === "undefined") return false;
  if (hasHandledFreshNavigation) return false;
  hasHandledFreshNavigation = true;

  try {
    const nav = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    const type = nav?.type;
    return !type || type === "navigate" || type === "reload";
  } catch {
    // If the API is unavailable, err on the side of "yes" — better to
    // show the banner than silently hide it forever.
    return true;
  }
}

function loadDismissed(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(DISMISS_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch {}
  return new Set();
}

function saveDismissed(set: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(DISMISS_KEY, JSON.stringify([...set]));
  } catch {}
}

function fmtParts(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  return {
    h: Math.floor(totalSec / 3600),
    m: Math.floor((totalSec % 3600) / 60),
    s: totalSec % 60,
  };
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const t = new Date();
  return (
    d.getFullYear() === t.getFullYear() &&
    d.getMonth() === t.getMonth() &&
    d.getDate() === t.getDate()
  );
}

function isTomorrow(dateStr: string): boolean {
  const d = new Date(dateStr);
  const t = new Date();
  t.setDate(t.getDate() + 1);
  return (
    d.getFullYear() === t.getFullYear() &&
    d.getMonth() === t.getMonth() &&
    d.getDate() === t.getDate()
  );
}

function fmtDateLabel(dateStr: string): string {
  if (isToday(dateStr)) return "Today";
  if (isTomorrow(dateStr)) return "Tomorrow";
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function getUrgency(diffMs: number): Urgency {
  if (diffMs <= 0) return "inSession";
  if (diffMs <= URGENT_MS) return "urgent";
  if (diffMs <= SOON_MS) return "soon";
  return "calm";
}

// ─── Main ──────────────────────────────────────────────
export default function AppointmentCountdown() {
  const { setActivePanel } = useDashboard();
  const { data } = useSWR("/api/appointments", authFetcher, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    revalidateIfStale: true,
    dedupingInterval: 15_000,
    keepPreviousData: true,
  });

  const appointments: Apt[] = useMemo(
    () => (data?.success ? data.data : []),
    [data],
  );

  const [now, setNow] = useState(() => Date.now());

  // ✅ CHANGE 2 — Clear dismissals on fresh page load, keep them on panel switch
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();

    // First mount after page load → wipe any old dismissals so the banner
    // reappears on refresh (this is the whole point of this fix).
    if (isFirstMountAfterPageLoad()) {
      try {
        sessionStorage.removeItem(DISMISS_KEY);
      } catch {}
      return new Set();
    }

    // Panel switch → the page never reloaded → keep previous dismissals
    return loadDismissed();
  });

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const visibleApt = useMemo(() => {
    const candidates = appointments
      .filter((a) => {
        if (a.status === "cancelled" || a.status === "completed") return false;
        const diff = getScheduledMs(a) - now;
        if (diff > SHOW_BEFORE_MS) return false;
        if (diff < -HIDE_AFTER_MS) return false;
        if (dismissed.has(a.id)) return false;
        return true;
      })
      .sort((a, b) => getScheduledMs(a) - getScheduledMs(b));
    return candidates[0] || null;
  }, [appointments, now, dismissed]);

  if (!visibleApt) return null;

  const scheduledMs = getScheduledMs(visibleApt);
  const diffMs = scheduledMs - now;
  const urgency = getUrgency(diffMs);
  const isSolid = urgency === "urgent" || urgency === "inSession";
  const parts = fmtParts(diffMs);
  const showHours = parts.h > 0;

  const progressPct = isSolid
    ? 100
    : Math.min(
        100,
        Math.max(0, ((SHOW_BEFORE_MS - diffMs) / SHOW_BEFORE_MS) * 100),
      );

  const dismiss = () => {
    const next = new Set(dismissed);
    next.add(visibleApt.id);
    setDismissed(next);
    saveDismissed(next);
  };

  const open = () => {
    setActivePanel("appointment");
    dismiss();
  };

  // Urgency palette
  const accentBar =
    urgency === "soon"
      ? "bg-amber-400"
      : isSolid
        ? "bg-emerald-300"
        : "bg-gradient-to-r from-emerald-500 to-emerald-600";

  const progressBar = isSolid
    ? "bg-white"
    : urgency === "soon"
      ? "bg-amber-400"
      : "bg-emerald-600";

  return (
    <AnimatePresence>
      <motion.div
        key={visibleApt.id}
        initial={{ opacity: 0, y: -12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -12, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.25}
        onDragEnd={(_, info) => {
          if (Math.abs(info.offset.x) > 80) dismiss();
        }}
        style={{ touchAction: "pan-y" }}
        onClick={open}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            open();
          } else if (e.key === "Escape") {
            dismiss();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={`Appointment with ${
          visibleApt.medicName || "your medic"
        }. ${urgency === "inSession" ? "Session in progress, press Enter to join." : "Tap to view."}`}
        className={cn(
          "relative overflow-hidden rounded-2xl border shadow-md cursor-pointer select-none transition-shadow",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2",
          urgency === "inSession"
            ? "bg-emerald-600 border-emerald-500 text-white shadow-emerald-600/30"
            : urgency === "urgent"
              ? "bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/40"
              : urgency === "soon"
                ? "bg-white border-amber-200 shadow-amber-200/30"
                : "bg-white border-emerald-100",
        )}
      >
        {/* Accent bar */}
        <div className={cn("h-1 w-full", accentBar)} />

        <div className="p-3.5 sm:p-4">
          {/* Row 1: badge + date/time chip | actions */}
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
              <StatusBadge urgency={urgency} />
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md tabular-nums",
                  isSolid
                    ? "bg-white/15 text-white/90"
                    : "bg-slate-100 text-slate-700",
                )}
              >
                <Calendar size={9} className="shrink-0" />
                {fmtDateLabel(visibleApt.date)} · {visibleApt.time}
              </span>
            </div>

            <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  open();
                }}
                aria-label="Open appointment"
                className={cn(
                  "min-h-8 min-w-8 inline-flex items-center justify-center rounded-lg transition-colors",
                  isSolid
                    ? "bg-white/20 text-white hover:bg-white/30"
                    : "bg-emerald-600 text-white hover:bg-emerald-700",
                )}
              >
                <ArrowRight size={14} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  dismiss();
                }}
                aria-label="Dismiss"
                className={cn(
                  "min-h-8 min-w-8 inline-flex items-center justify-center rounded-lg transition-colors",
                  isSolid
                    ? "text-white/80 hover:bg-white/15"
                    : "text-slate-400 hover:bg-slate-100",
                )}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Row 2: medic info (left) + countdown hero or enter CTA (right) */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <div
                className={cn(
                  "w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0",
                  isSolid
                    ? "bg-white/20 border border-white/25"
                    : "bg-emerald-50 border border-emerald-100",
                )}
              >
                {urgency === "inSession" ? (
                  <BellRing size={20} className="text-white animate-pulse" />
                ) : visibleApt.consultType === "online" ? (
                  <Video
                    size={20}
                    className={isSolid ? "text-white" : "text-emerald-700"}
                  />
                ) : (
                  <Home
                    size={20}
                    className={isSolid ? "text-white" : "text-emerald-700"}
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-widest truncate",
                    isSolid ? "text-white/70" : "text-slate-500",
                  )}
                >
                  {urgency === "inSession" ? "In session with" : "With"}
                </p>
                <p
                  className={cn(
                    "text-sm sm:text-base font-bold truncate leading-tight mt-0.5",
                    isSolid ? "text-white" : "text-slate-900",
                  )}
                >
                  {visibleApt.medicName || "Your medic"}
                </p>
              </div>
            </div>

            {/* Countdown or Enter button */}
            {urgency === "inSession" ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  open();
                }}
                className="shrink-0 inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-white text-emerald-700 rounded-xl font-bold text-xs sm:text-sm shadow-lg hover:bg-emerald-50 active:scale-[0.98] transition-all min-h-11 whitespace-nowrap"
              >
                Enter
                <ArrowRight size={14} />
              </button>
            ) : (
              <div className="flex items-baseline gap-0.5 tabular-nums shrink-0">
                {showHours && (
                  <>
                    <Digi value={parts.h} label="h" solid={isSolid} />
                    <Colon solid={isSolid} />
                  </>
                )}
                <Digi value={parts.m} label="m" solid={isSolid} />
                <Colon solid={isSolid} />
                <Digi value={parts.s} label="s" solid={isSolid} />
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div
          className={cn(
            "relative h-1",
            isSolid ? "bg-white/20" : "bg-slate-100",
          )}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className={cn("h-full", progressBar)}
          />
        </div>

        {/* Footer hint — only for upcoming, not in-session */}
        {urgency !== "inSession" && (
          <div
            className={cn(
              "px-3.5 sm:px-4 pb-2 pt-1 text-[10px] font-medium flex items-center gap-1.5",
              isSolid ? "text-white/70" : "text-slate-500",
            )}
          >
            <span>Swipe to dismiss</span>
            <span className={isSolid ? "text-white/40" : "text-slate-300"}>
              ·
            </span>
            <span>Tap to view</span>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Subcomponents ─────────────────────────────────────
function StatusBadge({ urgency }: { urgency: Urgency }) {
  if (urgency === "inSession") {
    return (
      <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-md bg-white/20 border border-white/25 text-[10px] font-bold uppercase tracking-wider text-white">
        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
        In session
      </span>
    );
  }
  if (urgency === "urgent") {
    return (
      <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-md bg-white/20 border border-white/25 text-[10px] font-bold uppercase tracking-wider text-white">
        <Clock size={9} className="animate-pulse" />
        Starting now
      </span>
    );
  }
  if (urgency === "soon") {
    return (
      <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold uppercase tracking-wider">
        <Clock size={9} />
        Coming up
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
      <Calendar size={9} />
      Upcoming
    </span>
  );
}

function Digi({
  value,
  label,
  solid,
}: {
  value: number;
  label: string;
  solid: boolean;
}) {
  return (
    <div className="flex items-baseline">
      <span
        className={cn(
          "text-xl sm:text-2xl font-black leading-none tabular-nums",
          solid ? "text-white" : "text-slate-900",
        )}
      >
        {String(value).padStart(2, "0")}
      </span>
      <span
        className={cn(
          "text-[9px] font-bold uppercase ml-0.5",
          solid ? "text-white/60" : "text-slate-400",
        )}
      >
        {label}
      </span>
    </div>
  );
}

function Colon({ solid }: { solid: boolean }) {
  return (
    <span
      className={cn(
        "text-base sm:text-lg font-black mx-0.5 -mt-0.5",
        solid ? "text-white/40" : "text-slate-300",
      )}
    >
      :
    </span>
  );
}
