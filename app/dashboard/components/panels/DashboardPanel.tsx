"use client";

import React, {
  useMemo,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
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
  Star,
  Edit3,
  Send,
  Dumbbell,
  MessageCircle,
  Plus,
  Smile,
} from "lucide-react";
import { useDashboard } from "../../DashboardContext";
import { authFetcher } from "@/app/utils/client-auth";
import { cn } from "@/app/utils/utils";
import { poppins, bebasNeue } from "@/app/constants";
import { useActiveSession } from "@/app/dashboard/hooks/useSession";
import { usePendingLinkRequests } from "../../hooks/usePendingLinkRequest";
import { useNotifications } from "../../hooks/useNotification";

// ─── SessionRating (unchanged) ────────────────────────────────
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
              onClick={() => {
                setRating(star);
                setShowComment(true);
              }}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
              className="focus:outline-none transition-transform active:scale-90 min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg"
              aria-label={`${star} star${star > 1 ? "s" : ""}`}
            >
              <Star
                size={26}
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
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition resize-none min-h-[60px]"
            rows={2}
          />
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition disabled:opacity-50 min-h-11"
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
            <span className="text-xs text-slate-500 italic">
              "{initialComment}"
            </span>
          )}
          <button
            onClick={() => setShowComment(true)}
            className="text-xs text-emerald-700 hover:text-emerald-800 font-medium flex items-center gap-1 min-h-11 px-2 rounded-lg"
          >
            <Edit3 className="w-3 h-3" /> Edit
          </button>
        </div>
      )}
    </div>
  );
};

// ─── useSessionHistory ────────────────────────────────────────
function useSessionHistory(userId?: string) {
  const { data, error, isLoading } = useSWR(
    userId ? `/api/user/${userId}/sessions` : null,
    authFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60_000,
      keepPreviousData: true,
      revalidateIfStale: false,
    },
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
    loading: isLoading && uniqueSessions.length === 0,
    error,
  };
}

const spring: Transition = {
  type: "spring",
  stiffness: 200,
  damping: 25,
};

// ─── Helpers ──────────────────────────────────────────────────
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

const MOODS = [
  {
    score: 1,
    emoji: "😞",
    label: "Very low",
    ring: "ring-rose-400",
    bg: "bg-rose-500",
  },
  {
    score: 2,
    emoji: "😟",
    label: "Low",
    ring: "ring-orange-400",
    bg: "bg-orange-500",
  },
  {
    score: 3,
    emoji: "😐",
    label: "Okay",
    ring: "ring-amber-400",
    bg: "bg-amber-500",
  },
  {
    score: 4,
    emoji: "🙂",
    label: "Good",
    ring: "ring-lime-400",
    bg: "bg-lime-500",
  },
  {
    score: 5,
    emoji: "😊",
    label: "Happy",
    ring: "ring-emerald-400",
    bg: "bg-emerald-500",
  },
  {
    score: 6,
    emoji: "😄",
    label: "Great",
    ring: "ring-teal-400",
    bg: "bg-teal-500",
  },
];

// ─── SessionStorage helpers (defensive) ───────────────────────
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

function ssRemove(key: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(key);
  } catch {}
}

