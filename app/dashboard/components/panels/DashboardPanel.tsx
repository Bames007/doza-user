// app/dashboard/panels/DashboardPanel.tsx

"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import { useUserContext } from "../../UserContext";
import useSWR from "swr";
import { motion, AnimatePresence, Transition } from "framer-motion";
import * as THREE from "three";
import {
  HeartPulse,
  Footprints,
  Activity,
  Droplets,
  Lightbulb,
  ChevronRight,
  ChevronLeft,
  TrendingUp,
  Calendar,
  Clock,
  History,
  ClipboardList,
  Bell,
  X,
  Check,
  AlertCircle,
  Loader2,
  Copy,
  ChevronDown,
  ChevronUp,
  Pill,
  Microscope,
} from "lucide-react";
import { useDashboard } from "../../DashboardContext";
import { authFetcher } from "@/app/utils/client-auth";
import { cn } from "@/app/utils/utils";
import { poppins, bebasNeue } from "@/app/constants";
import { useActiveSession } from "@/app/dashboard/hooks/useSession";
import { usePendingLinkRequests } from "../../hooks/usePendingLinkRequest";

// ─── Hook: fetch session history ──────────────────────────────────
function useSessionHistory(userId?: string) {
  const { data, error } = useSWR(
    userId ? `/api/user/${userId}/sessions` : null,
    authFetcher,
    { revalidateOnFocus: true },
  );
  return {
    sessions: data?.data || [],
    loading: !data && !error,
    error,
  };
}

const spring: Transition = {
  type: "spring",
  stiffness: 200,
  damping: 25,
};

// ─── Helpers ──────────────────────────────────────────────────────

const translateMedicalType = (type: string): string => {
  switch (type) {
    case "heartRate":
      return "Heart Rate";
    case "bloodPressure":
      return "Blood Pressure";
    case "steps":
      return "Daily Steps";
    case "weight":
      return "Body Weight";
    default:
      return type;
  }
};

const formatHealthValue = (record: any): string => {
  if (record.type === "bloodPressure" && typeof record.value === "object") {
    return `${record.value.systolic}/${record.value.diastolic}`;
  }
  return record.value?.toString() || "—";
};

const getUnitLabel = (type: string): string => {
  switch (type) {
    case "heartRate":
      return "bpm";
    case "bloodPressure":
      return "mmHg";
    case "steps":
      return "steps";
    case "weight":
      return "kg";
    default:
      return "";
  }
};

// ─── Main Component ──────────────────────────────────────────────

