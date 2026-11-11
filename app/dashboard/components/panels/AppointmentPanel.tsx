// app/dashboard/components/panels/AppointmentsPanel.tsx
"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import useSWR, { mutate } from "swr";
import { authFetcher } from "@/app/utils/client-auth";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Clock,
  FileText,
  Beaker,
  Pill,
  ChevronDown,
  XCircle,
  ShieldCheck,
  Stethoscope,
  History as HistoryIcon,
  CheckCircle2,
  Clock3,
  Video,
  Home,
  Loader2,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Ban,
  Video as VideoIcon,
  MessageCircle,
} from "lucide-react";
import { useDashboard } from "../../DashboardContext";
import { cn } from "@/app/utils/utils";
import { poppins, bebasNeue } from "@/app/constants";
import ChatPanel from "../ui/ChatPanel";

function ssGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
function ssSet(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(key, value);
  } catch {}
}

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2";

const SWR_PANEL_CONFIG = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 30_000,
  keepPreviousData: true,
  revalidateIfStale: true,
} as const;

type AptStatus =
  | "upcoming"
  | "inSession"
  | "completed"
  | "cancelled"
  | "missed";

interface Apt {
  id: string;
  medicName?: string;
  medicProfileImage?: string;
  medicSpecialty?: string;
  date: string;
  time: string;
  scheduledAt?: string;
  consultType?: string;
  duration?: string | null;
  address?: string | null;
  reason?: string;
  notes?: string | null;
  results?: string | null;
  drugs?: string[];
  status?: string;
  amount?: number | null;
  paymentReference?: string | null;
  paymentStatus?: string | null;
  rebookedTo?: string;
  rebookedFrom?: string;
  hasMessages?: boolean;
}

function getScheduledMs(apt: Apt): number {
  if (apt.scheduledAt) return new Date(apt.scheduledAt).getTime();
  return new Date(`${apt.date}T${apt.time}`).getTime();
}

function parseDurationToMs(label: string | null | undefined): number {
  if (!label) return 60 * 60 * 1000;
  const lower = label.toLowerCase();
  const match = lower.match(/(\d+(?:\.\d+)?)/);
  if (!match) return 60 * 60 * 1000;
  const n = parseFloat(match[1]);
  if (lower.includes("min")) return n * 60 * 1000;
  if (lower.includes("h")) return n * 60 * 60 * 1000;
  return 60 * 60 * 1000;
}

/**
 * Duration-aware status. Sync with ChatPanel phase logic:
 *   now < scheduledMs       → upcoming
 *   now < endedMs           → inSession
 *   now >= endedMs          → missed (or completed if marked)
 */
function deriveStatus(apt: Apt, now: number): AptStatus {
  const s = (apt.status || "").toLowerCase();
  if (s === "completed") return "completed";
  if (s === "cancelled") return "cancelled";

  const scheduledMs = getScheduledMs(apt);
  const durationMs = parseDurationToMs(apt.duration);
  const endedMs = scheduledMs + durationMs;

  if (now < scheduledMs) return "upcoming";
  if (now < endedMs) return "inSession";
  return "missed";
}

function isPastStatus(status: AptStatus) {
  return (
    status === "completed" || status === "cancelled" || status === "missed"
  );
}