// ─── Main Component ───────────────────────────────────────────
export default function DashboardPanel() {
  const user = useUserContext();
  const userId = user?.id;
  const {
    setActivePanel,
    showPendingRequestPopup,
    setShowPendingRequestPopup,
  } = useDashboard();

  // Persisted UI state (sessionStorage-backed)
  const [tipIndex, setTipIndex] = useState<number>(() => {
    const v = ssGet("dashboard:tipIndex");
    return v ? Number(v) : 0;
  });
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(
    () => ssGet("dashboard:expandedSession"),
  );
  const [showLogsMobile, setShowLogsMobile] = useState<boolean>(() => {
    return ssGet("dashboard:showLogs") === "true";
  });

  // Mood state (ephemeral — not persisted across sessions)
  const [moodValue, setMoodValue] = useState(4);
  const [moodComment, setMoodComment] = useState("");
  const [moodSubmitting, setMoodSubmitting] = useState(false);
  const [moodSaved, setMoodSaved] = useState(false);

  const { markAsRead } = useNotifications();

  // Persist UI state changes
  useEffect(() => {
    if (expandedSessionId)
      ssSet("dashboard:expandedSession", expandedSessionId);
    else ssRemove("dashboard:expandedSession");
  }, [expandedSessionId]);

  useEffect(() => {
    ssSet("dashboard:showLogs", String(showLogsMobile));
  }, [showLogsMobile]);

  useEffect(() => {
    ssSet("dashboard:tipIndex", String(tipIndex));
  }, [tipIndex]);

  // ─── Active session ─────────────────────────────────────────
  const { sessions: allSessions } = useActiveSession(userId);
  const activeSession = allSessions.length > 0 ? allSessions[0] : null;

  // ─── Session history ────────────────────────────────────────
  const { sessions: sessionHistory, loading: historyLoading } =
    useSessionHistory(userId);

  // ─── Dashboard data (warm cache, no refetch on focus) ──────
  const { data: dashboardData, isLoading: dataLoading } = useSWR(
    userId ? "/api/dashboard/summary" : null,
    authFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60_000,
      keepPreviousData: true,
      revalidateIfStale: false,
    },
  );

  const notifications: any[] = dashboardData?.data?.notifications ?? [];
  const healthRecords = dashboardData?.data?.healthRecords ?? {};

  const displayStats = {
    heartRate: healthRecords.heartRate || "—",
    bloodPressure: healthRecords.bloodPressure || "—",
    steps: healthRecords.steps || "—",
    weight: healthRecords.weight || "—",
  };

  const recentEntries = healthRecords.recentEntries || [];

  const healthTips = useMemo(() => {
    if (notifications.length === 0) {
      return [
        "Drinking water regularly throughout the day is the simplest way to boost your daily energy.",
        "Logging your readings consistently helps us provide clear trends about your health journey.",
      ];
    }
    return notifications.map((n: any) => n.message).slice(0, 5);
  }, [notifications]);

  // ─── Mood fetch ─────────────────────────────────────────────
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);
  const { data: moodData, mutate: mutateMood } = useSWR(
    userId ? `/api/mood-records` : null,
    authFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60_000,
      keepPreviousData: true,
      revalidateIfStale: false,
    },
  );
  const todayMood = useMemo(
    () => (moodData?.data || []).find((m: any) => m.date === today),
    [moodData, today],
  );

  useEffect(() => {
    if (todayMood) {
      setMoodValue(todayMood.moodScore);
      setMoodComment(todayMood.comment || "");
      setMoodSaved(true);
    }
  }, [todayMood]);

  const handleSaveMood = async (): Promise<boolean> => {
    if (!userId) return false;
    setMoodSubmitting(true);
    try {
      const res = await fetch("/api/mood-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          date: today,
          moodScore: moodValue,
          comment: moodComment.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMoodSaved(true);
        mutateMood();
        return true;
      }
      alert("Could not save your mood. Please try again.");
      return false;
    } catch (e) {
      console.error("Mood save failed", e);
      alert("Network error. Please try again.");
      return false;
    } finally {
      setMoodSubmitting(false);
    }
  };

  const handleChatWithMedic = async () => {
    if (!userId) return;
    try {
      await fetch("/api/mood-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          date: today,
          moodScore: moodValue,
          comment: moodComment.trim(),
          talkedToMedic: true,
        }),
      });
      mutateMood();
    } catch (e) {
      console.error("Failed to mark talkedToMedic:", e);
    }
    setActivePanel("doza-therapist");
  };

  const handleCancelEdit = () => {
    if (todayMood) {
      setMoodValue(todayMood.moodScore);
      setMoodComment(todayMood.comment || "");
    }
  };

  // ─── Pending link requests ─────────────────────────────────
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

  // ─── Scroll restoration ────────────────────────────────────
  const scrollerRef = useRef<HTMLElement | null>(null);
  const scrollRestoredRef = useRef(false);

  useEffect(() => {
    const el =
      (document.getElementById("dashboard-scroll") as HTMLElement | null) ||
      (document.querySelector("main") as HTMLElement | null);
    scrollerRef.current = el;
    if (!el) return;

    if (!scrollRestoredRef.current) {
      const saved = ssGet("dashboard:scroll");
      if (saved) el.scrollTo({ top: Number(saved), behavior: "instant" });
      scrollRestoredRef.current = true;
    }

    const onScroll = () => ssSet("dashboard:scroll", String(el.scrollTop));
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // ─── Loading gate — only on truly cold start ──────────────
  if (!user) return <LoadingState />;
  if (dataLoading && !dashboardData) return <LoadingState />;

  // ─── Render ─────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn("min-h-screen bg-[#F8FAFC] pb-28 pt-2", poppins.className)}
    >
      {/* Active Session Banner */}
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
          </div>
          <button
            onClick={() => setActivePanel("doza-panel")}
            className="bg-white/15 hover:bg-white/25 active:scale-95 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 backdrop-blur-xs min-h-9"
          >
            View Details
          </button>
        </motion.div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 space-y-4 lg:space-y-6">
        {/* Page heading */}
        <header className="pt-1 lg:pt-2">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight leading-tight">
            Dashboard Overview
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </header>

        {/* Badges row */}
        <div className="flex items-center gap-2 overflow-x-auto -mx-4 px-4 pb-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0 lg:flex-wrap scrollbar-none [&::-webkit-scrollbar]:hidden">
          <Chip
            icon={Calendar}
            label="Appointments"
            onClick={() => setActivePanel("appointment")}
          />
          <Chip
            icon={Pill}
            label="Medical Shop"
            onClick={() => setActivePanel("doza-medical-shop")}
          />
          <Chip
            icon={Dumbbell}
            label="Sport Shop"
            onClick={() => setActivePanel("doza-sport-shop")}
          />
        </div>

        {/* ─── Quick Actions — image cards ───────────────── */}
        <section className="space-y-3">
          <header className="flex items-end justify-between gap-3 px-1">
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Quick Actions
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Continue your health journey
              </p>
            </div>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <ActionImageCard
              image="https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=1200&q=80"
              title="Start Medication"
              category="Medication Tracker"
              icon={Pill}
              onClick={() => setActivePanel("medications")}
            />
            <ActionImageCard
              image="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=1200&q=80"
              title="Start Health Tracking"
              category="Health Tracker"
              icon={HeartPulse}
              onClick={() => setActivePanel("health-tracker")}
            />
          </div>
        </section>

        {/* ─── Bento grid ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
          {/* Moodboard */}
          <div className="lg:col-span-7 order-1">
            <MoodBoard
              moodValue={moodValue}
              moodComment={moodComment}
              submitting={moodSubmitting}
              saved={moodSaved}
              onMoodChange={setMoodValue}
              onCommentChange={setMoodComment}
              onSave={handleSaveMood}
              onViewHistory={() => setActivePanel("moodboard-history")}
              onChatWithMedic={handleChatWithMedic}
              onCancelEdit={handleCancelEdit}
            />
          </div>

          {/* Health Summary */}
          <BentoTile className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/70 shadow-2xs order-2 lg:order-4 lg:col-span-7">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2 tracking-tight">
                <TrendingUp className="text-emerald-500 shrink-0" size={18} />{" "}
                Your Health Summary
              </h3>
              <button
                onClick={() => setActivePanel("health-tracker")}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors min-h-9 px-2"
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

          {/* Active Session card */}
          {activeSession && (
            <BentoTile className="bg-white p-5 sm:p-6 rounded-2xl border-l-4 border-emerald-500 border border-slate-200/70 shadow-2xs order-3 lg:col-span-12">
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
                  className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition active:scale-95 shadow-2xs min-h-11"
                >
                  View Details
                </button>
              </div>
            </BentoTile>
          )}

          {/* Session History */}
          {!historyLoading && sessionHistory.length > 0 && (
            <BentoTile className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/70 shadow-2xs order-4 lg:order-6 lg:col-span-12">
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
                    const isExpanded = expandedSessionId === session.sessionId;
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
                          className="w-full flex items-center justify-between text-left group min-h-11"
                          aria-expanded={isExpanded}
                        >
                          <div className="min-w-0 pr-3">
                            <p className="font-semibold text-xs sm:text-sm text-slate-800 truncate group-hover:text-emerald-600 transition-colors">
                              {session.centerName}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                              <span>
                                {new Date(session.startTime).toLocaleDateString(
                                  undefined,
                                  { dateStyle: "medium" },
                                )}
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

          {/* Recent Logs */}
          <BentoTile className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/70 shadow-2xs order-5 lg:col-span-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2 tracking-tight">
                <ClipboardList
                  className="text-emerald-500 shrink-0"
                  size={18}
                />{" "}
                Recent Health Logs
              </h3>
              <button
                onClick={() => setShowLogsMobile(!showLogsMobile)}
                aria-expanded={showLogsMobile}
                aria-controls="recent-logs-body"
                className="lg:hidden inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors p-1 -m-1 min-h-9"
              >
                {showLogsMobile ? (
                  <>
                    Hide <ChevronUp className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Show <ChevronDown className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
            <div
              id="recent-logs-body"
              className={cn(
                "space-y-3",
                showLogsMobile ? "block" : "hidden lg:block",
              )}
            >
              {recentEntries.slice(0, 2).map((entry: any, idx: number) => (
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
                  No logs recorded yet. Use the tool above to add your metrics.
                </p>
              )}
            </div>
          </BentoTile>

          {/* Health Tips */}
          <div className="bg-emerald-600 rounded-2xl p-6 text-white relative overflow-hidden min-h-[180px] shadow-sm order-6 lg:order-2 lg:col-span-5">
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
                    "{healthTips[tipIndex] ?? healthTips[0]}"
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
                  className="p-2 bg-white/15 rounded-xl text-white hover:bg-white/25 active:scale-95 transition-all backdrop-blur-xs min-h-10 min-w-10 inline-flex items-center justify-center"
                  aria-label="Previous tip"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() =>
                    setTipIndex((p) => (p + 1) % healthTips.length)
                  }
                  className="p-2 bg-white/15 rounded-xl text-white hover:bg-white/25 active:scale-95 transition-all backdrop-blur-xs min-h-10 min-w-10 inline-flex items-center justify-center"
                  aria-label="Next tip"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Link Request Popup */}
      <AnimatePresence>
        {showPendingRequestPopup && activeRequest && userId && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-4 right-4 left-4 sm:left-auto sm:top-4 sm:bottom-auto z-50 w-auto sm:max-w-md"
          >
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden">
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
                  className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors min-h-9 min-w-9 inline-flex items-center justify-center"
                  aria-label="Dismiss"
                >
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>

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
                    className="mt-3 text-xs text-emerald-600 font-semibold flex items-center gap-1.5 mx-auto hover:underline transition-colors min-h-9 px-2"
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
    </motion.div>
  );
}

// ─── Subcomponents ───────────────────────────────────────────

function Chip({
  icon: Icon,
  label,
  onClick,
}: {
  icon: any;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="min-h-11 inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 rounded-full text-xs font-semibold text-slate-700 whitespace-nowrap shrink-0 hover:bg-slate-50 hover:border-slate-300 active:scale-[0.97] transition-all shadow-2xs"
    >
      <Icon size={14} className="text-slate-500 shrink-0" />
      <span>{label}</span>
    </button>
  );
}

// ─── Quick Action Image Card ─────────────────────────────
function ActionImageCard({
  image,
  title,
  category,
  icon: Icon,
  onClick,
}: {
  image: string;
  title: string;
  category: string;
  icon: any;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative w-full overflow-hidden rounded-3xl text-left",
        // Mobile: tall immersive card. Desktop: banner-style.
        "min-h-[30vh] sm:min-h-[220px] md:min-h-[260px]",
        "ring-1 ring-slate-200/80 hover:ring-emerald-400",
        "shadow-md hover:shadow-xl transition-all duration-300",
        "active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-emerald-500",
      )}
    >
      <img
        src={image}
        alt={title}
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/40 to-slate-950/15" />

      {/* Top-left category chip */}
      <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-md border border-white/25 rounded-full px-2.5 py-1">
        <Icon size={12} className="text-white" />
        <span className="text-[10px] font-bold text-white uppercase tracking-wider">
          {category}
        </span>
      </div>

      {/* Bottom content */}
      <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white leading-tight drop-shadow-sm">
            {title}
          </h3>
        </div>
        <span className="shrink-0 inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/20 backdrop-blur-md border border-white/30 group-hover:bg-emerald-500 group-hover:border-emerald-500 transition-colors">
          <ChevronRight size={16} className="text-white" />
        </span>
      </div>
    </button>
  );
}

// ─── MoodBoard (done state + edit state) ─────────────────
function MoodBoard({
  moodValue,
  moodComment,
  submitting,
  saved,
  onMoodChange,
  onCommentChange,
  onSave,
  onViewHistory,
  onChatWithMedic,
  onCancelEdit,
}: {
  moodValue: number;
  moodComment: string;
  submitting: boolean;
  saved: boolean;
  onMoodChange: (v: number) => void;
  onCommentChange: (v: string) => void;
  onSave: () => Promise<boolean> | void;
  onViewHistory: () => void;
  onChatWithMedic: () => void;
  onCancelEdit: () => void;
}) {
  const [showComment, setShowComment] = useState(moodComment.length > 0);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (moodComment.length > 0) setShowComment(true);
  }, [moodComment]);

  useEffect(() => {
    if (!saved) setIsEditing(false);
  }, [saved]);

  const currentMood = MOODS[moodValue - 1] ?? MOODS[3];

  const handleSaveClick = async () => {
    const ok = await onSave();
    if (ok === true || ok === undefined) setIsEditing(false);
  };

  const handleCancelClick = () => {
    onCancelEdit();
    setIsEditing(false);
  };

  // ─────────────────────────────────────────────────────────
  // DONE STATE — mood already logged for today, not editing
  // ─────────────────────────────────────────────────────────
  if (saved && !isEditing) {
    return (
      <section
        className="relative bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-3xl p-5 sm:p-6 text-white overflow-hidden shadow-lg h-full"
        aria-label="Moodboard — logged"
      >
        <div
          className="absolute -right-20 -top-20 w-56 h-56 rounded-full bg-white/10 blur-3xl pointer-events-none"
          aria-hidden
        />
        <div
          className="absolute -left-20 -bottom-20 w-56 h-56 rounded-full bg-emerald-400/20 blur-3xl pointer-events-none"
          aria-hidden
        />

        <div className="relative flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Check
                size={16}
                className="text-emerald-200 shrink-0"
                strokeWidth={3}
              />
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-100 truncate">
                Moodboard
              </span>
            </div>
            <button
              onClick={onViewHistory}
              className="inline-flex items-center gap-0.5 min-h-9 px-2.5 bg-white/10 hover:bg-white/20 rounded-full text-[10px] font-bold uppercase tracking-wider text-emerald-50 border border-white/10 transition-colors shrink-0"
              aria-label="View mood history"
            >
              History <ChevronRight size={10} />
            </button>
          </div>

          {/* Done body */}
          <div className="flex flex-col items-center text-center flex-1 justify-center py-2">
            <div className="w-16 h-16 rounded-full bg-white/15 border-2 border-white/30 flex items-center justify-center mb-3">
              <Check size={32} className="text-white" strokeWidth={3} />
            </div>

            <h2 className="text-xl font-bold tracking-tight mb-1">
              Mood logged for today!
            </h2>
            <p className="text-xs text-emerald-100/80 mb-5">
              Nice work checking in with yourself.
            </p>

            {/* Today's mood summary */}
            <div className="w-full flex items-center gap-3 bg-white/10 rounded-2xl px-4 py-3 mb-5 border border-white/15">
              <span className="text-4xl leading-none shrink-0" aria-hidden>
                {currentMood.emoji}
              </span>
              <div className="text-left min-w-0 flex-1">
                <p className="text-sm font-bold text-white">
                  {currentMood.label}
                </p>
                {moodComment ? (
                  <p className="text-xs text-emerald-100/80 line-clamp-2 italic">
                    "{moodComment}"
                  </p>
                ) : (
                  <p className="text-xs text-emerald-100/60 italic">No note</p>
                )}
              </div>
              <span className="text-[10px] font-bold text-emerald-100/70 uppercase tracking-wider shrink-0">
                {moodValue}/6
              </span>
            </div>

            {/* Chat CTA */}
            <button
              onClick={onChatWithMedic}
              className="w-full min-h-12 inline-flex items-center justify-center gap-2 rounded-xl font-bold text-sm bg-white text-emerald-700 hover:bg-emerald-50 shadow-lg active:scale-[0.98] transition-all"
            >
              <MessageCircle size={16} />
              Chat with a Doza Medic
            </button>

            {/* Update link */}
            <button
              onClick={() => setIsEditing(true)}
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-emerald-100/80 hover:text-white transition-colors min-h-9 px-2 rounded-lg"
            >
              <Edit3 size={12} />
              Update today's mood
            </button>
          </div>
        </div>
      </section>
    );
  }

  // ─────────────────────────────────────────────────────────
  // FORM STATE — first save or actively editing
  // ─────────────────────────────────────────────────────────
  return (
    <section
      className="relative bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-3xl p-5 sm:p-6 text-white overflow-hidden shadow-lg h-full"
      aria-label="Moodboard"
    >
      <div
        className="absolute -right-20 -top-20 w-56 h-56 rounded-full bg-white/10 blur-3xl pointer-events-none"
        aria-hidden
      />
      <div
        className="absolute -left-20 -bottom-20 w-56 h-56 rounded-full bg-emerald-400/20 blur-3xl pointer-events-none"
        aria-hidden
      />

      <div className="relative flex flex-col h-full">
        <div className="flex items-center justify-between mb-4 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Smile size={16} className="text-emerald-200 shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-100 truncate">
              Moodboard
            </span>
            {saved && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/15 rounded-full text-[10px] font-bold uppercase tracking-wider text-emerald-50 border border-white/10 shrink-0">
                <Check size={10} strokeWidth={3} /> Editing
              </span>
            )}
          </div>
          <button
            onClick={onViewHistory}
            className="inline-flex items-center gap-0.5 min-h-9 px-2.5 bg-white/10 hover:bg-white/20 rounded-full text-[10px] font-bold uppercase tracking-wider text-emerald-50 border border-white/10 transition-colors shrink-0"
            aria-label="View mood history"
          >
            History <ChevronRight size={10} />
          </button>
        </div>

        <div className="flex flex-col items-center text-center mb-5">
          <div className="relative mb-2 h-24 w-24 flex items-center justify-center">
            <div
              className={cn(
                "absolute inset-0 rounded-full blur-2xl opacity-70 transition-colors duration-500",
                currentMood.bg,
              )}
              aria-hidden
            />
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={moodValue}
                initial={{ scale: 0.6, opacity: 0, rotate: -8 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                exit={{ scale: 0.6, opacity: 0, rotate: 8 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                className="relative text-7xl leading-none select-none"
                aria-hidden
              >
                {currentMood.emoji}
              </motion.div>
            </AnimatePresence>
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={moodValue}
              initial={{ y: 4, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -4, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="text-xl font-bold tracking-tight"
            >
              {currentMood.label}
            </motion.p>
          </AnimatePresence>
          <p className="text-xs text-emerald-100/80 mt-1">
            How are you feeling right now?
          </p>
        </div>

        <div
          className="grid grid-cols-6 gap-1.5 mb-4"
          role="radiogroup"
          aria-label="Mood score"
        >
          {MOODS.map((mood) => {
            const active = mood.score === moodValue;
            return (
              <button
                key={mood.score}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={mood.label}
                onClick={() => onMoodChange(mood.score)}
                className={cn(
                  "relative aspect-square min-h-12 rounded-xl flex items-center justify-center text-2xl transition-all duration-200 active:scale-90",
                  active
                    ? cn(
                        "bg-white ring-2 scale-105 shadow-lg shadow-black/10",
                        mood.ring,
                      )
                    : "bg-white/10 hover:bg-white/20",
                )}
              >
                <span
                  className={cn(
                    "transition-all",
                    active
                      ? "grayscale-0 opacity-100"
                      : "grayscale-[40%] opacity-80",
                  )}
                >
                  {mood.emoji}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mb-3">
          {!showComment ? (
            <button
              type="button"
              onClick={() => setShowComment(true)}
              className="w-full min-h-10 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-100 hover:text-white transition-colors rounded-lg"
            >
              <Plus size={14} /> Add a note
            </button>
          ) : (
            <div className="space-y-2">
              <textarea
                value={moodComment}
                onChange={(e) => onCommentChange(e.target.value)}
                placeholder="What's on your mind?"
                rows={2}
                autoFocus
                className="w-full resize-none px-3 py-2.5 bg-white/10 border border-white/20 rounded-xl text-sm text-white placeholder:text-emerald-100/60 focus:bg-white/15 focus:border-white/40 focus:ring-2 focus:ring-white/20 outline-none transition"
              />
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    onCommentChange("");
                    setShowComment(false);
                  }}
                  className="text-[10px] font-semibold uppercase tracking-wider text-emerald-100/70 hover:text-white transition-colors min-h-8 px-1"
                >
                  Remove note
                </button>
                <span className="text-[10px] font-medium text-emerald-100/60">
                  {moodComment.length}/500
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="mt-auto space-y-2">
          <button
            onClick={handleSaveClick}
            disabled={submitting}
            className="w-full min-h-12 inline-flex items-center justify-center gap-2 rounded-xl font-bold text-sm bg-white text-emerald-700 hover:bg-emerald-50 shadow-lg active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Saving…
              </>
            ) : saved ? (
              <>
                <Check size={16} /> Save changes
              </>
            ) : (
              <>
                <Check size={16} /> Save today's mood
              </>
            )}
          </button>

          {saved && (
            <button
              onClick={handleCancelClick}
              className="w-full text-[10px] font-semibold uppercase tracking-wider text-emerald-100/70 hover:text-white transition-colors min-h-8"
            >
              Cancel editing
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── StatCard + LiveBioChart ─────────────────────────────────
function StatCard({ icon: Icon, label, val, unit, color, bg, hasChart }: any) {
  return (
    <div className="p-4 rounded-[22px] bg-slate-50/50 border border-slate-100 flex flex-col group active:scale-95 transition-all">
      <div className={cn("p-2 rounded-lg w-fit mb-3", bg)}>
        <Icon size={16} className={color} />
      </div>
      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-0.5">
        {label}
      </span>
      <div className="flex items-baseline gap-0.5">
        <span className="text-lg font-black text-slate-900 tracking-tighter">
          {val}
        </span>
        <span className="text-[10px] font-bold text-slate-400 uppercase ml-0.5">
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
        "rounded-[24px] border border-slate-100 shadow-sm transition-all h-full",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}

// ─── Loading State (cold start only) ────────────────────────
function LoadingState() {
  const PulseItem = ({ className }: { className: string }) => (
    <div
      className={cn("animate-pulse bg-slate-200/80 rounded-xl", className)}
    />
  );

  return (
    <div
      className={cn("min-h-screen bg-[#F8FAFC] pb-24 pt-2", poppins.className)}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 lg:space-y-6 pt-3">
        <div className="space-y-2">
          <PulseItem className="h-8 w-56 lg:h-10 lg:w-72" />
          <PulseItem className="h-3 w-40" />
        </div>

        <div className="flex gap-2">
          <PulseItem className="h-11 w-32 rounded-full" />
          <PulseItem className="h-11 w-32 rounded-full" />
          <PulseItem className="h-11 w-28 rounded-full" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
          <div className="lg:col-span-7">
            <div className="bg-gradient-to-br from-emerald-600/90 to-emerald-700/90 rounded-3xl p-5 space-y-4">
              <div className="flex justify-between items-center">
                <PulseItem className="h-3 w-24 bg-emerald-500/50" />
                <PulseItem className="h-5 w-20 bg-emerald-500/50 rounded-full" />
              </div>
              <div className="flex flex-col items-center gap-2 py-2">
                <PulseItem className="h-24 w-24 rounded-full bg-emerald-500/50" />
                <PulseItem className="h-4 w-24 bg-emerald-500/50" />
              </div>
              <div className="grid grid-cols-6 gap-1.5">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <PulseItem
                    key={i}
                    className="aspect-square min-h-12 bg-emerald-500/50"
                  />
                ))}
              </div>
              <PulseItem className="h-12 w-full bg-emerald-500/50" />
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="bg-emerald-600/90 rounded-2xl p-6 h-full min-h-[220px]">
              <PulseItem className="h-3 w-24 bg-emerald-500/50 mb-4" />
              <PulseItem className="h-3 w-full bg-emerald-500/50 mb-2" />
              <PulseItem className="h-3 w-5/6 bg-emerald-500/50" />
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-5">
              <div className="flex justify-between items-center">
                <PulseItem className="h-5 w-44" />
                <PulseItem className="h-3 w-24" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
          </div>

          <div className="lg:col-span-5">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3 h-full">
              <PulseItem className="h-5 w-36 mb-2" />
              {[1, 2].map((i) => (
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
        </div>
      </div>
    </div>
  );
}
