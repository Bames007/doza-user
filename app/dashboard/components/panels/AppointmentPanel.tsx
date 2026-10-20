"use client";

import React, { useState, useEffect, useRef } from "react";
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
} from "lucide-react";
import { cn } from "@/app/utils/utils";
import { poppins, bebasNeue } from "@/app/constants";

// ─── sessionStorage helpers ─────────────────────────────
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

// Shared SWR config
const SWR_PANEL_CONFIG = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 60_000,
  keepPreviousData: true,
  revalidateIfStale: false,
} as const;

// ─── Status config — 3 semantic groups ─────────────────
const statusConfig: Record<
  string,
  { label: string; color: string; bg: string; icon: any }
> = {
  upcoming: {
    label: "Coming Up",
    color: "text-emerald-700",
    bg: "bg-emerald-50 border border-emerald-200",
    icon: Clock3,
  },
  confirmed: {
    label: "Confirmed",
    color: "text-emerald-700",
    bg: "bg-emerald-50 border border-emerald-200",
    icon: CheckCircle2,
  },
  completed: {
    label: "Completed",
    color: "text-slate-700",
    bg: "bg-slate-100 border border-slate-200",
    icon: ShieldCheck,
  },
  cancelled: {
    label: "Cancelled",
    color: "text-rose-700",
    bg: "bg-rose-50 border border-rose-200",
    icon: XCircle,
  },
};

