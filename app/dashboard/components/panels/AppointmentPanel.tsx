"use client";

import React, { useState } from "react";
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
  AlertCircle,
  CheckCircle2,
  Clock3,
  Video,
  Home,
  Info,
} from "lucide-react";
import { cn } from "@/app/utils/utils";
import { poppins, bebasNeue } from "@/app/constants";

// --------------------------------------------------------------------------------
// Status Badge Config (Plain, clear language)
// --------------------------------------------------------------------------------
const statusConfig: Record<
  string,
  { label: string; color: string; bg: string; icon: any }
> = {
  upcoming: {
    label: "Coming Up",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    icon: Clock3,
  },
  confirmed: {
    label: "Confirmed",
    color: "text-blue-600",
    bg: "bg-blue-50",
    icon: CheckCircle2,
  },
  completed: {
    label: "Completed",
    color: "text-slate-600",
    bg: "bg-slate-100",
    icon: ShieldCheck,
  },
  cancelled: {
    label: "Cancelled",
    color: "text-rose-600",
    bg: "bg-rose-50",
    icon: XCircle,
  },
};

// --------------------------------------------------------------------------------
// Main Component
// --------------------------------------------------------------------------------
export default function AppointmentsPanel() {
  const { data: res, isLoading } = useSWR("/api/appointments", authFetcher);
  const appointments = res?.data || [];

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

  const cancelAppointment = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;
    await fetch(`/api/appointments/${id}`, { method: "DELETE" });
    mutate("/api/appointments");
  };

  if (isLoading) return <LoadingState />;

  return (
    <div
      className={cn("min-h-screen bg-[#F8FAFC] pb-32 pt-6", poppins.className)}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6 space-y-8">
        {/* ─── NEW DOZA-STYLE HEADER ─────────────────────────────── */}
        <header className="w-full px-4 pt-4 md:pt-6 pb-2 max-w-7xl mx-auto z-30">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-8 w-1 rounded-full bg-gradient-to-b from-emerald-500 to-teal-600" />
                <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-[0.25em]">
                  Your Care Schedule
                </span>
              </div>
              <h1
                className={cn(
                  "text-4xl md:text-5xl text-slate-900 leading-[1.1] tracking-tight",
                  bebasNeue.className,
                )}
              >
                Appointments <span className="text-emerald-600">Hub</span>
              </h1>
              <p className="text-sm text-slate-600 mt-2 max-w-md">
                View your upcoming visits, look over instructions from your care
                team, and check your past health history.
              </p>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm text-center min-w-[90px]">
                <p className="text-2xl font-black text-slate-900">
                  {sortedUpcoming.length}
                </p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  Booked
                </p>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm text-center min-w-[90px]">
                <p className="text-2xl font-black text-slate-900">
                  {sortedPast.length}
                </p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  Past Visits
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT: UPCOMING APPOINTMENTS */}
          <div className="lg:col-span-5 space-y-6">
            <div className="flex items-center gap-3 px-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600">
                Your Next Visits
              </h3>
            </div>

            <div className="space-y-4">
              {sortedUpcoming.length > 0 ? (
                sortedUpcoming.map((appt: any) => (
                  <UpcomingCard
                    key={appt.id}
                    appt={appt}
                    onCancel={cancelAppointment}
                  />
                ))
              ) : (
                <EmptyState
                  icon={Calendar}
                  title="No Upcoming Appointments"
                  description="When you book a visit, it will show up right here."
                />
              )}
            </div>
          </div>

          {/* RIGHT: HISTORY */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center gap-3 px-2">
              <HistoryIcon size={14} className="text-slate-400" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                Past Appointments
              </h3>
            </div>

            <div className="space-y-4">
              {sortedPast.length > 0 ? (
                sortedPast.map((appt: any) => (
                  <HistoryCard key={appt.id} appt={appt} />
                ))
              ) : (
                <EmptyState
                  icon={FileText}
                  title="No Past Visits Found"
                  description="Your completed appointments and health summaries will appear here."
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------------
// UPCOMING CARD
// --------------------------------------------------------------------------------
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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-[28px] border border-slate-100 shadow-sm hover:shadow-lg transition-all overflow-hidden group"
    >
      <div className="h-1 bg-emerald-500" />
      <div className="p-6">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
              <Stethoscope size={24} />
            </div>
            <div>
              <h4 className="text-lg font-bold text-slate-900">
                {appt.medicName || "Doctor / Provider"}
              </h4>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {appt.reason || "General Checkup"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider",
                statusConfig[appt.status]?.bg,
                statusConfig[appt.status]?.color,
              )}
            >
              {statusConfig[appt.status]?.label || appt.status}
            </span>
            <button
              onClick={() => onCancel(appt.id)}
              className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all"
              title="Cancel appointment"
            >
              <XCircle size={16} />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-slate-50 rounded-2xl p-3 flex items-center gap-3">
            <Calendar size={16} className="text-emerald-500" />
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase">
                Day
              </p>
              <p className="text-xs font-bold text-slate-800">
                {appt.date}{" "}
                {isToday && (
                  <span className="text-emerald-500 ml-1 text-[10px]">
                    (Today)
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="bg-slate-50 rounded-2xl p-3 flex items-center gap-3">
            <Clock size={16} className="text-emerald-500" />
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase">
                Time
              </p>
              <p className="text-xs font-bold text-slate-800">{appt.time}</p>
            </div>
          </div>
        </div>
        {appt.consultType && (
          <div className="flex items-center gap-2 mb-4 px-1">
            {appt.consultType === "online" ? (
              <Video size={12} className="text-blue-500" />
            ) : (
              <Home size={12} className="text-amber-500" />
            )}
            <span className="text-[10px] font-bold text-slate-500 uppercase">
              {appt.consultType === "online"
                ? "Video Consultation"
                : "In-Person Visit"}
            </span>
          </div>
        )}
        {daysUntil > 0 && (
          <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 rounded-xl px-3 py-2 w-fit">
            <Clock3 size={12} />
            <span className="text-[10px] font-black uppercase">
              {daysUntil} day{daysUntil > 1 ? "s" : ""} to go
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// --------------------------------------------------------------------------------
// HISTORY CARD
// --------------------------------------------------------------------------------
function HistoryCard({ appt }: { appt: any }) {
  const [expanded, setExpanded] = useState(false);
  const status = statusConfig[appt.status] || statusConfig.completed;
  const StatusIcon = status.icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white border border-slate-100 rounded-[28px] overflow-hidden transition-all hover:shadow-md shadow-sm"
    >
      <div
        onClick={() => setExpanded(!expanded)}
        className="p-5 md:p-6 flex items-center justify-between cursor-pointer group"
      >
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "h-12 w-12 rounded-2xl flex items-center justify-center",
              status.bg,
            )}
          >
            <StatusIcon size={20} className={status.color} />
          </div>
          <div>
            <h4 className="text-base font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
              {appt.medicName || "Doctor / Provider"}
            </h4>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                {appt.date}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                {appt.time}
              </span>
              <span className="text-slate-300">•</span>
              <span
                className={cn("text-[10px] font-black uppercase", status.color)}
              >
                {status.label}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden md:block text-[9px] font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-xl uppercase">
            {appt.reason}
          </span>
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown size={20} className="text-slate-300" />
          </motion.div>
        </div>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="border-t border-slate-50 bg-[#FAFBFC] px-5 md:px-8 py-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <InfoBox icon={Calendar} label="Date" value={appt.date} />
                <InfoBox icon={Clock} label="Time" value={appt.time} />
                <InfoBox
                  icon={FileText}
                  label="Reason for Visit"
                  value={appt.reason || "Checkup"}
                />
              </div>

              {/* Patient Care / Doctor Instructions */}
              {appt.notes && (
                <div className="bg-white rounded-2xl p-5 border border-slate-100">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText size={14} className="text-blue-500" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      Doctor's Advice & Instructions
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed italic">
                    &ldquo;{appt.notes}&rdquo;
                  </p>
                </div>
              )}

              {/* Lab / Test Results */}
              {appt.results && (
                <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800">
                  <div className="flex items-center gap-2 mb-3">
                    <Beaker size={14} className="text-purple-400" />
                    <span className="text-[10px] font-black text-purple-400 uppercase tracking-wider">
                      Test Results (Your doctor will explain these data
                      readouts)
                    </span>
                  </div>
                  <pre className="text-emerald-400 font-mono text-xs leading-relaxed whitespace-pre-wrap">
                    {appt.results}
                  </pre>
                </div>
              )}

              {/* Prescriptions */}
              {appt.drugs?.length > 0 && (
                <div className="bg-white rounded-2xl p-5 border border-slate-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Pill size={14} className="text-rose-500" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      Prescribed Medications
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {appt.drugs.map((drug: string, i: number) => (
                      <span
                        key={i}
                        className="px-4 py-2 bg-rose-50 text-rose-700 rounded-xl text-xs font-bold border border-rose-100"
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
    </motion.div>
  );
}

// --------------------------------------------------------------------------------
// SUB‑COMPONENTS
// --------------------------------------------------------------------------------
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
    <div className="bg-white rounded-2xl p-4 border border-slate-100">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className="text-slate-400" />
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="text-sm font-bold text-slate-800">{value}</p>
    </div>
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
    <div className="bg-white border-2 border-dashed border-slate-200 rounded-[32px] p-12 text-center">
      <div className="h-16 w-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300">
        <Icon size={28} />
      </div>
      <p className="text-sm font-bold text-slate-500 mb-1">{title}</p>
      <p className="text-xs text-slate-400">{description}</p>
    </div>
  );
}

// --------------------------------------------------------------------------------
// PREMIUM SKELETON LOADING STATE
// --------------------------------------------------------------------------------
function LoadingState() {
  const SkeletonPulse = ({ className }: { className: string }) => (
    <div
      className={cn("animate-pulse bg-slate-200/80 rounded-xl", className)}
    />
  );

  return (
    <div
      className={cn("min-h-screen bg-[#F8FAFC] pb-32 pt-6", poppins.className)}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6 space-y-8">
        {/* Header skeleton */}
        <div className="bg-white rounded-[32px] p-6 md:p-10 border border-slate-200/60 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div className="space-y-3 w-full max-w-md">
              <div className="flex items-center gap-3">
                <SkeletonPulse className="h-8 w-1 rounded-full" />
                <SkeletonPulse className="h-3 w-28" />
              </div>
              <SkeletonPulse className="h-12 w-3/4 rounded-2xl" />
              <SkeletonPulse className="h-4 w-full" />
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <SkeletonPulse className="h-20 w-20 rounded-2xl" />
              <SkeletonPulse className="h-20 w-20 rounded-2xl" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 space-y-6">
            <div className="px-2">
              <SkeletonPulse className="h-3 w-32" />
            </div>

            {[1, 2].map((i) => (
              <div
                key={i}
                className="bg-white rounded-[28px] border border-slate-100 p-6 space-y-5 shadow-sm"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4 w-full">
                    <SkeletonPulse className="w-14 h-14 rounded-2xl" />
                    <div className="space-y-2 w-1/2">
                      <SkeletonPulse className="h-4 w-full" />
                      <SkeletonPulse className="h-3 w-2/3" />
                    </div>
                  </div>
                  <SkeletonPulse className="h-6 w-16 rounded-xl" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <SkeletonPulse className="h-14 rounded-2xl" />
                  <SkeletonPulse className="h-14 rounded-2xl" />
                </div>
                <SkeletonPulse className="h-6 w-28 rounded-xl" />
              </div>
            ))}
          </div>

          <div className="lg:col-span-7 space-y-6">
            <div className="px-2">
              <SkeletonPulse className="h-3 w-36" />
            </div>

            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white border border-slate-100 rounded-[28px] p-5 flex items-center justify-between shadow-sm"
              >
                <div className="flex items-center gap-4 w-2/3">
                  <SkeletonPulse className="h-12 w-12 rounded-2xl shrink-0" />
                  <div className="space-y-2 w-full">
                    <SkeletonPulse className="h-4 w-1/3" />
                    <SkeletonPulse className="h-3 w-1/2" />
                  </div>
                </div>
                <SkeletonPulse className="h-6 w-20 rounded-xl hidden md:block" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