function formatRelative(ms: number): string {
  if (ms < 0) {
    const abs = Math.abs(ms);
    const mins = Math.round(abs / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    return `${days}d ago`;
  }
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `in ${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `in ${hours}h`;
  const days = Math.round(hours / 24);
  return `in ${days}d`;
}

/**
 * Rebook eligibility: missed + paid + NOT rebooked + NOT used (no messages).
 */
function canRebookFree(apt: Apt): boolean {
  if (apt.rebookedTo) return false;
  if (apt.status === "completed" || apt.status === "cancelled") return false;
  if (apt.hasMessages) return false; // ← KEY: session was actually used
  const hasPayment =
    !!apt.paymentReference ||
    (typeof apt.amount === "number" && apt.amount > 0);
  return hasPayment;
}

const statusConfig: Record<
  AptStatus,
  { label: string; badge: string; dot: string; icon: any }
> = {
  upcoming: {
    label: "Coming up",
    badge: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    dot: "bg-emerald-500",
    icon: CalendarClock,
  },
  inSession: {
    label: "In session",
    badge: "bg-emerald-600 text-white border border-emerald-600",
    dot: "bg-white animate-pulse",
    icon: VideoIcon,
  },
  completed: {
    label: "Completed",
    badge: "bg-slate-100 text-slate-700 border border-slate-200",
    dot: "bg-slate-400",
    icon: ShieldCheck,
  },
  cancelled: {
    label: "Cancelled",
    badge: "bg-rose-50 text-rose-700 border border-rose-200",
    dot: "bg-rose-400",
    icon: Ban,
  },
  missed: {
    label: "Missed",
    badge: "bg-amber-50 text-amber-800 border border-amber-200",
    dot: "bg-amber-500",
    icon: AlertCircle,
  },
};

export default function AppointmentsPanel() {
  const { setActivePanel } = useDashboard();
  const { data: res, isLoading } = useSWR(
    "/api/appointments",
    authFetcher,
    SWR_PANEL_CONFIG,
  );

  const appointments: Apt[] = res?.success ? res.data : [];

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(id);
  }, []);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const v = ssGet("appts:expanded");
    if (v) {
      try {
        const parsed = JSON.parse(v);
        if (Array.isArray(parsed)) return new Set(parsed);
      } catch {}
    }
    return new Set();
  });
  useEffect(() => {
    if (expandedIds.size > 0) {
      ssSet("appts:expanded", JSON.stringify([...expandedIds]));
    } else {
      try {
        sessionStorage.removeItem("appts:expanded");
      } catch {}
    }
  }, [expandedIds]);

  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [openChatId, setOpenChatId] = useState<string | null>(null);
  const [rebookTarget, setRebookTarget] = useState<Apt | null>(null);

  const scrollRestoredRef = useRef(false);
  useEffect(() => {
    const el =
      (document.getElementById("dashboard-scroll") as HTMLElement | null) ||
      (document.querySelector("main") as HTMLElement | null);
    if (!el) return;
    if (!scrollRestoredRef.current) {
      const saved = ssGet("appts:scroll");
      el.scrollTo({ top: saved ? Number(saved) : 0, behavior: "instant" });
      scrollRestoredRef.current = true;
    }
    const onScroll = () => ssSet("appts:scroll", String(el.scrollTop));
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const { upcoming, past, inSession } = useMemo(() => {
    const u: Apt[] = [];
    const p: Apt[] = [];
    const s: Apt[] = [];
    for (const a of appointments) {
      const st = deriveStatus(a, now);
      if (st === "inSession") s.push(a);
      else if (isPastStatus(st)) p.push(a);
      else u.push(a);
    }
    u.sort((a, b) => getScheduledMs(a) - getScheduledMs(b));
    p.sort((a, b) => getScheduledMs(b) - getScheduledMs(a));
    return { upcoming: u, past: p, inSession: s };
  }, [appointments, now]);

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const performCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await fetch(`/api/appointments/${cancelTarget}`, { method: "DELETE" });
      mutate("/api/appointments");
      setCancelTarget(null);
    } catch (err) {
      console.error("Cancel failed:", err);
    } finally {
      setCancelling(false);
    }
  };

  // When chat closes, refresh appointments so hasMessages updates
  const handleChatClose = () => {
    setOpenChatId(null);
    mutate("/api/appointments");
  };

  if (isLoading && appointments.length === 0) return <LoadingState />;

  const totalPast = past.length;
  const totalUpcoming = upcoming.length + inSession.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "min-h-screen bg-[#F8FAFC] pb-28 pt-2 text-slate-900",
        poppins.className,
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 space-y-4 lg:space-y-6">
        <header className="pt-1 lg:pt-2">
          <button
            onClick={() => setActivePanel("dashboard")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-emerald-700 transition-colors min-h-9 -ml-1 px-1 rounded-lg"
          >
            <ArrowLeft size={14} />
            Dashboard
          </button>
          <div className="mt-1 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div className="min-w-0">
              <h1
                className={cn(
                  "text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight leading-tight",
                  bebasNeue.className,
                )}
              >
                Appointments
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                {new Date().toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <StatPill
                icon={CalendarClock}
                label="Upcoming"
                value={totalUpcoming}
                tone="emerald"
              />
              <StatPill
                icon={HistoryIcon}
                label="Past"
                value={totalPast}
                tone="slate"
              />
            </div>
          </div>
        </header>

        {inSession.length > 0 && (
          <section className="space-y-2">
            {inSession.map((apt) => (
              <InSessionCard
                key={apt.id}
                apt={apt}
                onChat={() => setOpenChatId(apt.id)}
              />
            ))}
          </section>
        )}

        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <h2 className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-emerald-700">
              Upcoming
            </h2>
            <span className="text-[10px] font-medium text-slate-400">
              {upcoming.length}{" "}
              {upcoming.length === 1 ? "appointment" : "appointments"}
            </span>
          </div>

          {upcoming.length === 0 && inSession.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No upcoming appointments"
              description="Book a medic from the Doza Medics panel and it will appear here."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4">
              {upcoming.map((apt) => (
                <UpcomingCard
                  key={apt.id}
                  apt={apt}
                  now={now}
                  onCancel={() => setCancelTarget(apt.id)}
                  onChat={() => setOpenChatId(apt.id)}
                />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <HistoryIcon size={14} className="text-slate-500" />
            <h2 className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-slate-500">
              Past &amp; History
            </h2>
            <span className="text-[10px] font-medium text-slate-400">
              {past.length} {past.length === 1 ? "appointment" : "appointments"}
            </span>
          </div>

          {past.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No past visits yet"
              description="Completed, cancelled, and missed appointments will show here with notes and prescriptions."
            />
          ) : (
            <div className="space-y-3">
              {past.map((apt) => (
                <HistoryCard
                  key={apt.id}
                  apt={apt}
                  now={now}
                  expanded={expandedIds.has(apt.id)}
                  onToggle={() => toggleExpanded(apt.id)}
                  onViewChat={() => setOpenChatId(apt.id)}
                  onRebook={() => setRebookTarget(apt)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <AnimatePresence>
        {cancelTarget && (
          <CancelModal
            cancelling={cancelling}
            onClose={() => setCancelTarget(null)}
            onConfirm={performCancel}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {openChatId && (
          <ChatPanel appointmentId={openChatId} onClose={handleChatClose} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {rebookTarget && (
          <RebookModal
            appointment={rebookTarget}
            onClose={() => setRebookTarget(null)}
            onSuccess={() => {
              setRebookTarget(null);
              mutate("/api/appointments");
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function StatPill({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: any;
  label: string;
  value: number;
  tone: "emerald" | "slate";
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-xl border shadow-2xs",
        tone === "emerald"
          ? "bg-emerald-50 border-emerald-200 text-emerald-800"
          : "bg-white border-slate-200 text-slate-700",
      )}
    >
      <Icon
        size={14}
        className={tone === "emerald" ? "text-emerald-600" : "text-slate-500"}
      />
      <div className="leading-tight">
        <p className="text-[9px] font-bold uppercase tracking-wider opacity-70">
          {label}
        </p>
        <p className="text-sm font-bold tabular-nums">{value}</p>
      </div>
    </div>
  );
}

function InSessionCard({ apt, onChat }: { apt: Apt; onChat: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-emerald-600 text-white p-4 sm:p-5 shadow-lg shadow-emerald-600/25 border border-emerald-500 flex flex-col sm:flex-row sm:items-center gap-4"
    >
      <div className="w-12 h-12 rounded-xl bg-white/20 border border-white/25 flex items-center justify-center shrink-0 overflow-hidden">
        {apt.medicProfileImage ? (
          <img
            src={apt.medicProfileImage}
            alt={apt.medicName || ""}
            className="w-full h-full object-cover"
          />
        ) : (
          <VideoIcon size={22} className="animate-pulse" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-100">
          Session in progress
        </p>
        <p className="text-base font-bold truncate mt-0.5">
          {apt.medicName || "Your medic"}
        </p>
        <p className="text-xs text-emerald-50 mt-0.5">
          {apt.consultType === "online" ? "Online chat" : "In-person"} ·{" "}
          {apt.time}
          {apt.duration ? ` · ${apt.duration}` : ""}
        </p>
      </div>
      <button
        onClick={onChat}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white text-emerald-700 rounded-xl text-xs font-bold hover:bg-emerald-50 transition-colors shadow-sm min-h-11 shrink-0",
          FOCUS,
        )}
      >
        <MessageCircle size={14} />
        Enter chat
        <ArrowRight size={14} />
      </button>
    </motion.div>
  );
}

function UpcomingCard({
  apt,
  now,
  onCancel,
  onChat,
}: {
  apt: Apt;
  now: number;
  onCancel: () => void;
  onChat: () => void;
}) {
  const scheduledMs = getScheduledMs(apt);
  const diffMs = scheduledMs - now;
  const cfg = statusConfig.upcoming;
  const StatusIcon = cfg.icon;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="h-1 bg-gradient-to-r from-emerald-500 to-emerald-600" />
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 overflow-hidden">
              {apt.medicProfileImage ? (
                <img
                  src={apt.medicProfileImage}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <Stethoscope size={20} className="text-emerald-700" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">
                {apt.medicName || "Doctor / Provider"}
              </p>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                {apt.reason || "Consultation"}
              </p>
            </div>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider shrink-0",
              cfg.badge,
            )}
          >
            <StatusIcon size={10} />
            {cfg.label}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-slate-50 rounded-xl p-2.5 flex items-center gap-2">
            <Calendar size={14} className="text-emerald-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                Date
              </p>
              <p className="text-xs font-bold text-slate-900 truncate">
                {apt.date}
              </p>
            </div>
          </div>
          <div className="bg-slate-50 rounded-xl p-2.5 flex items-center gap-2">
            <Clock size={14} className="text-emerald-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                Time
              </p>
              <p className="text-xs font-bold text-slate-900 truncate">
                {apt.time}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            {apt.consultType === "online" ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md">
                <Video size={10} /> Online
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md">
                <Home size={10} /> In-person
              </span>
            )}
            <span className="text-[11px] font-semibold text-slate-500 tabular-nums">
              {formatRelative(diffMs)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={onChat}
              className={cn(
                "inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors min-h-8",
                FOCUS,
              )}
            >
              <MessageCircle size={12} /> Chat
            </button>
            <button
              onClick={onCancel}
              className={cn(
                "inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors min-h-8",
                FOCUS,
              )}
            >
              <XCircle size={12} /> Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function HistoryCard({
  apt,
  now,
  expanded,
  onToggle,
  onViewChat,
  onRebook,
}: {
  apt: Apt;
  now: number;
  expanded: boolean;
  onToggle: () => void;
  onViewChat: () => void;
  onRebook: () => void;
}) {
  const status = deriveStatus(apt, now);
  const cfg = statusConfig[status];
  const StatusIcon = cfg.icon;
  const scheduledMs = getScheduledMs(apt);
  const diffMs = now - scheduledMs;
  const showRebookOffer = status === "missed" && canRebookFree(apt);
  const usedSession = status === "missed" && !!apt.hasMessages;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className={cn(
          "w-full p-4 sm:p-5 flex items-center justify-between text-left group min-h-16",
          FOCUS,
        )}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 overflow-hidden bg-slate-100">
            {apt.medicProfileImage ? (
              <img
                src={apt.medicProfileImage}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <Stethoscope size={18} className="text-slate-500" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors truncate">
              {apt.medicName || "Doctor / Provider"}
            </p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-[11px] font-semibold text-slate-600 tabular-nums">
                {apt.date}
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-[11px] font-semibold text-slate-600 tabular-nums">
                {apt.time}
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-[11px] text-slate-400">
                {formatRelative(diffMs)}
              </span>
              {showRebookOffer && (
                <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded">
                  Free rebook
                </span>
              )}
              {usedSession && (
                <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded">
                  Session used
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={cn(
              "hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider",
              cfg.badge,
            )}
          >
            <StatusIcon size={10} />
            {cfg.label}
          </span>
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="min-h-8 min-w-8 inline-flex items-center justify-center rounded-lg bg-slate-50"
          >
            <ChevronDown size={16} className="text-slate-500" />
          </motion.div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="border-t border-slate-100 bg-[#FAFBFC] px-4 sm:px-5 py-4 space-y-3">
              <div className="sm:hidden">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider",
                    cfg.badge,
                  )}
                >
                  <StatusIcon size={10} />
                  {cfg.label}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <InfoBox icon={Calendar} label="Date" value={apt.date} />
                <InfoBox icon={Clock} label="Time" value={apt.time} />
                {apt.reason && (
                  <InfoBox icon={FileText} label="Reason" value={apt.reason} />
                )}
                {apt.duration && (
                  <InfoBox
                    icon={Clock3}
                    label="Duration"
                    value={apt.duration}
                  />
                )}
              </div>

              {/* ── Rebook banner (missed + paid + not used) ── */}
              {showRebookOffer && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle
                      size={14}
                      className="text-amber-600 shrink-0 mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-amber-900">
                        You missed this session
                      </p>
                      <p className="text-[11px] text-amber-800/80 mt-0.5">
                        Since you already paid and didn't start the session, you
                        can rebook free with the same medic.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onRebook}
                    className={cn(
                      "w-full min-h-10 inline-flex items-center justify-center gap-1.5 text-xs font-bold text-amber-900 bg-white border border-amber-300 rounded-lg hover:bg-amber-100 transition-colors",
                      FOCUS,
                    )}
                  >
                    <CalendarClock size={12} /> Rebook free
                  </button>
                </div>
              )}

              {/* ── Session was used — no rebook ── */}
              {usedSession && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle2
                      size={14}
                      className="text-emerald-600 shrink-0 mt-0.5"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        Session was used
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        You chatted with your medic during this session. Open
                        chat history below to review it.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {apt.rebookedTo && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                  <p className="text-[11px] text-slate-600">
                    <CheckCircle2
                      size={11}
                      className="inline text-emerald-600 mr-1 -mt-0.5"
                    />
                    You rebooked this session for free
                  </p>
                </div>
              )}

              {apt.address && (
                <div className="bg-white rounded-xl p-3 border border-slate-200">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Address
                  </p>
                  <p className="text-xs font-semibold text-slate-800">
                    {apt.address}
                  </p>
                </div>
              )}

              {apt.notes && (
                <div className="bg-white rounded-xl p-3 border border-slate-200">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <FileText size={12} className="text-emerald-700" />
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                      Doctor's advice
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed italic">
                    "{apt.notes}"
                  </p>
                </div>
              )}

              {apt.results && (
                <div className="bg-slate-900 rounded-xl p-3 border border-slate-800">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Beaker size={12} className="text-emerald-400" />
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                      Test results
                    </span>
                  </div>
                  <pre className="text-emerald-400 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
                    {apt.results}
                  </pre>
                </div>
              )}

              {apt.drugs && apt.drugs.length > 0 && (
                <div className="bg-white rounded-xl p-3 border border-slate-200">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Pill size={12} className="text-emerald-700" />
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                      Prescribed medications
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {apt.drugs.map((drug, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-emerald-50 text-emerald-800 rounded-md text-[11px] font-bold border border-emerald-200"
                      >
                        {drug}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={onViewChat}
                className={cn(
                  "w-full min-h-10 inline-flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-700 bg-white border border-emerald-200 rounded-xl hover:bg-emerald-50 transition-colors",
                  FOCUS,
                )}
              >
                <MessageCircle size={12} /> View chat history
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InfoBox({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-white rounded-xl p-2.5 border border-slate-200">
      <div className="flex items-center gap-1 mb-1">
        <Icon size={11} className="text-slate-500" />
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="text-xs font-bold text-slate-800 truncate">{value}</p>
    </div>
  );
}

function CancelModal({
  cancelling,
  onClose,
  onConfirm,
}: {
  cancelling: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 30, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 30, opacity: 0, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        className="bg-white rounded-t-3xl sm:rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-6"
      >
        <div className="sm:hidden flex justify-center mb-3" aria-hidden>
          <div className="w-10 h-1 rounded-full bg-slate-300" />
        </div>
        <div className="w-14 h-14 rounded-2xl bg-rose-100 flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={24} className="text-rose-700" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 text-center mb-1.5">
          Cancel this appointment?
        </h3>
        <p className="text-sm text-slate-600 text-center mb-6">
          This can't be undone. You'll need to book a new visit if you change
          your mind.
        </p>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={cancelling}
            className={cn(
              "flex-1 min-h-11 rounded-xl bg-slate-100 text-slate-800 font-semibold text-sm hover:bg-slate-200 transition-colors disabled:opacity-50",
              FOCUS,
            )}
          >
            Keep it
          </button>
          <button
            onClick={onConfirm}
            disabled={cancelling}
            className={cn(
              "flex-1 min-h-11 rounded-xl bg-rose-600 text-white font-semibold text-sm hover:bg-rose-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2",
              FOCUS,
            )}
          >
            {cancelling && <Loader2 className="w-4 h-4 animate-spin" />}
            {cancelling ? "Cancelling…" : "Yes, cancel"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function RebookModal({
  appointment,
  onClose,
  onSuccess,
}: {
  appointment: Apt;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split("T")[0];

  const submit = async () => {
    if (!date || !time) {
      setError("Pick a date and time");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/appointments/${appointment.id}/rebook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ date, time }),
      });
      const json = await res.json();
      if (json.success) {
        onSuccess();
      } else {
        setError(json.error || "Could not rebook");
      }
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 30, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 30, opacity: 0, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        className="bg-white rounded-t-3xl sm:rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-6"
      >
        <div className="sm:hidden flex justify-center mb-3" aria-hidden>
          <div className="w-10 h-1 rounded-full bg-slate-300" />
        </div>
        <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <CalendarClock size={24} className="text-emerald-700" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 text-center mb-1">
          Rebook free
        </h3>
        <p className="text-sm text-slate-600 text-center mb-5">
          Same medic, same duration. Pick a new date and time at no extra cost.
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-1">
              New date
            </label>
            <input
              type="date"
              value={date}
              min={minDateStr}
              onChange={(e) => setDate(e.target.value)}
              className="w-full min-h-11 px-3 bg-emerald-50/40 border border-emerald-100 rounded-xl text-sm text-emerald-900 font-semibold focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-1">
              New time
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full min-h-11 px-3 bg-emerald-50/40 border border-emerald-100 rounded-xl text-sm text-emerald-900 font-semibold focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
            />
          </div>
        </div>

        {error && (
          <p className="mt-3 text-xs text-rose-700 font-semibold text-center">
            {error}
          </p>
        )}

        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose}
            disabled={submitting}
            className={cn(
              "flex-1 min-h-11 rounded-xl bg-slate-100 text-slate-800 font-semibold text-sm hover:bg-slate-200 transition-colors disabled:opacity-50",
              FOCUS,
            )}
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting || !date || !time}
            className={cn(
              "flex-1 min-h-11 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-1.5",
              FOCUS,
            )}
          >
            {submitting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <CheckCircle2 size={14} />
            )}
            Confirm rebook
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: any;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-6 sm:p-8 text-center">
      <div className="h-12 w-12 bg-slate-50 rounded-xl flex items-center justify-center mx-auto mb-3 text-slate-400">
        <Icon size={22} />
      </div>
      <p className="text-sm font-bold text-slate-700 mb-1">{title}</p>
      <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
        {description}
      </p>
    </div>
  );
}

function LoadingState() {
  const P = ({ c }: { c: string }) => (
    <div className={cn("animate-pulse bg-slate-200 rounded-xl", c)} />
  );

  return (
    <div
      className={cn("min-h-screen bg-[#F8FAFC] pb-28 pt-2", poppins.className)}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 space-y-4 lg:space-y-6">
        <div className="space-y-2">
          <P c="h-3 w-24" />
          <P c="h-9 w-56" />
          <P c="h-3 w-40" />
        </div>
        <div className="space-y-3">
          <P c="h-3 w-32" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3"
              >
                <div className="flex items-center gap-3">
                  <P c="w-11 h-11 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <P c="h-3 w-2/3" />
                    <P c="h-2.5 w-1/2" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <P c="h-12" />
                  <P c="h-12" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