// ─── Main Component ─────────────────────────────────────
export default function AppointmentsPanel() {
  const { data: res, isLoading } = useSWR(
    "/api/appointments",
    authFetcher,
    SWR_PANEL_CONFIG,
  );
  const appointments: any[] = res?.data || [];

  // Persisted: expanded history card IDs
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

  // Ephemeral: cancel confirmation target
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // Scroll restoration
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

  const upcoming = appointments.filter(
    (a: any) => a.status === "upcoming" || a.status === "confirmed",
  );
  const past = appointments.filter(
    (a: any) => a.status === "completed" || a.status === "cancelled",
  );

  const sortedUpcoming = [...upcoming].sort(
    (a, b) =>
      new Date(`${a.date}T${a.time}`).getTime() -
      new Date(`${b.date}T${b.time}`).getTime(),
  );

  const sortedPast = [...past].sort(
    (a, b) =>
      new Date(`${b.date}T${b.time}`).getTime() -
      new Date(`${a.date}T${a.time}`).getTime(),
  );

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

  // Cold-start only
  if (isLoading && appointments.length === 0) return <LoadingState />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn("min-h-screen bg-[#F8FAFC] pb-24 pt-4", poppins.className)}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6 space-y-8">
        {/* HEADER */}
        <header>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-8 w-1 rounded-full bg-gradient-to-b from-emerald-500 to-emerald-700" />
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-[0.22em]">
                  Your Care Schedule
                </span>
              </div>
              <h1
                className={cn(
                  "text-3xl sm:text-4xl md:text-5xl text-slate-900 leading-[1.1] tracking-tight",
                  bebasNeue.className,
                )}
              >
                Appointments <span className="text-emerald-600">Hub</span>
              </h1>
              <p className="text-sm text-slate-600 mt-1.5 max-w-md">
                View upcoming visits, instructions from your care team, and your
                past health history.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm text-center min-w-[88px]">
                <p className="text-2xl font-bold text-slate-900">
                  {sortedUpcoming.length}
                </p>
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Booked
                </p>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm text-center min-w-[88px]">
                <p className="text-2xl font-bold text-slate-900">
                  {sortedPast.length}
                </p>
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Past visits
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT: UPCOMING */}
          <div className="lg:col-span-5 space-y-6">
            <div className="flex items-center gap-3 px-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">
                Your Next Visits
              </h3>
            </div>

            <div className="space-y-4">
              {sortedUpcoming.length > 0 ? (
                sortedUpcoming.map((appt: any) => (
                  <UpcomingCard
                    key={appt.id}
                    appt={appt}
                    onCancel={(id) => setCancelTarget(id)}
                  />
                ))
              ) : (
                <EmptyState
                  icon={Calendar}
                  title="No upcoming appointments"
                  description="When you book a visit, it will show up right here."
                />
              )}
            </div>
          </div>

          {/* RIGHT: HISTORY */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center gap-3 px-1">
              <HistoryIcon size={14} className="text-slate-500" />
              <h3 className="text-xs font-bold uppercase tracking-[0.22em] text-slate-600">
                Past Appointments
              </h3>
            </div>

            <div className="space-y-4">
              {sortedPast.length > 0 ? (
                sortedPast.map((appt: any) => (
                  <HistoryCard
                    key={appt.id}
                    appt={appt}
                    expanded={expandedIds.has(appt.id)}
                    onToggle={() => toggleExpanded(appt.id)}
                  />
                ))
              ) : (
                <EmptyState
                  icon={FileText}
                  title="No past visits found"
                  description="Your completed appointments and health summaries will appear here."
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cancel confirmation modal */}
      <AnimatePresence>
        {cancelTarget && (
          <CancelModal
            cancelling={cancelling}
            onClose={() => setCancelTarget(null)}
            onConfirm={performCancel}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── UPCOMING CARD ─────────────────────────────────────
function UpcomingCard({
  appt,
  onCancel,
}: {
  appt: any;
  onCancel: (id: string) => void;
}) {
  const isToday =
    new Date(appt.date).toDateString() === new Date().toDateString();
  const daysUntil = Math.ceil(
    (new Date(`${appt.date}T${appt.time}`).getTime() - Date.now()) /
      (1000 * 60 * 60 * 24),
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden md:hover:shadow-md transition-shadow">
      <div className="h-1 bg-emerald-500" />
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-700 shrink-0">
              <Stethoscope size={22} />
            </div>
            <div className="min-w-0">
              <h4 className="text-base font-bold text-slate-900 truncate">
                {appt.medicName || "Doctor / Provider"}
              </h4>
              <p className="text-xs text-slate-600 font-medium mt-0.5 truncate">
                {appt.reason || "General Checkup"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider",
                statusConfig[appt.status]?.bg,
                statusConfig[appt.status]?.color,
              )}
            >
              {statusConfig[appt.status]?.label || appt.status}
            </span>
            <button
              onClick={() => onCancel(appt.id)}
              aria-label="Cancel appointment"
              className={cn(
                "min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl bg-slate-50 text-slate-500 hover:bg-rose-50 hover:text-rose-700 transition-colors",
                FOCUS,
              )}
              title="Cancel appointment"
            >
              <XCircle size={16} />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-2.5">
            <Calendar size={16} className="text-emerald-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-600 uppercase">Day</p>
              <p className="text-xs font-bold text-slate-900 truncate">
                {appt.date}{" "}
                {isToday && (
                  <span className="text-emerald-700 ml-1">(Today)</span>
                )}
              </p>
            </div>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-2.5">
            <Clock size={16} className="text-emerald-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-600 uppercase">Time</p>
              <p className="text-xs font-bold text-slate-900 truncate">
                {appt.time}
              </p>
            </div>
          </div>
        </div>
        {appt.consultType && (
          <div className="flex items-center gap-2 mb-3">
            {appt.consultType === "online" ? (
              <Video size={14} className="text-emerald-700" />
            ) : (
              <Home size={14} className="text-emerald-700" />
            )}
            <span className="text-xs font-bold text-slate-700 uppercase">
              {appt.consultType === "online"
                ? "Video Consultation"
                : "In-Person Visit"}
            </span>
          </div>
        )}
        {daysUntil > 0 && (
          <div className="flex items-center gap-2 text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 w-fit">
            <Clock3 size={14} />
            <span className="text-xs font-bold uppercase tracking-wide">
              {daysUntil} day{daysUntil > 1 ? "s" : ""} to go
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── HISTORY CARD ──────────────────────────────────────
function HistoryCard({
  appt,
  expanded,
  onToggle,
}: {
  appt: any;
  expanded: boolean;
  onToggle: () => void;
}) {
  const status = statusConfig[appt.status] || statusConfig.completed;
  const StatusIcon = status.icon;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm md:hover:shadow-md transition-shadow">
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
          <div
            className={cn(
              "h-11 w-11 rounded-xl flex items-center justify-center shrink-0",
              status.bg,
            )}
          >
            <StatusIcon size={18} className={status.color} />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors truncate">
              {appt.medicName || "Doctor / Provider"}
            </h4>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs font-bold text-slate-600 uppercase">
                {appt.date}
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-xs font-bold text-slate-600 uppercase">
                {appt.time}
              </span>
              <span className="text-slate-400">•</span>
              <span className={cn("text-xs font-bold uppercase", status.color)}>
                {status.label}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="hidden md:block text-xs font-bold text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg uppercase max-w-[160px] truncate">
            {appt.reason}
          </span>
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="min-h-9 min-w-9 inline-flex items-center justify-center rounded-lg bg-slate-50"
          >
            <ChevronDown size={18} className="text-slate-500" />
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
            <div className="border-t border-slate-100 bg-[#FAFBFC] px-4 sm:px-6 py-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <InfoBox icon={Calendar} label="Date" value={appt.date} />
                <InfoBox icon={Clock} label="Time" value={appt.time} />
                <InfoBox
                  icon={FileText}
                  label="Reason for visit"
                  value={appt.reason || "Checkup"}
                />
              </div>

              {appt.notes && (
                <div className="bg-white rounded-xl p-4 border border-slate-200">
                  <div className="flex items-center gap-2 mb-2.5">
                    <FileText size={14} className="text-emerald-700" />
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Doctor's Advice & Instructions
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed italic">
                    "{appt.notes}"
                  </p>
                </div>
              )}

              {appt.results && (
                <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
                  <div className="flex items-center gap-2 mb-2.5">
                    <Beaker size={14} className="text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                      Test Results
                    </span>
                  </div>
                  <pre className="text-emerald-400 font-mono text-xs leading-relaxed whitespace-pre-wrap">
                    {appt.results}
                  </pre>
                  <p className="text-xs text-slate-400 mt-2 italic">
                    Ask your doctor to explain these readings.
                  </p>
                </div>
              )}

              {appt.drugs?.length > 0 && (
                <div className="bg-white rounded-xl p-4 border border-slate-200">
                  <div className="flex items-center gap-2 mb-2.5">
                    <Pill size={14} className="text-emerald-700" />
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Prescribed Medications
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {appt.drugs.map((drug: string, i: number) => (
                      <span
                        key={i}
                        className="px-3 py-1.5 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-bold border border-emerald-200"
                      >
                        {drug}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── InfoBox ───────────────────────────────────────────
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
    <div className="bg-white rounded-xl p-3.5 border border-slate-200">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon size={14} className="text-slate-500" />
        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="text-sm font-bold text-slate-800 truncate">{value}</p>
    </div>
  );
}

// ─── Cancel modal ──────────────────────────────────────
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

// ─── Empty State ───────────────────────────────────────
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
    <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center">
      <div className="h-14 w-14 bg-slate-50 rounded-xl flex items-center justify-center mx-auto mb-3 text-slate-400">
        <Icon size={24} />
      </div>
      <p className="text-sm font-bold text-slate-700 mb-1">{title}</p>
      <p className="text-xs text-slate-600 max-w-xs mx-auto leading-relaxed">
        {description}
      </p>
    </div>
  );
}

// ─── Loading skeleton ──────────────────────────────────
function LoadingState() {
  const P = ({ c }: { c: string }) => (
    <div className={cn("animate-pulse bg-slate-200 rounded-xl", c)} />
  );

  return (
    <div
      className={cn("min-h-screen bg-[#F8FAFC] pb-24 pt-4", poppins.className)}
      aria-busy="true"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="space-y-3 w-full max-w-md">
            <div className="flex items-center gap-3">
              <P c="h-8 w-1 rounded-full" />
              <P c="h-3 w-32" />
            </div>
            <P c="h-12 w-3/4" />
            <P c="h-4 w-full" />
          </div>
          <div className="flex items-center gap-3">
            <P c="h-20 w-[88px]" />
            <P c="h-20 w-[88px]" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 space-y-6">
            <P c="h-3 w-32" />
            {[1, 2].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-sm"
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="flex items-center gap-3 w-full">
                    <P c="w-12 h-12 rounded-xl shrink-0" />
                    <div className="space-y-2 w-1/2">
                      <P c="h-4 w-full" />
                      <P c="h-3 w-2/3" />
                    </div>
                  </div>
                  <P c="h-6 w-16" />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <P c="h-14" />
                  <P c="h-14" />
                </div>
                <P c="h-6 w-28" />
              </div>
            ))}
          </div>

          <div className="lg:col-span-7 space-y-6">
            <P c="h-3 w-36" />
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between shadow-sm"
              >
                <div className="flex items-center gap-3 w-2/3">
                  <P c="h-11 w-11 rounded-xl shrink-0" />
                  <div className="space-y-2 w-full">
                    <P c="h-4 w-1/3" />
                    <P c="h-3 w-1/2" />
                  </div>
                </div>
                <P c="h-6 w-20 hidden md:block" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
