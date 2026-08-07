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
  Star,
  Edit3,
  Send,
  Dumbbell,
} from "lucide-react";
import { useDashboard } from "../../DashboardContext";
import { authFetcher } from "@/app/utils/client-auth";
import { cn } from "@/app/utils/utils";
import { poppins, bebasNeue } from "@/app/constants";
import { useActiveSession } from "@/app/dashboard/hooks/useSession";
import { usePendingLinkRequests } from "../../hooks/usePendingLinkRequest";
import { useNotifications } from "../../hooks/useNotification";

// ─── SessionRating Component (duplicated for self‑containment) ──
const SessionRating = ({
  sessionId,
  centerId,
  initialRating = 0,
  initialComment = "",
  onRated,
}: {
  sessionId: string;
  centerId: string;
  initialRating?: number;
  initialComment?: string;
  onRated: (rating: number, comment: string) => void;
}) => {
  const [rating, setRating] = useState(initialRating);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState(initialComment);
  const [submitting, setSubmitting] = useState(false);
  const [showComment, setShowComment] = useState(false);
  const userId = useUserContext()?.id;

  const handleRate = async (value: number) => {
    setRating(value);
    setShowComment(true);
  };

  const handleSubmit = async () => {
    if (!userId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/user/${userId}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          centerId,
          sessionId,
          rating,
          comment: comment.trim(),
        }),
      });
      if (res.ok) {
        onRated(rating, comment);
        setShowComment(false);
      } else {
        alert("Failed to submit rating. Please try again.");
      }
    } catch (err) {
      console.error("Rating error", err);
      alert("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-slate-200">
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
        Rate your experience
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => handleRate(star)}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
              className="focus:outline-none transition-transform active:scale-90"
            >
              <Star
                size={28}
                className={cn(
                  "fill-current transition-colors",
                  (hover || rating) >= star
                    ? "text-amber-400"
                    : "text-slate-300",
                )}
              />
            </button>
          ))}
        </div>
        {rating > 0 && (
          <span className="text-sm font-semibold text-slate-700">
            {rating}/5
          </span>
        )}
      </div>

      {showComment && (
        <div className="mt-3 space-y-2">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your thoughts (optional)"
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition resize-none min-h-[60px]"
            rows={2}
          />
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Submit Review
          </button>
        </div>
      )}

      {initialRating > 0 && !showComment && (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-slate-500">
            Rated: {initialRating}/5
          </span>
          {initialComment && (
            <span className="text-xs text-slate-400 italic">
              “{initialComment}”
            </span>
          )}
          <button
            onClick={() => setShowComment(true)}
            className="text-xs text-emerald-600 hover:text-emerald-800 font-medium flex items-center gap-1"
          >
            <Edit3 className="w-3 h-3" /> Edit
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Hook: fetch session history with deduplication ────────────
function useSessionHistory(userId?: string) {
  const { data, error } = useSWR(
    userId ? `/api/user/${userId}/sessions` : null,
    authFetcher,
    { revalidateOnFocus: true },
  );
  const uniqueSessions = useMemo(() => {
    if (!data?.data) return [];
    const seen = new Set();
    return data.data.filter((s: any) => {
      if (seen.has(s.sessionId)) return false;
      seen.add(s.sessionId);
      return true;
    });
  }, [data]);
  return {
    sessions: uniqueSessions,
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
  const {
    setActivePanel,
    showPendingRequestPopup,
    setShowPendingRequestPopup,
  } = useDashboard();
  const [tipIndex, setTipIndex] = useState(0);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(
    null,
  );

  const { markAsRead } = useNotifications();

  // ─── Active session ─────────────────────────────────────────────
  const { sessions: allSessions } = useActiveSession(userId);
  const activeSession = allSessions.length > 0 ? allSessions[0] : null;

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
  const { pendingRequests } = usePendingLinkRequests(userId);
  const [activeRequest, setActiveRequest] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!userId) return;
    const stored = localStorage.getItem(`pending-request-${userId}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.otpExpires > Date.now()) {
          setActiveRequest(parsed);
          setShowPendingRequestPopup(true);
        } else {
          localStorage.removeItem(`pending-request-${userId}`);
        }
      } catch {
        localStorage.removeItem(`pending-request-${userId}`);
      }
    }
  }, [userId, setShowPendingRequestPopup]);

  useEffect(() => {
    if (!userId) return;
    if (pendingRequests.length > 0) {
      const req = pendingRequests[0];
      if (req.otpExpires > Date.now()) {
        setActiveRequest(req);
        setShowPendingRequestPopup(true);
        localStorage.setItem(`pending-request-${userId}`, JSON.stringify(req));
      } else {
        localStorage.removeItem(`pending-request-${userId}`);
        if (activeRequest && activeRequest.requestId === req.requestId) {
          setShowPendingRequestPopup(false);
          setActiveRequest(null);
        }
      }
    } else {
      localStorage.removeItem(`pending-request-${userId}`);
    }
  }, [pendingRequests, userId, activeRequest, setShowPendingRequestPopup]);

  const handleDismissPopup = () => {
    setShowPendingRequestPopup(false);
    setActiveRequest(null);
    if (userId && activeRequest) {
      localStorage.removeItem(`pending-request-${userId}`);
      const notifId = `pending-${activeRequest.requestId || activeRequest.id}`;
      markAsRead([notifId]);
    }
  };

  const handleCopy = (otp: string) => {
    navigator.clipboard.writeText(otp);
    setCopied(true);
    setTimeout(() => setCopied(false), 5000);
  };

  const formatDuration = (start: number, end?: number) => {
    const now = end || Date.now();
    let diff = Math.floor((now - start) / 1000);
    if (diff < 0) return "0s";
    const days = Math.floor(diff / 86400);
    diff -= days * 86400;
    const hours = Math.floor(diff / 3600);
    diff -= hours * 3600;
    const mins = Math.floor(diff / 60);
    const secs = diff % 60;
    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (mins > 0) parts.push(`${mins}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
    return parts.join(" ");
  };

  // ─── Loading State ──────────────────────────────────────────────
  if (!user) return <LoadingState />;
  if (dataLoading) return <LoadingState />;

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <div
      className={cn(
        "min-h-screen bg-[#F8FAFC] pb-28 pt-3 md:pt-8",
        poppins.className,
      )}
    >
      {/* ─── Active Session Banner ────────────────────────────────── */}
      {activeSession && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-0 z-40 bg-emerald-600 text-white px-4 py-3 shadow-sm flex items-center justify-between flex-wrap gap-3 backdrop-blur-md bg-emerald-600/95 border-b border-emerald-500/30"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-2 w-2 rounded-full bg-white animate-pulse shrink-0" />
            <span className="font-medium text-xs sm:text-sm truncate tracking-tight">
              Session active with{" "}
              <span className="font-bold underline decoration-white/40">
                {activeSession.centerName || "Healthcare Center"}
              </span>
            </span>
            <span className="text-[11px] opacity-80 hidden xs:inline font-mono">
              (
              {new Date(activeSession.startTime).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
              )
            </span>
          </div>
          <button
            onClick={() => setActivePanel("doza-panel")}
            className="bg-white/15 hover:bg-white/25 active:scale-95 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 backdrop-blur-xs"
          >
            View Details
          </button>
        </motion.div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 md:space-y-8">
        {/* ─── NEW HEADER WITH TOP NAV ────────────── */}
        <header className="bg-white rounded-2xl md:rounded-3xl border border-slate-200/70 shadow-2xs overflow-hidden">
          {/* Top Navigation Links */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-slate-50/70 border-b border-slate-200/50 overflow-x-auto scrollbar-none">
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setActivePanel("dashboard")}
                className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-lg border border-emerald-200/60 shadow-2xs"
              >
                Home
              </button>
              <span className="text-slate-300 font-light">/</span>
              <button
                onClick={() => setActivePanel("appointment")}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-emerald-600 transition-colors flex items-center gap-1.5 rounded-lg hover:bg-slate-100/50"
              >
                <Calendar size={14} /> Appointments
              </button>
              <button
                onClick={() => setActivePanel("doza-medical-shop")}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-emerald-600 transition-colors flex items-center gap-1.5 rounded-lg hover:bg-slate-100/50"
              >
                <Pill size={14} /> Medical Shop
              </button>
              <button
                onClick={() => setActivePanel("doza-sport-shop")}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-emerald-600 transition-colors flex items-center gap-1.5 rounded-lg hover:bg-slate-100/50"
              >
                <Dumbbell size={14} /> Sport Shop
              </button>
            </div>
            <button
              onClick={() => setActivePanel("notifications")}
              className="relative p-2 rounded-xl hover:bg-slate-100/80 transition-colors shrink-0 ml-2"
            >
              <Bell size={18} className="text-slate-600" />
              {notifications.filter((n) => !n.read).length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
              )}
            </button>
          </div>

          {/* Main Header Content */}
          <div className="p-5 sm:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
              <div>
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="h-5 w-1 rounded-full bg-emerald-500" />
                  <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest">
                    Connected & Up to Date
                  </span>
                </div>
                {/* Responsive hidden logic: Hide 'Welcome Sarah' on mobile since sidebar handles it, show on md+ */}
                <h1
                  className={cn(
                    "hidden md:block text-4xl lg:text-5xl text-slate-900 tracking-tight font-bold",
                    bebasNeue.className,
                  )}
                >
                  Welcome,{" "}
                  <span className="text-emerald-600">
                    {user?.fullName?.split(" ")[0] || "User"}
                  </span>
                </h1>
                {/* Mobile clean compact header heading */}
                <h1 className="md:hidden text-2xl font-bold text-slate-900 tracking-tight">
                  Dashboard Overview
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  {activeSession
                    ? "You have an active session in progress"
                    : "All systems nominal and secure"}
                </p>
              </div>
              <button
                onClick={() => setActivePanel("health-tracker")}
                className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-slate-900 text-white rounded-xl text-xs font-semibold tracking-wide active:scale-95 hover:bg-slate-800 transition-all shadow-sm"
              >
                <History size={15} /> View Full History
              </button>
            </div>
          </div>
        </header>

        {/* ─── RESPONSIVE DASHBOARD CONTENT GRID ──────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ─── LEFT MAIN COLUMN (8 Cols on Desktop) ─────────────── */}
          <div className="lg:col-span-8 space-y-6">
            {/* LATEST READINGS SUMMARY */}
            <BentoTile className="bg-white p-5 sm:p-6 md:p-8 rounded-2xl md:rounded-3xl border border-slate-200/70 shadow-2xs">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2 tracking-tight">
                  <TrendingUp className="text-emerald-500 shrink-0" size={18} />{" "}
                  Your Health Summary
                </h3>
                <button
                  onClick={() => setActivePanel("health-tracker")}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  See Changes
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <StatCard
                  icon={HeartPulse}
                  label="Heart Rate"
                  val={displayStats.heartRate}
                  unit="bpm"
                  color="text-rose-500"
                  bg="bg-rose-50/50"
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
                  bg="bg-amber-50/50"
                  hasChart
                />
                <StatCard
                  icon={Droplets}
                  label="Body Weight"
                  val={displayStats.weight}
                  unit="kg"
                  color="text-emerald-500"
                  bg="bg-emerald-50/50"
                  hasChart
                />
                <StatCard
                  icon={Footprints}
                  label="Steps Today"
                  val={displayStats.steps}
                  unit="steps"
                  color="text-blue-500"
                  bg="bg-blue-50/50"
                />
              </div>
            </BentoTile>

            {/* ─── ONGOING SESSION CARD (IF ACTIVE) ─────────────── */}
            {activeSession && (
              <BentoTile className="bg-white p-5 sm:p-6 md:p-8 rounded-2xl md:rounded-3xl border-l-4 border-emerald-500 border border-slate-200/70 shadow-2xs">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-emerald-600">
                      <Activity className="w-4 h-4 animate-pulse" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">
                        Ongoing Session
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                      {activeSession.centerName || "Healthcare Center"}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Started{" "}
                      {new Date(activeSession.startTime).toLocaleString([], {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                    <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg text-xs font-medium mt-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>
                        Duration: {formatDuration(activeSession.startTime)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setActivePanel("doza-panel")}
                    className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition active:scale-95 shadow-2xs"
                  >
                    View Details
                  </button>
                </div>
              </BentoTile>
            )}

            {/* ─── SESSION HISTORY ────────────────────────────────── */}
            {!historyLoading && sessionHistory.length > 0 && (
              <BentoTile className="bg-white p-5 sm:p-6 md:p-8 rounded-2xl md:rounded-3xl border border-slate-200/70 shadow-2xs">
                <div className="flex items-center gap-2 mb-5">
                  <History className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                    Session History
                  </h3>
                  <span className="ml-auto text-xs text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full font-medium">
                    {sessionHistory.length} sessions
                  </span>
                </div>

                <div className="divide-y divide-slate-100">
                  {sessionHistory
                    .slice(0, 10)
                    .map((session: any, index: number) => {
                      const isExpanded =
                        expandedSessionId === session.sessionId;
                      const uniqueKey = `${session.sessionId}-${session.startTime}-${index}`;
                      return (
                        <div
                          key={uniqueKey}
                          className="py-4 first:pt-0 last:pb-0"
                        >
                          <button
                            onClick={() =>
                              setExpandedSessionId(
                                isExpanded ? null : session.sessionId,
                              )
                            }
                            className="w-full flex items-center justify-between text-left group"
                          >
                            <div className="min-w-0 pr-3">
                              <p className="font-semibold text-xs sm:text-sm text-slate-800 truncate group-hover:text-emerald-600 transition-colors">
                                {session.centerName}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                                <span>
                                  {new Date(
                                    session.startTime,
                                  ).toLocaleDateString(undefined, {
                                    dateStyle: "medium",
                                  })}
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  {formatDuration(
                                    session.startTime,
                                    session.endTime,
                                  )}
                                </span>
                                {session.rating && (
                                  <span className="flex items-center gap-1 text-amber-500 font-medium">
                                    <Star className="w-3 h-3 fill-current" />
                                    {session.rating}/5
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2.5 shrink-0">
                              <span
                                className={cn(
                                  "text-[10px] font-semibold px-2.5 py-1 rounded-md uppercase tracking-wider",
                                  session.status === "ended"
                                    ? "bg-slate-100 text-slate-600"
                                    : "bg-emerald-50 text-emerald-700 border border-emerald-200/60",
                                )}
                              >
                                {session.status || "ended"}
                              </span>
                              <div className="p-1.5 rounded-lg bg-slate-50 group-hover:bg-slate-100 transition-colors">
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4 text-slate-500" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-slate-500" />
                                )}
                              </div>
                            </div>
                          </button>

                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-4 pl-4 border-l-2 border-emerald-200 space-y-3 overflow-hidden text-xs"
                            >
                              <div className="grid grid-cols-2 gap-3 text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-200/50">
                                <div>
                                  <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">
                                    Started
                                  </span>
                                  <span className="font-semibold text-slate-800">
                                    {new Date(
                                      session.startTime,
                                    ).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">
                                    Ended
                                  </span>
                                  <span className="font-semibold text-slate-800">
                                    {session.endTime
                                      ? new Date(
                                          session.endTime,
                                        ).toLocaleTimeString([], {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })
                                      : "—"}
                                  </span>
                                </div>
                              </div>

                              <SessionRating
                                sessionId={session.sessionId}
                                centerId={session.centerId}
                                initialRating={session.rating}
                                initialComment={session.comment}
                                onRated={(rating, comment) => {
                                  console.log("Rated", rating, comment);
                                }}
                              />
                            </motion.div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </BentoTile>
            )}

            {/* HISTORICAL ENTRIES LIST */}
            <BentoTile className="bg-white p-5 sm:p-6 md:p-8 rounded-2xl md:rounded-3xl border border-slate-200/70 shadow-2xs">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2 tracking-tight">
                  <ClipboardList
                    className="text-emerald-500 shrink-0"
                    size={18}
                  />{" "}
                  Recent Health Logs
                </h3>
              </div>
              <div className="space-y-3">
                {recentEntries.map((entry: any, idx: number) => (
                  <div
                    key={entry.id || idx}
                    className="flex justify-between items-center p-4 bg-slate-50/70 rounded-2xl border border-slate-200/50 transition-all hover:bg-slate-50"
                  >
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {new Date(entry.date).toLocaleDateString(undefined, {
                          dateStyle: "medium",
                        })}
                      </p>
                      <p className="text-base font-bold text-slate-900 mt-0.5">
                        {formatHealthValue(entry)}{" "}
                        <span className="text-xs text-slate-400 font-normal">
                          {getUnitLabel(entry.type)}
                        </span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-800 tracking-tight">
                        {translateMedicalType(entry.type)}
                      </p>
                      <div className="inline-block px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[10px] font-semibold rounded-full uppercase mt-1">
                        Saved
                      </div>
                    </div>
                  </div>
                ))}
                {recentEntries.length === 0 && (
                  <p className="text-slate-400 text-xs sm:text-sm text-center py-6">
                    No logs recorded yet. Use the tool above to add your
                    metrics.
                  </p>
                )}
              </div>
            </BentoTile>
          </div>

          {/* ─── RIGHT SIDEBAR COLUMN (4 Cols on Desktop) ─────────── */}
          <div className="lg:col-span-4 space-y-6">
            {/* APPOINTMENTS SECTION */}
            {sortedAppointments.length > 0 ? (
              <div className="space-y-4">
                <div className="bg-slate-900 rounded-2xl md:rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-lg">
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-5">
                      <Calendar size={16} className="text-emerald-400" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Your Next Appointment
                      </span>
                    </div>
                    <AppointmentCountdown
                      targetDate={`${sortedAppointments[0].date}T${sortedAppointments[0].time}`}
                    />
                    <div className="mt-5 space-y-1.5">
                      <h4 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                        {sortedAppointments[0].medicName ||
                          "General Care Practitioner"}
                      </h4>
                      <p className="text-xs text-slate-400 flex items-center gap-2">
                        <Clock
                          size={13}
                          className="text-emerald-400 shrink-0"
                        />
                        {sortedAppointments[0].date} at{" "}
                        {sortedAppointments[0].time}
                      </p>
                      {sortedAppointments[0].reason && (
                        <p className="text-xs text-slate-300 mt-3 bg-white/5 p-3.5 rounded-xl border border-white/10 backdrop-blur-xs">
                          <span className="text-[10px] block text-emerald-400 font-bold uppercase tracking-wider mb-1">
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
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                      Later Appointments
                    </p>
                    {sortedAppointments.slice(1, 4).map((apt: any) => (
                      <button
                        key={apt.id}
                        onClick={() => setActivePanel("appointment")}
                        className="w-full bg-white rounded-2xl p-4 border border-slate-200/70 shadow-2xs hover:shadow-sm transition-all text-left group"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-semibold text-slate-900 group-hover:text-emerald-600 transition-colors truncate">
                              {apt.medicName || "Care Provider"}
                            </p>
                            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                              <Clock size={12} className="text-slate-400" />{" "}
                              {apt.date} at {apt.time}
                            </p>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2.5 py-1 rounded-lg shrink-0">
                            In{" "}
                            {Math.ceil(
                              (new Date(`${apt.date}T${apt.time}`).getTime() -
                                Date.now()) /
                                (1000 * 60 * 60 * 24),
                            )}
                            d
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl md:rounded-3xl p-6 md:p-8 border border-slate-200/70 shadow-2xs text-center">
                <Calendar
                  size={32}
                  className="text-slate-300 mx-auto mb-3 stroke-[1.5]"
                />
                <p className="text-sm font-bold text-slate-900 mb-1">
                  No Scheduled Appointments
                </p>
                <p className="text-xs text-slate-500 leading-relaxed mb-5">
                  Need a checkup? Book a direct session with our team.
                </p>
                <button
                  onClick={() => setActivePanel("appointment")}
                  className="w-full py-3 bg-slate-900 text-white rounded-xl font-semibold text-xs tracking-wide hover:bg-slate-800 transition-all active:scale-95 shadow-sm"
                >
                  Find a Doctor
                </button>
              </div>
            )}

            {/* HEALTH TIPS CAROUSEL */}
            <div className="bg-emerald-600 rounded-2xl md:rounded-3xl p-6 text-white relative overflow-hidden min-h-[200px] shadow-sm">
              <ThreeBackground />
              <div className="relative z-10 flex flex-col h-full justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb size={16} className="text-emerald-200" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-100">
                      Daily Health Tip
                    </span>
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={tipIndex}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-sm sm:text-base font-medium leading-relaxed italic text-white/95"
                    >
                      &ldquo;{healthTips[tipIndex]}&rdquo;
                    </motion.p>
                  </AnimatePresence>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setTipIndex((p) =>
                        p === 0 ? healthTips.length - 1 : p - 1,
                      )
                    }
                    className="p-2 bg-white/15 rounded-xl text-white hover:bg-white/25 active:scale-95 transition-all backdrop-blur-xs"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    onClick={() =>
                      setTipIndex((p) => (p + 1) % healthTips.length)
                    }
                    className="p-2 bg-white/15 rounded-xl text-white hover:bg-white/25 active:scale-95 transition-all backdrop-blur-xs"
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
        {showPendingRequestPopup && activeRequest && userId && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-4 right-4 left-4 sm:left-auto sm:top-4 sm:bottom-auto z-50 w-auto sm:max-w-md"
          >
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50/60 to-teal-50/60">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 rounded-xl">
                    <Bell className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                      Link Request
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      {activeRequest.centerName || "Healthcare Center"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleDismissPopup}
                  className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4">
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                  <span className="font-semibold text-slate-900">
                    {activeRequest.centerName || "A healthcare center"}
                  </span>{" "}
                  wants to link with you. Share this 6‑digit OTP with the staff.
                </p>

                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/60 text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                    Your One‑Time Password
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    {(activeRequest.otp || "")
                      .split("")
                      .map((digit: string, idx: number) => (
                        <div
                          key={idx}
                          className="w-9 h-11 sm:w-10 sm:h-12 bg-white rounded-xl border border-slate-300 flex items-center justify-center text-lg sm:text-xl font-bold text-slate-800 font-mono shadow-2xs"
                        >
                          {digit}
                        </div>
                      ))}
                  </div>
                  <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-slate-500">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
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
                    className="mt-3 text-xs text-emerald-600 font-semibold flex items-center gap-1.5 mx-auto hover:underline transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copy OTP
                      </>
                    )}
                  </button>
                </div>

                <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                  <span>
                    <strong>Never share this OTP</strong> with anyone except
                    authorized center staff.
                  </span>
                </div>
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