export default function DashboardPanel() {
  const user = useUserContext();
  const userId = user?.id;
  const { setActivePanel } = useDashboard();
  const [tipIndex, setTipIndex] = useState(0);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(
    null,
  );

  // ─── Active session ─────────────────────────────────────────────
  const { session: activeSession } = useActiveSession(userId);

  // ─── Session history ────────────────────────────────────────────
  const { sessions: sessionHistory, loading: historyLoading } =
    useSessionHistory(userId);

  // ─── Dashboard data ─────────────────────────────────────────────
  const { data: dashboardData, isLoading: dataLoading } = useSWR(
    userId ? "/api/dashboard/summary" : null,
    authFetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60_000,
    },
  );

  const notifications: any[] = dashboardData?.data?.notifications ?? [];
  const healthRecords = dashboardData?.data?.healthRecords ?? {};
  const upcomingAppointments = dashboardData?.data?.appointments ?? [];

  const displayStats = {
    heartRate: healthRecords.heartRate || "—",
    bloodPressure: healthRecords.bloodPressure || "—",
    steps: healthRecords.steps || "—",
    weight: healthRecords.weight || "—",
  };

  const recentEntries = healthRecords.recentEntries || [];

  const sortedAppointments = useMemo(() => {
    if (!upcomingAppointments || upcomingAppointments.length === 0) return [];
    return [...upcomingAppointments].sort((a, b) => {
      return (
        new Date(`${a.date}T${a.time}`).getTime() -
        new Date(`${b.date}T${b.time}`).getTime()
      );
    });
  }, [upcomingAppointments]);

  const healthTips = useMemo(() => {
    if (notifications.length === 0) {
      return [
        "Drinking water regularly throughout the day is the simplest way to boost your daily energy.",
        "Logging your readings consistently helps us provide clear trends about your health journey.",
      ];
    }
    return notifications.map((n: any) => n.message).slice(0, 5);
  }, [notifications]);

  // ─── Pending link requests ──────────────────────────────────────
  const { pendingRequests, mutate: mutatePending } =
    usePendingLinkRequests(userId);

  const [activeRequest, setActiveRequest] = useState<any | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [copied, setCopied] = useState(false);

  // Load pending request from localStorage on mount (persistence)
  useEffect(() => {
    if (!userId) return;
    const stored = localStorage.getItem(`pending-request-${userId}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.otpExpires > Date.now()) {
          setActiveRequest(parsed);
          setShowPopup(true);
        } else {
          localStorage.removeItem(`pending-request-${userId}`);
        }
      } catch (e) {
        localStorage.removeItem(`pending-request-${userId}`);
      }
    }
  }, [userId]);

  // Update when new pending requests arrive from API
  useEffect(() => {
    if (!userId) return;
    if (pendingRequests.length > 0) {
      const req = pendingRequests[0];
      if (req.otpExpires > Date.now()) {
        setActiveRequest(req);
        setShowPopup(true);
        localStorage.setItem(`pending-request-${userId}`, JSON.stringify(req));
      } else {
        localStorage.removeItem(`pending-request-${userId}`);
        if (activeRequest && activeRequest.requestId === req.requestId) {
          setShowPopup(false);
          setActiveRequest(null);
        }
      }
    } else {
      localStorage.removeItem(`pending-request-${userId}`);
    }
  }, [pendingRequests, userId]);

  const handleDismissPopup = () => {
    setShowPopup(false);
    setActiveRequest(null);
    if (userId) {
      localStorage.removeItem(`pending-request-${userId}`);
    }
  };

  const handleCopy = (otp: string) => {
    navigator.clipboard.writeText(otp);
    setCopied(true);
    setTimeout(() => setCopied(false), 5000);
  };

  // Helper: format duration
  const formatDuration = (start: number, end?: number) => {
    const now = end || Date.now();
    const diff = Math.floor((now - start) / 1000);
    const mins = Math.floor(diff / 60);
    const secs = diff % 60;
    return `${mins}m ${secs}s`;
  };

  // ─── Loading State ──────────────────────────────────────────────
  if (!user) return <LoadingState />;
  if (dataLoading) return <LoadingState />;

  // ─── Render ──────────────────────────────────────────────────────

  return (
    <div
      className={cn(
        "min-h-screen bg-[#F8FAFC] pb-24 pt-4 md:pt-8",
        poppins.className,
      )}
    >
      {/* ─── Active Session Banner ────────────────────────────────── */}
      {activeSession && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-0 z-40 bg-emerald-500 text-white px-4 py-3 shadow-lg flex items-center justify-between flex-wrap gap-2"
        >
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-white animate-pulse" />
            <span className="font-medium">
              Session active with{" "}
              {activeSession.centerName || "Healthcare Center"}
            </span>
            <span className="text-xs opacity-80">
              (started {new Date(activeSession.startTime).toLocaleTimeString()})
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <button
              onClick={() => setActivePanel("doza-panel")}
              className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition-colors"
            >
              View Details
            </button>
          </div>
        </motion.div>
      )}

      <div className="max-w-7xl mx-auto px-4 md:px-6 space-y-5 md:space-y-8">
        {/* ─── HEADER ────────────────────────────────────────────────── */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 md:p-8 rounded-[28px] border border-slate-200/60 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                Connected & Up to Date
              </p>
            </div>
            <h1
              className={cn(
                "text-3xl md:text-5xl text-slate-900",
                bebasNeue.className,
              )}
            >
              Welcome,{" "}
              <span className="text-emerald-600">
                {user?.fullName?.split(" ")[0] || "User"}
              </span>
            </h1>
          </div>
          <button
            onClick={() => setActivePanel("health-tracker")}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
          >
            <History size={14} /> View Your Full History
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-6">
          {/* ─── LEFT COLUMN ───────────────────────────────────────── */}
          <div className="md:col-span-8 space-y-5 md:space-y-6">
            {/* LATEST READINGS */}
            <BentoTile className="bg-white px-4 py-6 md:p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm md:text-lg font-black text-slate-900 flex items-center gap-2 uppercase tracking-tight">
                  <TrendingUp className="text-emerald-500" size={18} /> Your
                  Health Summary
                </h3>
                <button
                  onClick={() => setActivePanel("health-tracker")}
                  className="text-[10px] font-bold text-emerald-600"
                >
                  See Detailed Changes
                </button>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <StatCard
                  icon={HeartPulse}
                  label="Heart Rate"
                  val={displayStats.heartRate}
                  unit="bpm"
                  color="text-rose-500"
                  bg="bg-rose-50"
                  hasChart
                />
                <StatCard
                  icon={Activity}
                  label="Blood Pressure"
                  val={
                    typeof displayStats.bloodPressure === "object"
                      ? `${displayStats.bloodPressure.systolic}/${displayStats.bloodPressure.diastolic}`
                      : displayStats.bloodPressure
                  }
                  unit="mmHg"
                  color="text-amber-500"
                  bg="bg-amber-50"
                  hasChart
                />
                <StatCard
                  icon={Droplets}
                  label="Body Weight"
                  val={displayStats.weight}
                  unit="kg"
                  color="text-emerald-500"
                  bg="bg-emerald-50"
                  hasChart
                />
                <StatCard
                  icon={Footprints}
                  label="Steps Today"
                  val={displayStats.steps}
                  unit="steps"
                  color="text-blue-500"
                  bg="bg-blue-50"
                />
              </div>
            </BentoTile>

            {/* ─── ONGOING SESSION CARD ───────────────────────────── */}
            {activeSession && (
              <BentoTile className="bg-white px-4 py-6 md:p-8 border-l-4 border-emerald-500">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-emerald-600 mb-2">
                      <Activity className="w-5 h-5 animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        Ongoing Session
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {activeSession.centerName || "Healthcare Center"}
                    </h3>
                    <p className="text-sm text-slate-600">
                      Started{" "}
                      {new Date(activeSession.startTime).toLocaleString()}
                    </p>
                    <div className="mt-2 inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-medium">
                      <Clock className="w-3 h-3" />
                      <span>
                        Duration: {formatDuration(activeSession.startTime)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setActivePanel("doza-panel")}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition"
                  >
                    View Details
                  </button>
                </div>
              </BentoTile>
            )}

            {/* ─── SESSION HISTORY ────────────────────────────────── */}
            {!historyLoading && sessionHistory.length > 0 && (
              <BentoTile className="bg-white px-4 py-6 md:p-8">
                <div className="flex items-center gap-2 mb-4">
                  <History className="w-5 h-5 text-emerald-500" />
                  <h3 className="text-sm md:text-lg font-black text-slate-900 uppercase tracking-tight">
                    Session History
                  </h3>
                  <span className="ml-auto text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                    {sessionHistory.length} sessions
                  </span>
                </div>

                <div className="divide-y divide-slate-100">
                  {sessionHistory.slice(0, 10).map((session: any) => {
                    const isExpanded = expandedSessionId === session.sessionId;
                    return (
                      <div
                        key={session.sessionId}
                        className="py-3 first:pt-0 last:pb-0"
                      >
                        <button
                          onClick={() =>
                            setExpandedSessionId(
                              isExpanded ? null : session.sessionId,
                            )
                          }
                          className="w-full flex items-center justify-between text-left"
                        >
                          <div>
                            <p className="font-semibold text-slate-800">
                              {session.centerName}
                            </p>
                            <p className="text-xs text-slate-500">
                              {new Date(session.startTime).toLocaleDateString()}{" "}
                              –{" "}
                              {session.endTime
                                ? formatDuration(
                                    session.startTime,
                                    session.endTime,
                                  )
                                : "Ongoing"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded-full",
                                session.status === "ended"
                                  ? "bg-slate-100 text-slate-600"
                                  : "bg-emerald-100 text-emerald-700",
                              )}
                            >
                              {session.status || "ended"}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-slate-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="mt-3 pl-2 border-l-2 border-emerald-200 space-y-2">
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-xs text-slate-500 block">
                                  Started
                                </span>
                                <span className="font-medium">
                                  {new Date(session.startTime).toLocaleString()}
                                </span>
                              </div>
                              <div>
                                <span className="text-xs text-slate-500 block">
                                  Ended
                                </span>
                                <span className="font-medium">
                                  {session.endTime
                                    ? new Date(session.endTime).toLocaleString()
                                    : "—"}
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-3 text-xs text-slate-600">
                              <span className="flex items-center gap-1">
                                <Pill className="w-3 h-3" /> 0 prescriptions
                              </span>
                              <span className="flex items-center gap-1">
                                <Microscope className="w-3 h-3" /> 0 tests
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </BentoTile>
            )}

            {/* HISTORICAL ENTRIES LIST (existing) */}
            <BentoTile className="bg-white px-4 py-6 md:p-8">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-sm md:text-lg font-black text-slate-900 flex items-center gap-2 uppercase tracking-tight">
                  <ClipboardList className="text-emerald-500" size={18} />{" "}
                  Recent Health Logs
                </h3>
              </div>
              <div className="space-y-2.5">
                {recentEntries.map((entry: any, idx: number) => (
                  <div
                    key={entry.id || idx}
                    className="flex justify-between items-center p-4 bg-slate-50/80 rounded-2xl border border-slate-100/50"
                  >
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                        {new Date(entry.date).toLocaleDateString(undefined, {
                          dateStyle: "long",
                        })}
                      </p>
                      <p className="text-base font-black text-slate-900">
                        {formatHealthValue(entry)}{" "}
                        <span className="text-[10px] text-slate-400 font-medium">
                          {getUnitLabel(entry.type)}
                        </span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-800 uppercase tracking-tight">
                        {translateMedicalType(entry.type)}
                      </p>
                      <div className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[8px] font-black rounded-full uppercase mt-1">
                        Saved
                      </div>
                    </div>
                  </div>
                ))}
                {recentEntries.length === 0 && (
                  <p className="text-slate-400 text-sm text-center py-4">
                    No logs recorded yet. Use the tool above to add your
                    metrics.
                  </p>
                )}
              </div>
            </BentoTile>
          </div>

          {/* ─── RIGHT COLUMN ────────────────────────────────────── */}
          <div className="md:col-span-4 space-y-5 md:space-y-6">
            {/* APPOINTMENTS SECTION (unchanged) */}
            {sortedAppointments.length > 0 ? (
              <div className="space-y-4">
                <div className="bg-slate-900 rounded-[28px] p-6 md:p-8 text-white relative overflow-hidden shadow-xl">
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-6">
                      <Calendar size={16} className="text-emerald-400" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                        Your Next Appointment
                      </span>
                    </div>
                    <AppointmentCountdown
                      targetDate={`${sortedAppointments[0].date}T${sortedAppointments[0].time}`}
                    />
                    <div className="mt-6 space-y-1">
                      <h4 className="text-xl md:text-2xl font-bold tracking-tight">
                        {sortedAppointments[0].medicName ||
                          "General Care Practitioner"}
                      </h4>
                      <p className="text-xs text-slate-400 flex items-center gap-2">
                        <Clock size={12} className="text-emerald-500" />{" "}
                        {sortedAppointments[0].date} at{" "}
                        {sortedAppointments[0].time}
                      </p>
                      {sortedAppointments[0].reason && (
                        <p className="text-xs text-slate-400 mt-2 bg-white/5 p-2.5 rounded-xl border border-white/5">
                          <span className="text-[9px] block text-emerald-400 uppercase font-bold mb-0.5">
                            Reason for visit:
                          </span>
                          {sortedAppointments[0].reason}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {sortedAppointments.length > 1 && (
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                      Later Appointments
                    </p>
                    {sortedAppointments.slice(1, 4).map((apt: any) => (
                      <button
                        key={apt.id}
                        onClick={() => setActivePanel("appointment")}
                        className="w-full bg-white rounded-[20px] p-4 border border-slate-100 shadow-sm hover:shadow-md transition-all text-left group"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                              {apt.medicName || "Care Provider"}
                            </p>
                            <p className="text-[10px] text-slate-400 flex items-center gap-2 mt-1">
                              <Clock size={10} /> {apt.date} at {apt.time}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] font-black text-emerald-500 uppercase bg-emerald-50 px-2 py-1 rounded-lg">
                              In{" "}
                              {Math.ceil(
                                (new Date(`${apt.date}T${apt.time}`).getTime() -
                                  Date.now()) /
                                  (1000 * 60 * 60 * 24),
                              )}{" "}
                              Days
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-[28px] p-6 md:p-8 border border-slate-100 shadow-sm">
                <div className="text-center space-y-4">
                  <Calendar size={32} className="text-slate-300 mx-auto" />
                  <div>
                    <p className="text-sm font-bold text-slate-900 mb-1">
                      No Scheduled Appointments
                    </p>
                    <p className="text-[10px] text-slate-400 leading-normal">
                      Need a health check or have queries? Book a direct session
                      with our team.
                    </p>
                  </div>
                  <button
                    onClick={() => setActivePanel("appointment")}
                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-all"
                  >
                    Find a Doctor
                  </button>
                </div>
              </div>
            )}

            {/* HEALTH TIPS CAROUSEL (unchanged) */}
            <div className="bg-emerald-600 rounded-[28px] p-6 md:p-8 text-white relative overflow-hidden min-h-[220px] shadow-lg">
              <ThreeBackground />
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Lightbulb size={18} className="text-emerald-200" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-100">
                      Daily Health Tip
                    </span>
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={tipIndex}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-base font-medium leading-relaxed italic"
                    >
                      &ldquo;{healthTips[tipIndex]}&rdquo;
                    </motion.p>
                  </AnimatePresence>
                </div>
                <div className="flex gap-2 mt-6">
                  <button
                    onClick={() =>
                      setTipIndex((p) =>
                        p === 0 ? healthTips.length - 1 : p - 1,
                      )
                    }
                    className="p-2.5 bg-white/10 rounded-lg text-white hover:bg-white/20 transition-colors"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    onClick={() =>
                      setTipIndex((p) => (p + 1) % healthTips.length)
                    }
                    className="p-2.5 bg-white/10 rounded-lg text-white hover:bg-white/20 transition-colors"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── PENDING LINK REQUEST POPUP ────────────────────────────── */}
      <AnimatePresence>
        {showPopup && activeRequest && userId && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-4 right-4 z-50 w-full max-w-sm sm:max-w-md"
          >
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-teal-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 rounded-xl">
                    <Bell className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Link Request
                    </h4>
                    <p className="text-[10px] text-slate-500">
                      {activeRequest.centerName || "Healthcare Center"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleDismissPopup}
                  className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>

              {/* Body */}
              <div className="px-5 py-4 space-y-4">
                <p className="text-sm text-slate-700">
                  <span className="font-semibold">
                    {activeRequest.centerName || "A healthcare center"}
                  </span>{" "}
                  wants to link with you. Please share this 6‑digit OTP with the
                  staff to complete the link.
                </p>

                {/* OTP Display */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-center">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                    Your One‑Time Password
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    {(activeRequest.otp || "")
                      .split("")
                      .map((digit: string, idx: number) => (
                        <div
                          key={idx}
                          className="w-10 h-12 bg-white rounded-lg border border-slate-300 flex items-center justify-center text-2xl font-bold text-slate-800 font-mono shadow-sm"
                        >
                          {digit}
                        </div>
                      ))}
                  </div>
                  <div className="flex items-center justify-center gap-2 mt-2 text-xs text-slate-500">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      Expires in{" "}
                      {(() => {
                        const diff = Math.max(
                          0,
                          Math.floor(
                            (activeRequest.otpExpires - Date.now()) / 1000,
                          ),
                        );
                        const mins = Math.floor(diff / 60);
                        const secs = diff % 60;
                        return `${mins}:${secs.toString().padStart(2, "0")}`;
                      })()}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopy(activeRequest.otp || "")}
                    className="mt-3 text-sm text-emerald-600 font-medium flex items-center gap-1 mx-auto hover:underline transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" /> Copy OTP
                      </>
                    )}
                  </button>
                </div>

                {/* Disclaimer */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Never share this OTP</strong> with anyone except the
                    center staff. Doza will never ask for this code outside of
                    this session.
                  </span>
                </div>

                <p className="text-[10px] text-slate-400">
                  This code will expire in 20 minutes. If it expires, ask the
                  center to send a new request.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Subcomponents ──────────────────────────────────────────────────

function StatCard({ icon: Icon, label, val, unit, color, bg, hasChart }: any) {
  return (
    <div className="p-4 rounded-[22px] bg-slate-50/50 border border-slate-100 flex flex-col group active:scale-95 transition-all">
      <div className={cn("p-2 rounded-lg w-fit mb-3", bg)}>
        <Icon size={16} className={color} />
      </div>
      <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider mb-0.5">
        {label}
      </span>
      <div className="flex items-baseline gap-0.5">
        <span className="text-lg font-black text-slate-900 tracking-tighter">
          {val}
        </span>
        <span className="text-[8px] font-bold text-slate-400 uppercase ml-0.5">
          {unit}
        </span>
      </div>
      {hasChart && <LiveBioChart color={color} />}
    </div>
  );
}

function LiveBioChart({ color }: { color: string }) {
  const points = [40, 65, 45, 90, 55, 75, 40, 85];
  const hexToTailwind = (c: string) =>
    c.includes("rose")
      ? "bg-rose-500/40"
      : c.includes("amber")
        ? "bg-amber-500/40"
        : "bg-emerald-500/40";
  return (
    <div className="flex items-end gap-1 h-8 w-full mt-3 overflow-hidden">
      {points.map((p, i) => (
        <motion.div
          key={i}
          animate={{ height: `${p}%` }}
          transition={{
            repeat: Infinity,
            repeatType: "reverse",
            duration: 0.6 + Math.random(),
            delay: i * 0.05,
          }}
          className={cn("flex-1 rounded-full", hexToTailwind(color))}
        />
      ))}
    </div>
  );
}

function AppointmentCountdown({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    const calc = () => {
      const diff = +new Date(targetDate) - +new Date();
      if (diff <= 0) return setTimeLeft("Now");
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / 1000 / 60) % 60);
      setTimeLeft(`${d > 0 ? d + "d " : ""}${h}h ${m}m`);
    };
    calc();
    const timer = setInterval(calc, 60000);
    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <div className="flex flex-col">
      <span
        className={cn(
          "text-5xl md:text-6xl font-black text-emerald-400 tracking-tighter leading-none",
          bebasNeue.className,
        )}
      >
        {timeLeft}
      </span>
      <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">
        Remaining Time to Session
      </span>
    </div>
  );
}

function ThreeBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!containerRef.current) return;
    let animationFrameId: number;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(200, 200);
    containerRef.current.appendChild(renderer.domElement);

    const geometry = new THREE.IcosahedronGeometry(1, 1);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.1,
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    camera.position.z = 2.5;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      mesh.rotation.y += 0.005;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      containerRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute -right-12 -bottom-12 pointer-events-none opacity-30"
    />
  );
}

function BentoTile({ children, className, onClick }: any) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={spring}
      onClick={onClick}
      className={cn(
        "rounded-[30px] border border-slate-100 shadow-sm transition-all",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}

// ─── Loading State ──────────────────────────────────────────────────
function LoadingState() {
  const PulseItem = ({ className }: { className: string }) => (
    <div
      className={cn("animate-pulse bg-slate-200/80 rounded-xl", className)}
    />
  );

  return (
    <div
      className={cn(
        "min-h-screen bg-[#F8FAFC] pb-24 pt-4 md:pt-8",
        poppins.className,
      )}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6 space-y-5 md:space-y-8">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 md:p-8 rounded-[28px] border border-slate-200/60 shadow-sm w-full">
          <div className="space-y-3 w-1/2">
            <div className="flex items-center gap-2">
              <PulseItem className="h-3 w-3 rounded-full" />
              <PulseItem className="h-3 w-32" />
            </div>
            <PulseItem className="h-10 w-64 rounded-xl" />
          </div>
          <PulseItem className="h-12 w-full md:w-44 rounded-xl" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-6">
          {/* Left Column Skeleton */}
          <div className="md:col-span-8 space-y-5 md:space-y-6">
            <div className="bg-white p-6 md:p-8 rounded-[30px] border border-slate-100 shadow-sm space-y-6">
              <div className="flex justify-between items-center">
                <PulseItem className="h-5 w-44" />
                <PulseItem className="h-3 w-24" />
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="p-4 rounded-[22px] bg-slate-50 border border-slate-100 space-y-3"
                  >
                    <PulseItem className="h-8 w-8 rounded-lg" />
                    <PulseItem className="h-2 w-16" />
                    <PulseItem className="h-6 w-12" />
                    <div className="flex gap-0.5 h-6 pt-2 items-end">
                      {[1, 2, 3, 4, 5].map((j) => (
                        <PulseItem
                          key={j}
                          className="h-full flex-1 rounded-full"
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 md:p-8 rounded-[30px] border border-slate-100 shadow-sm space-y-4">
              <PulseItem className="h-5 w-36 mb-2" />
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100"
                >
                  <div className="space-y-2 w-1/3">
                    <PulseItem className="h-2.5 w-20" />
                    <PulseItem className="h-4 w-28" />
                  </div>
                  <div className="space-y-2 text-right flex flex-col items-end">
                    <PulseItem className="h-3 w-20" />
                    <PulseItem className="h-4 w-12 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column Skeleton */}
          <div className="md:col-span-4 space-y-5 md:space-y-6">
            <div className="bg-slate-900 rounded-[28px] p-6 md:p-8 space-y-6 shadow-xl">
              <div className="flex items-center gap-2">
                <PulseItem className="h-4 w-4 bg-slate-800" />
                <PulseItem className="h-2 w-28 bg-slate-800" />
              </div>
              <div className="space-y-2">
                <PulseItem className="h-14 w-40 bg-slate-800 rounded-2xl" />
                <PulseItem className="h-2 w-32 bg-slate-800" />
              </div>
              <div className="pt-4 border-t border-slate-800 space-y-2">
                <PulseItem className="h-5 w-48 bg-slate-800" />
                <PulseItem className="h-3 w-36 bg-slate-800" />
              </div>
            </div>

            <div className="bg-emerald-600 rounded-[28px] p-6 md:p-8 h-56 flex flex-col justify-between shadow-lg">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <PulseItem className="h-4 w-4 bg-emerald-500/50" />
                  <PulseItem className="h-2.5 w-24 bg-emerald-500/50" />
                </div>
                <div className="space-y-2">
                  <PulseItem className="h-3 w-full bg-emerald-500/50" />
                  <PulseItem className="h-3 w-5/6 bg-emerald-500/50" />
                </div>
              </div>
              <div className="flex gap-2">
                <PulseItem className="h-9 w-9 bg-emerald-500/50 rounded-lg" />
                <PulseItem className="h-9 w-9 bg-emerald-500/50 rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
