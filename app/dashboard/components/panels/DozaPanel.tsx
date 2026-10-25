// app/dashboard/panels/DozaPanel.tsx

"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  History,
  Link2,
  Clock,
  ChevronDown,
  Building,
  Calendar,
  Pill,
  Microscope,
  FileText,
  Loader2,
  HeartPulse,
  RefreshCw,
  Star,
  X,
  BarChart3,
  LineChart,
  PieChart,
  ClipboardCheck,
  Bell,
  Syringe,
  FileCheck,
  Edit3,
  Send,
  TestTube,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { useUserContext } from "../../UserContext";
import { useActiveSession } from "../../hooks/useSession";
import { useSessionHistory } from "@/app/dashboard/hooks/useSessionHistory";
import { useLinkedCenters } from "@/app/dashboard/hooks/useLinkedCenters";
import { mutate } from "swr";
import { cn } from "@/app/utils/utils";
import { poppins } from "@/app/constants";
import { useDashboard } from "../../DashboardContext";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { Line, Bar, Pie } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
);

// ─── sessionStorage helpers ──────────────────────────────
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

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2";

// ─── Types ────────────────────────────────────────────────
interface LinkedCenter {
  centerId: string;
  linkedAt: number;
  status: string;
  centerName: string;
  centerType: string;
}

interface SessionSummary {
  sessionId: string;
  centerId: string;
  centerName: string;
  startTime: number;
  endTime?: number;
  status: string;
  rating?: number;
  comment?: string;
}

interface PatientClinicalData {
  id: string;
  fullName: string;
  centerName?: string;
  vitals?: Record<string, any>;
  vitalsHistory?: Array<Record<string, any>>;
  prescriptions?: Array<{
    medication: string;
    dosage: string;
    frequency: string;
    route: string;
    duration: string;
    instructions: string;
    prescribedBy: string;
    prescribedAt: string;
    dispensed: boolean;
    dispensedStatus?: string;
    followUpDate?: string;
    source?: "hospital" | "external";
  }>;
  doctorNotes?: Array<{
    authorName: string;
    timestamp: string;
    content: string;
  }>;
  tests?: Array<{
    testType: string;
    status: string;
    result?: { value: string; unit: string };
    collectionDate?: string;
  }>;
  followUpAppointments?: Array<{
    id: string;
    date: string;
    time: string;
    reason?: string;
    notes?: string;
    status?: string;
  }>;
  takeHomeMedications?: Array<{
    medication: string;
    dosage: string;
    frequency: string;
    instructions?: string;
    dispensedAt?: string;
    source?: string;
  }>;
  dischargeSummary?: string;
  dischargeDate?: string;
}

// ─── Helpers ──────────────────────────────────────────────
const formatDuration = (start: number, end?: number): string => {
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

const formatDate = (ts: number) => new Date(ts).toLocaleString();
const formatDateShort = (ts: string) => new Date(ts).toLocaleDateString();

const VitalsDisplay = ({ vitals }: { vitals?: Record<string, any> }) => {
  if (!vitals || Object.keys(vitals).length === 0) {
    return <p className="text-sm text-slate-500">No vitals recorded.</p>;
  }
  const fields = [
    { key: "bloodPressureSystolic", label: "Systolic", unit: "mmHg" },
    { key: "bloodPressureDiastolic", label: "Diastolic", unit: "mmHg" },
    { key: "heartRate", label: "Heart Rate", unit: "bpm" },
    { key: "temperature", label: "Temperature", unit: "°C" },
    { key: "oxygenSaturation", label: "O₂ Sat", unit: "%" },
    { key: "respiratoryRate", label: "Resp. Rate", unit: "/min" },
    { key: "bloodSugar", label: "Blood Sugar", unit: "mg/dL" },
    { key: "weight", label: "Weight", unit: "kg" },
    { key: "height", label: "Height", unit: "cm" },
    { key: "bmi", label: "BMI", unit: "" },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
      {fields.map((field) => {
        const val = vitals[field.key];
        if (val === undefined || val === null) return null;
        return (
          <div
            key={field.key}
            className="bg-white rounded-lg p-2.5 border border-slate-200"
          >
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
              {field.label}
            </p>
            <p className="text-base font-bold text-slate-800 leading-tight">
              {val}
              {field.unit && (
                <span className="text-[10px] font-normal text-slate-500 ml-1">
                  {field.unit}
                </span>
              )}
            </p>
          </div>
        );
      })}
    </div>
  );
};

// ─── Skeletons ────────────────────────────────────────────
const Skeleton = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("animate-pulse bg-slate-200 rounded-lg", className)}
    {...props}
  />
);

const SkeletonSessionCard = () => (
  <div className="rounded-2xl bg-white border border-slate-200 p-4">
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-start gap-3 flex-1">
        <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-6 w-14 rounded-full" />
    </div>
    <Skeleton className="h-8 w-full rounded-lg mb-3" />
    <Skeleton className="h-10 w-full rounded-xl" />
  </div>
);

const SkeletonRequestRow = () => (
  <div className="p-4 flex items-start gap-3">
    <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-16 rounded-full" />
      </div>
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-3 w-40" />
    </div>
  </div>
);

// ─── Session Rating ──────────────────────────────────────
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
    <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
          <Star className="w-3 h-3 text-amber-500 fill-current" />
          Session Feedback
        </span>
        {rating > 0 && !showComment && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
            {rating}/5
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 bg-white p-1.5 rounded-lg border border-slate-200 w-fit">
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
            className={cn(
              "p-1 rounded-md hover:bg-amber-50 transition-colors min-h-8 min-w-8 inline-flex items-center justify-center",
              FOCUS,
            )}
            aria-label={`${star} star${star > 1 ? "s" : ""}`}
          >
            <Star
              size={20}
              className={cn(
                "transition-all duration-150",
                (hover || rating) >= star
                  ? "text-amber-500 fill-amber-400"
                  : "text-slate-300 fill-slate-100",
              )}
            />
          </button>
        ))}
      </div>

      {showComment && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-2 pt-1 overflow-hidden"
        >
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Tell us about your experience (optional)…"
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none transition resize-none"
            rows={2}
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowComment(false)}
              className="min-h-9 px-3 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className={cn(
                "flex items-center gap-1.5 min-h-9 px-3.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition disabled:opacity-50",
                FOCUS,
              )}
            >
              {submitting ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Send className="w-3 h-3" />
              )}
              Submit
            </button>
          </div>
        </motion.div>
      )}

      {initialRating > 0 && !showComment && (
        <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] gap-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className="font-semibold text-slate-700 shrink-0">
              Reviewed:
            </span>
            {initialComment ? (
              <span className="text-slate-500 italic truncate">
                "{initialComment}"
              </span>
            ) : (
              <span className="text-slate-400">No comment</span>
            )}
          </div>
          <button
            onClick={() => setShowComment(true)}
            className={cn(
              "text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 shrink-0 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200 transition min-h-7",
              FOCUS,
            )}
          >
            <Edit3 className="w-2.5 h-2.5" /> Edit
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────
export default function DozaPanel() {
  const user = useUserContext();
  const userId = user?.id;
  const { setActivePanel } = useDashboard();

  const { sessions: activeSessions, loading: sessionLoading } =
    useActiveSession(userId);
  const { sessions: initialHistory, loading: historyLoading } =
    useSessionHistory(userId);
  const { centers: linkedCenters, loading: centersLoading } =
    useLinkedCenters(userId);

  // ─── Persisted state ─────────────────────────────────
  const [activeTab, setActiveTab] = useState<
    "ongoing" | "history" | "centers" | "requests"
  >(() => {
    const v = ssGet("doza:activeTab");
    if (
      v === "ongoing" ||
      v === "history" ||
      v === "centers" ||
      v === "requests"
    ) {
      return v;
    }
    return "ongoing";
  });
  useEffect(() => {
    ssSet("doza:activeTab", activeTab);
  }, [activeTab]);

  const [historyFilter, setHistoryFilter] = useState<"active" | "history">(
    () => {
      const v = ssGet("doza:historyFilter");
      return v === "history" ? "history" : "active";
    },
  );
  useEffect(() => {
    ssSet("doza:historyFilter", historyFilter);
  }, [historyFilter]);

  const [expandedId, setExpandedId] = useState<string | null>(() =>
    ssGet("doza:expandedId"),
  );
  useEffect(() => {
    if (expandedId) ssSet("doza:expandedId", expandedId);
    else ssRemove("doza:expandedId");
  }, [expandedId]);

  const [chartType, setChartType] = useState<"line" | "bar" | "pie">(() => {
    const v = ssGet("doza:chartType");
    if (v === "line" || v === "bar" || v === "pie") return v;
    return "line";
  });
  useEffect(() => {
    ssSet("doza:chartType", chartType);
  }, [chartType]);

  const [selectedVitalKeys, setSelectedVitalKeys] = useState<string[]>(() => {
    const v = ssGet("doza:selectedVitalKeys");
    if (v) {
      try {
        const parsed = JSON.parse(v);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    return ["heartRate"];
  });
  useEffect(() => {
    ssSet("doza:selectedVitalKeys", JSON.stringify(selectedVitalKeys));
  }, [selectedVitalKeys]);

  // ─── Ephemeral state ─────────────────────────────────
  const [history, setHistory] = useState<SessionSummary[]>([]);
  const [clinicalDataMap, setClinicalDataMap] = useState<
    Record<string, PatientClinicalData>
  >({});
  const [loadingClinical, setLoadingClinical] = useState<
    Record<string, boolean>
  >({});
  const [clinicalError, setClinicalError] = useState<Record<string, string>>(
    {},
  );
  const [showVitalsHistory, setShowVitalsHistory] = useState(false);
  const [vitalsHistoryData, setVitalsHistoryData] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [userRequests, setUserRequests] = useState<any[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);

  // ─── Requests fetcher ─────────────────────────────────
  // Dedupe concurrent calls + silent subsequent refetches so the
  // list never flickers after the first load.
  const inflightRef = useRef(false);
  const fetchedOnceRef = useRef(false);

  const fetchUserRequests = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!userId || inflightRef.current) return;
      inflightRef.current = true;
      const silent = opts?.silent ?? fetchedOnceRef.current;
      if (!silent) setRequestsLoading(true);
      try {
        const res = await fetch(`/api/user/doza-requests`, {
          headers: { "x-user-id": userId },
        });
        if (res.ok) {
          const json = await res.json();
          setUserRequests(json.data || []);
        }
      } catch (err) {
        console.error("Failed to fetch user requests", err);
      } finally {
        inflightRef.current = false;
        if (!silent) setRequestsLoading(false);
        fetchedOnceRef.current = true;
      }
    },
    [userId],
  );

  // Initial fetch — populates the badge count regardless of tab
  useEffect(() => {
    if (userId) fetchUserRequests();
  }, [userId, fetchUserRequests]);

  // Silent refetch when user enters the requests tab
  useEffect(() => {
    if (activeTab === "requests" && userId) {
      fetchUserRequests({ silent: true });
    }
  }, [activeTab, userId, fetchUserRequests]);

  // Poll only while the requests tab is open
  useEffect(() => {
    if (activeTab !== "requests" || !userId) return;
    const interval = setInterval(
      () => fetchUserRequests({ silent: true }),
      30000,
    );
    return () => clearInterval(interval);
  }, [activeTab, userId, fetchUserRequests]);

  // External event from elsewhere in the app
  useEffect(() => {
    if (!userId) return;
    const handler = () => fetchUserRequests({ silent: true });
    window.addEventListener("doza-request-created", handler);
    return () => window.removeEventListener("doza-request-created", handler);
  }, [userId, fetchUserRequests]);

  // ─── Sync history from hook ──────────────────────────
  const prevInitialHistoryRef = useRef<SessionSummary[]>([]);
  useEffect(() => {
    if (
      JSON.stringify(initialHistory) !==
      JSON.stringify(prevInitialHistoryRef.current)
    ) {
      const uniqueMap = new Map<string, SessionSummary>();
      for (const session of initialHistory) {
        uniqueMap.set(session.sessionId, session);
      }
      const uniqueHistory = Array.from(uniqueMap.values());
      prevInitialHistoryRef.current = uniqueHistory;
      setHistory(uniqueHistory);
    }
  }, [initialHistory]);

  // ─── Scroll restoration ──────────────────────────────
  const scrollRestoredRef = useRef(false);
  useEffect(() => {
    const el =
      (document.getElementById("dashboard-scroll") as HTMLElement | null) ||
      (document.querySelector("main") as HTMLElement | null);
    if (!el) return;

    if (!scrollRestoredRef.current) {
      const saved = ssGet("doza:scroll");
      el.scrollTo({ top: saved ? Number(saved) : 0, behavior: "instant" });
      scrollRestoredRef.current = true;
    }

    const onScroll = () => ssSet("doza:scroll", String(el.scrollTop));
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // ─── Vitals fields ───────────────────────────────────
  const vitalFields =
    vitalsHistoryData.length > 0
      ? Object.keys(vitalsHistoryData[0]).filter(
          (k) => !["timestamp", "recordedBy", "recordedById"].includes(k),
        )
      : [];

  const toggleVitalKey = (key: string) => {
    setSelectedVitalKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const chartColors = [
    "#059669",
    "#10b981",
    "#34d399",
    "#047857",
    "#065f46",
    "#6ee7b7",
  ];

  const chartData = {
    labels: vitalsHistoryData.map((r) =>
      new Date(r.timestamp).toLocaleString(),
    ),
    datasets: selectedVitalKeys.map((key, idx) => ({
      label: key.replace(/([A-Z])/g, " $1").trim(),
      data: vitalsHistoryData.map((r) =>
        r[key] !== undefined ? r[key] : null,
      ),
      borderColor: chartColors[idx % chartColors.length],
      backgroundColor: chartColors[idx % chartColors.length] + "22",
      borderWidth: 2,
      pointRadius: 3,
      pointBackgroundColor: chartColors[idx % chartColors.length],
      tension: 0.3,
      spanGaps: true,
    })),
  };

  const pieChartData = {
    labels: vitalFields.map((f) => f.replace(/([A-Z])/g, " $1").trim()),
    datasets: [
      {
        data: vitalFields.map((field) => {
          const values = vitalsHistoryData
            .map((r) => r[field])
            .filter((v) => v !== null && v !== undefined);
          return values.length > 0
            ? values.reduce((a: number, b: number) => a + b, 0) / values.length
            : 0;
        }),
        backgroundColor: [
          "rgba(5, 150, 105, 0.8)",
          "rgba(16, 185, 129, 0.8)",
          "rgba(52, 211, 153, 0.8)",
          "rgba(4, 120, 87, 0.8)",
          "rgba(6, 78, 59, 0.8)",
          "rgba(110, 231, 183, 0.8)",
          "rgba(209, 250, 229, 0.8)",
          "rgba(5, 150, 105, 0.6)",
          "rgba(16, 185, 129, 0.6)",
          "rgba(52, 211, 153, 0.6)",
        ],
      },
    ],
  };

  // ─── Refresh ─────────────────────────────────────────
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await mutate(`/api/user/${userId}/sessions`);
      await mutate(`/api/user/${userId}/linked-centers`);
      setClinicalDataMap({});
      setExpandedId(null);
      setClinicalError({});
      fetchUserRequests({ silent: true });
    } finally {
      setIsRefreshing(false);
    }
  };

  // ─── Clinical data ───────────────────────────────────
  const fetchClinicalData = async (
    centerId: string,
    patientId: string,
    key: string,
  ) => {
    if (clinicalDataMap[key]) return;
    setLoadingClinical((prev) => ({ ...prev, [key]: true }));
    setClinicalError((prev) => ({ ...prev, [key]: "" }));
    try {
      const res = await fetch(
        `/api/centers/${centerId}/patients/${patientId}`,
        {
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        },
      );
      if (!res.ok) {
        if (res.status === 404) {
          setClinicalError((prev) => ({
            ...prev,
            [key]: "Clinical data not available for this session.",
          }));
          return;
        }
        const text = await res.text();
        throw new Error(
          `HTTP ${res.status}: ${text.substring(0, 100)}${
            text.length > 100 ? "…" : ""
          }`,
        );
      }
      const data = await res.json();
      if (data.success) {
        setClinicalDataMap((prev) => ({ ...prev, [key]: data.data }));
      } else {
        throw new Error(data.error || "Failed to fetch patient data");
      }
    } catch (err: any) {
      console.error("Failed to fetch clinical data", err);
      setClinicalError((prev) => ({ ...prev, [key]: err.message }));
    } finally {
      setLoadingClinical((prev) => ({ ...prev, [key]: false }));
    }
  };

  const toggleExpand = (key: string, centerId: string, patientId: string) => {
    if (expandedId === key) {
      setExpandedId(null);
    } else {
      setExpandedId(key);
      fetchClinicalData(centerId, patientId, key);
    }
  };

  // Auto-fetch clinical data on restore
  useEffect(() => {
    if (!expandedId || !userId) return;
    if (clinicalDataMap[expandedId] || loadingClinical[expandedId]) return;

    let centerId = "";
    if (expandedId.startsWith("active-") || expandedId.startsWith("center-")) {
      centerId = expandedId.replace(/^(active|center)-/, "");
    } else if (expandedId.startsWith("history-")) {
      const sessionId = expandedId.replace("history-", "");
      const session = history.find((s) => s.sessionId === sessionId);
      if (session) centerId = session.centerId;
    }

    if (centerId) {
      fetchClinicalData(centerId, userId, expandedId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedId, userId, history.length]);

  // ─── Render clinical details ─────────────────────────
  const renderClinicalDetails = (key: string) => {
    const data = clinicalDataMap[key];
    const error = clinicalError[key];
    if (loadingClinical[key]) {
      return (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
          <span className="ml-2 text-xs text-slate-600">
            Loading clinical data…
          </span>
        </div>
      );
    }
    if (error) {
      return (
        <div className="p-3 bg-rose-50 rounded-lg border border-rose-200 text-rose-800 text-xs">
          <p className="font-semibold">Could not load clinical data</p>
          <p className="text-[11px] text-rose-700 mt-0.5">{error}</p>
          <button
            onClick={() => {
              const parts = key.split("-");
              const centerId = parts.length > 1 ? parts[1] : "";
              fetchClinicalData(centerId, userId!, key);
            }}
            className="mt-2 text-[11px] font-bold text-rose-900 underline hover:text-rose-950"
          >
            Retry
          </button>
        </div>
      );
    }
    if (!data) return null;

    const sectionTitle =
      "text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-2";

    return (
      <div className="space-y-5">
        {/* Vitals */}
        <div>
          <h4 className={sectionTitle}>
            <HeartPulse className="w-3.5 h-3.5 text-emerald-600" /> Vitals
          </h4>
          <VitalsDisplay vitals={data.vitals} />
          {data.vitalsHistory && data.vitalsHistory.length > 0 && (
            <button
              onClick={() => {
                setVitalsHistoryData(data.vitalsHistory || []);
                setShowVitalsHistory(true);
              }}
              className="mt-2 text-[11px] text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 min-h-8"
            >
              <LineChart className="w-3 h-3" /> View vitals history (
              {data.vitalsHistory.length})
            </button>
          )}
        </div>

        {/* Prescriptions */}
        <div>
          <h4 className={sectionTitle}>
            <Pill className="w-3.5 h-3.5 text-emerald-600" /> Prescriptions
          </h4>
          {data.prescriptions?.length ? (
            <div className="space-y-1.5">
              {data.prescriptions.map((rx, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-lg p-2.5 border border-slate-200"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 text-xs truncate">
                        {rx.medication}
                      </p>
                      <p className="text-[11px] text-slate-600">
                        {rx.dosage} – {rx.frequency}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0",
                        rx.dispensed
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800",
                      )}
                    >
                      {rx.dispensed ? "Dispensed" : "Pending"}
                    </span>
                  </div>
                  {rx.followUpDate && (
                    <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                      <Calendar className="w-2.5 h-2.5" /> Follow-up:{" "}
                      {new Date(rx.followUpDate).toLocaleDateString()}
                    </p>
                  )}
                  {rx.instructions && (
                    <p className="text-[10px] text-slate-500 mt-1 italic">
                      "{rx.instructions}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">No prescriptions.</p>
          )}
        </div>

        {/* Lab Tests */}
        <div>
          <h4 className={sectionTitle}>
            <Microscope className="w-3.5 h-3.5 text-emerald-600" /> Lab Tests
          </h4>
          {data.tests?.length ? (
            <div className="space-y-1.5">
              {data.tests.map((test, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-lg p-2.5 border border-slate-200"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 text-xs truncate">
                        {test.testType}
                      </p>
                      <p className="text-[11px] text-slate-600">
                        {test.collectionDate
                          ? `Collected: ${formatDateShort(test.collectionDate)}`
                          : "Pending collection"}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0",
                        test.status === "completed"
                          ? "bg-emerald-100 text-emerald-800"
                          : test.status === "processing"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-100 text-slate-700",
                      )}
                    >
                      {test.status}
                    </span>
                  </div>
                  {test.result && (
                    <p className="mt-1 text-xs">
                      <span className="text-slate-600">Result: </span>
                      <span className="font-bold text-slate-900">
                        {test.result.value} {test.result.unit}
                      </span>
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">No lab tests.</p>
          )}
        </div>

        {/* Follow-ups */}
        <div>
          <h4 className={sectionTitle}>
            <Bell className="w-3.5 h-3.5 text-emerald-600" /> Follow-up
            Appointments
          </h4>
          {data.followUpAppointments?.length ? (
            <div className="space-y-1.5">
              {data.followUpAppointments.map((fu) => {
                const isPast = new Date(fu.date) < new Date();
                return (
                  <div
                    key={fu.id}
                    className={cn(
                      "bg-white rounded-lg p-2.5 border",
                      isPast ? "border-slate-200" : "border-emerald-200",
                    )}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 text-xs">
                          {new Date(fu.date).toLocaleDateString(undefined, {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                        <p className="text-[11px] text-slate-600">
                          {fu.time} {fu.reason && `– ${fu.reason}`}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0",
                          isPast
                            ? "bg-slate-100 text-slate-700"
                            : "bg-emerald-100 text-emerald-800",
                        )}
                      >
                        {isPast ? "Past" : "Upcoming"}
                      </span>
                    </div>
                    {fu.notes && (
                      <p className="text-[10px] text-slate-500 mt-1 italic">
                        "{fu.notes}"
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-500">No follow-ups scheduled.</p>
          )}
        </div>

        {/* Take-home Meds */}
        <div>
          <h4 className={sectionTitle}>
            <Syringe className="w-3.5 h-3.5 text-emerald-600" /> Take-home Meds
          </h4>
          {data.takeHomeMedications?.length ? (
            <div className="space-y-1.5">
              {data.takeHomeMedications.map((med, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-lg p-2.5 border border-slate-200"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 text-xs truncate">
                        {med.medication}
                      </p>
                      <p className="text-[11px] text-slate-600">
                        {med.dosage} – {med.frequency}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded-full shrink-0">
                      {med.source === "external" ? "External" : "Hospital"}
                    </span>
                  </div>
                  {med.instructions && (
                    <p className="text-[10px] text-slate-500 mt-1 italic">
                      "{med.instructions}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">No take-home medications.</p>
          )}
        </div>

        {/* Discharge Summary */}
        {data.dischargeSummary && (
          <div>
            <h4 className={sectionTitle}>
              <FileCheck className="w-3.5 h-3.5 text-emerald-600" /> Discharge
              Summary
            </h4>
            <div className="bg-white rounded-lg p-3 border border-slate-200">
              <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                {data.dischargeSummary}
              </p>
              {data.dischargeDate && (
                <p className="text-[10px] text-slate-500 mt-1.5">
                  Discharged {formatDateShort(data.dischargeDate)}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Doctor Notes */}
        {data.doctorNotes && data.doctorNotes.length > 0 && (
          <div>
            <h4 className={sectionTitle}>
              <FileText className="w-3.5 h-3.5 text-emerald-600" /> Doctor's
              Notes
            </h4>
            <div className="space-y-1.5">
              {data.doctorNotes.map((note, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-lg p-2.5 border border-slate-200"
                >
                  <div className="flex justify-between items-start gap-2">
                    <p className="font-medium text-slate-800 text-xs">
                      {note.authorName}
                    </p>
                    <span className="text-[10px] text-slate-500 shrink-0">
                      {formatDateShort(note.timestamp)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                    {note.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ─── Loading gate — cold start only ─────────────────
  const hasAnyData =
    activeSessions.length > 0 || history.length > 0 || linkedCenters.length > 0;

  if (!user) return <SkeletonDozaPanel />;
  if (!hasAnyData && (sessionLoading || historyLoading || centersLoading)) {
    return <SkeletonDozaPanel />;
  }

  const tabs = [
    {
      id: "ongoing" as const,
      label: "Ongoing",
      icon: Activity,
      count: activeSessions.length,
    },
    {
      id: "history" as const,
      label: "History",
      icon: History,
      count: history.length,
    },
    {
      id: "centers" as const,
      label: "Centers",
      icon: Link2,
      count: linkedCenters.length,
    },
    {
      id: "requests" as const,
      label: "Requests",
      icon: ClipboardCheck,
      count: userRequests.length,
    },
  ];

  const filteredRequests = userRequests.filter((req) =>
    historyFilter === "active"
      ? req.status === "pending"
      : req.status !== "pending",
  );

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
      <main className="mx-auto max-w-7xl px-4 pt-3 sm:px-6 lg:px-8 space-y-4 lg:space-y-5">
        {/* ─── HEADER ──────────────────────────────────────── */}
        <header className="pt-1 lg:pt-2 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight leading-tight">
                Your Care Hub
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-lg">
                Linked centers, active sessions, requests, and your medical
                history.
              </p>
            </div>

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={cn(
                "group min-h-11 px-4 rounded-xl bg-white hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 border border-slate-200 hover:border-slate-300 shadow-sm text-xs font-bold text-slate-700 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed",
                FOCUS,
              )}
            >
              {isRefreshing ? (
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              ) : (
                <RefreshCw className="w-4 h-4 text-slate-500 group-hover:text-emerald-600 transition-colors" />
              )}
              <span>{isRefreshing ? "Syncing…" : "Refresh"}</span>
            </button>
          </div>
        </header>

        {/* ─── TABS — 2×2 grid mobile / inline row desktop ─── */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1 p-1 bg-white rounded-2xl border border-slate-200 shadow-xs sm:w-fit">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center justify-center gap-1.5 min-h-10 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all",
                  isActive
                    ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20"
                    : "text-slate-600 hover:bg-slate-50",
                  FOCUS,
                )}
              >
                <Icon
                  className={cn(
                    "w-3.5 h-3.5 shrink-0",
                    isActive ? "text-white" : "text-slate-500",
                  )}
                />
                <span>{tab.label}</span>
                <span
                  className={cn(
                    "text-[10px] font-extrabold px-1.5 py-0.5 rounded-full min-w-[18px] text-center tabular-nums",
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-600",
                  )}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ─── CONTENT — direct on page bg, no outer wrapper ─── */}
        <AnimatePresence mode="wait">
          {/* ONGOING */}
          {activeTab === "ongoing" && (
            <motion.div
              key="ongoing"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4"
            >
              {activeSessions.length > 0 ? (
                activeSessions.map((session) => {
                  const key = `active-${session.centerId}`;
                  const isExpanded = expandedId === key;
                  return (
                    <div
                      key={session.sessionId}
                      className="rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-sm transition-shadow overflow-hidden"
                    >
                      <div className="h-1 bg-gradient-to-r from-emerald-500 to-emerald-600" />
                      <div className="p-4 lg:p-5">
                        {/* Header */}
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                            <Activity className="w-4 h-4 text-emerald-600 animate-pulse" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-slate-900 text-sm lg:text-base leading-tight truncate">
                              {session.centerName}
                            </h3>
                            <p className="text-[11px] lg:text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3 h-3 shrink-0" />
                              {formatDate(session.startTime)}
                            </p>
                          </div>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Live
                          </span>
                        </div>

                        {/* Duration strip */}
                        <div className="flex items-center justify-between text-[11px] lg:text-xs py-2 px-3 rounded-lg bg-slate-50 mb-3">
                          <span className="text-slate-500 flex items-center gap-1.5">
                            <Clock className="w-3 h-3" />
                            Duration
                          </span>
                          <span className="font-bold text-slate-900 tabular-nums">
                            {formatDuration(session.startTime)}
                          </span>
                        </div>

                        <button
                          onClick={() =>
                            toggleExpand(key, session.centerId, userId!)
                          }
                          className={cn(
                            "w-full min-h-10 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border",
                            isExpanded
                              ? "bg-slate-900 text-white border-slate-900"
                              : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200",
                            FOCUS,
                          )}
                        >
                          <span>
                            {isExpanded ? "Hide details" : "View details"}
                          </span>
                          <ChevronDown
                            className={cn(
                              "w-3.5 h-3.5 transition-transform duration-200",
                              isExpanded && "rotate-180",
                            )}
                          />
                        </button>

                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="mt-3 pt-3 border-t border-slate-100 overflow-hidden"
                          >
                            {renderClinicalDetails(key)}
                          </motion.div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="md:col-span-2">
                  <EmptyState
                    icon={Activity}
                    title="No active care sessions"
                    description="Connect with a medical center to launch a live consultation."
                    ctaLabel="Find a Center"
                    onCta={() => setActivePanel("doza-map")}
                  />
                </div>
              )}
            </motion.div>
          )}

          {/* HISTORY — single divided list */}
          {activeTab === "history" && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              {history.length > 0 ? (
                <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden divide-y divide-slate-100">
                  {history.map((session) => {
                    const key = `history-${session.sessionId}`;
                    const isExpanded = expandedId === key;
                    const isEnded =
                      session.status === "ended" || !session.status;

                    return (
                      <div key={session.sessionId}>
                        <button
                          onClick={() =>
                            toggleExpand(key, session.centerId, userId!)
                          }
                          className={cn(
                            "w-full flex items-center gap-3 p-3.5 lg:p-4 text-left hover:bg-slate-50/60 transition-colors",
                            FOCUS,
                          )}
                        >
                          <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                            <History className="w-4 h-4 text-slate-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                              <h4 className="font-semibold text-slate-900 text-sm truncate">
                                {session.centerName}
                              </h4>
                              <span
                                className={cn(
                                  "inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-md border",
                                  isEnded
                                    ? "bg-slate-100 text-slate-700 border-slate-200"
                                    : "bg-emerald-50 text-emerald-800 border-emerald-200",
                                )}
                              >
                                {session.status || "ended"}
                              </span>
                              {session.rating && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200">
                                  <Star className="w-2.5 h-2.5 fill-current" />
                                  {session.rating}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2.5 text-[11px] text-slate-500 flex-wrap">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDate(session.startTime)}
                              </span>
                              <span className="hidden sm:flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatDuration(
                                  session.startTime,
                                  session.endTime,
                                )}
                              </span>
                            </div>
                          </div>
                          <ChevronDown
                            className={cn(
                              "w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200",
                              isExpanded && "rotate-180",
                            )}
                          />
                        </button>

                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="px-3.5 lg:px-4 pb-3.5 lg:pb-4 space-y-3 overflow-hidden bg-slate-50/40"
                          >
                            <div className="pt-3">
                              {renderClinicalDetails(key)}
                            </div>
                            <SessionRating
                              sessionId={session.sessionId}
                              centerId={session.centerId}
                              initialRating={session.rating}
                              initialComment={session.comment}
                              onRated={(rating, comment) => {
                                setHistory((prev) =>
                                  prev.map((s) =>
                                    s.sessionId === session.sessionId
                                      ? { ...s, rating, comment }
                                      : s,
                                  ),
                                );
                              }}
                            />
                          </motion.div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  icon={History}
                  title="No session history found"
                  description="Your past care sessions will appear here once completed."
                  ctaLabel="Find a Center"
                  onCta={() => setActivePanel("doza-map")}
                />
              )}
            </motion.div>
          )}

          {/* CENTERS — grid of clean cards */}
          {activeTab === "centers" && (
            <motion.div
              key="centers"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4"
            >
              {linkedCenters.length > 0 ? (
                linkedCenters.map((center: LinkedCenter) => {
                  const key = `center-${center.centerId}`;
                  const isExpanded = expandedId === key;
                  const hasActive = activeSessions.some(
                    (s) => s.centerId === center.centerId,
                  );
                  return (
                    <div
                      key={center.centerId}
                      className={cn(
                        "rounded-2xl border shadow-xs hover:shadow-sm transition-shadow overflow-hidden",
                        hasActive
                          ? "bg-gradient-to-br from-emerald-50/40 to-white border-emerald-200"
                          : "bg-white border-slate-200",
                      )}
                    >
                      {hasActive && (
                        <div className="h-1 bg-gradient-to-r from-emerald-500 to-emerald-600" />
                      )}
                      <div className="p-4 lg:p-5">
                        <div className="flex items-start gap-3 mb-3">
                          <div
                            className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                              hasActive
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-600",
                            )}
                          >
                            <Building className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                              <h3 className="font-bold text-slate-900 text-sm lg:text-base truncate">
                                {center.centerName}
                              </h3>
                              {hasActive && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  Active
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                              <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-semibold capitalize">
                                {center.centerType?.replace("_", " ")}
                              </span>
                              <span>Linked {formatDate(center.linkedAt)}</span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() =>
                            toggleExpand(key, center.centerId, userId!)
                          }
                          className={cn(
                            "w-full min-h-10 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border",
                            isExpanded
                              ? "bg-slate-900 text-white border-slate-900"
                              : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200",
                            FOCUS,
                          )}
                        >
                          <span>
                            {isExpanded ? "Hide records" : "View records"}
                          </span>
                          <ChevronDown
                            className={cn(
                              "w-3.5 h-3.5 transition-transform duration-200",
                              isExpanded && "rotate-180",
                            )}
                          />
                        </button>

                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="mt-3 pt-3 border-t border-slate-100 overflow-hidden"
                          >
                            {renderClinicalDetails(key)}
                          </motion.div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="md:col-span-2">
                  <EmptyState
                    icon={Link2}
                    title="No linked centers found"
                    description="Connect with a facility to securely access shared records."
                    ctaLabel="Find a Center"
                    onCta={() => setActivePanel("doza-map")}
                  />
                </div>
              )}
            </motion.div>
          )}

          {/* REQUESTS */}
          {activeTab === "requests" && (
            <motion.div
              key="requests"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="space-y-3"
            >
              {/* Filter toggle */}
              <div className="inline-flex p-1 bg-white rounded-xl border border-slate-200 shadow-xs">
                <button
                  onClick={() => setHistoryFilter("active")}
                  className={cn(
                    "min-h-8 px-3.5 rounded-lg text-[11px] font-bold transition-all",
                    historyFilter === "active"
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-50",
                    FOCUS,
                  )}
                >
                  Active
                </button>
                <button
                  onClick={() => setHistoryFilter("history")}
                  className={cn(
                    "min-h-8 px-3.5 rounded-lg text-[11px] font-bold transition-all",
                    historyFilter === "history"
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-50",
                    FOCUS,
                  )}
                >
                  Archive
                </button>
              </div>

              {requestsLoading ? (
                <div className="rounded-2xl bg-white border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
                  <SkeletonRequestRow />
                  <SkeletonRequestRow />
                  <SkeletonRequestRow />
                </div>
              ) : filteredRequests.length === 0 ? (
                <EmptyState
                  icon={ClipboardCheck}
                  title={
                    historyFilter === "active"
                      ? "No active requests"
                      : "No past requests"
                  }
                  description={
                    historyFilter === "active"
                      ? "Pending consultation, medication, or test requests will appear here."
                      : "Completed and cancelled requests will be archived here."
                  }
                  ctaLabel={
                    historyFilter === "active" ? "Make a Request" : undefined
                  }
                  onCta={
                    historyFilter === "active"
                      ? () => setActivePanel("doza-map")
                      : undefined
                  }
                />
              ) : (
                <div className="rounded-2xl bg-white border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
                  {filteredRequests.map((req) => (
                    <div key={req.id} className="p-4 lg:p-5">
                      <div className="flex items-start gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 text-emerald-700">
                          {req.type === "consultation" ? (
                            <Calendar className="w-4 h-4" />
                          ) : req.type === "prescription" ? (
                            <Pill className="w-4 h-4" />
                          ) : (
                            <TestTube className="w-4 h-4" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <h4 className="font-bold text-slate-900 text-sm truncate">
                              {req.centerName || "Medical Center"}
                            </h4>
                            <span
                              className={cn(
                                "inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-md border capitalize",
                                req.status === "pending"
                                  ? "bg-amber-50 text-amber-800 border-amber-200"
                                  : req.status === "scheduled" ||
                                      req.status === "confirmed"
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                    : req.status === "cancelled"
                                      ? "bg-rose-50 text-rose-800 border-rose-200"
                                      : "bg-slate-100 text-slate-700 border-slate-200",
                              )}
                            >
                              {req.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 capitalize font-medium">
                            {req.type}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-1 text-[11px] lg:text-xs pl-13">
                        {req.medication && (
                          <div className="flex gap-1">
                            <span className="text-slate-500">Medication:</span>
                            <span className="font-medium text-slate-800">
                              {req.medication}
                            </span>
                          </div>
                        )}
                        {req.testName && (
                          <div className="flex gap-1">
                            <span className="text-slate-500">Test:</span>
                            <span className="font-medium text-slate-800">
                              {req.testName}
                            </span>
                          </div>
                        )}
                        {req.fulfillmentMethod && (
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <span className="p-0.5 rounded bg-slate-100 text-slate-500">
                              {req.fulfillmentMethod === "pickup" ? (
                                <ShoppingBag className="w-2.5 h-2.5" />
                              ) : (
                                <Truck className="w-2.5 h-2.5" />
                              )}
                            </span>
                            <span className="capitalize font-medium text-slate-700">
                              {req.fulfillmentMethod}
                            </span>
                            {req.deliveryAddress && (
                              <span className="text-slate-500 truncate">
                                – {req.deliveryAddress}
                              </span>
                            )}
                          </div>
                        )}
                        {req.startTime && (
                          <div className="flex items-center gap-1 text-slate-600">
                            <Clock className="w-3 h-3 text-slate-500" />
                            {new Date(req.startTime).toLocaleString(undefined, {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </div>
                        )}
                      </div>

                      {req.responseNotes && (
                        <div className="mt-2.5 ml-13 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] text-emerald-900">
                          <p className="font-bold text-emerald-800 mb-0.5 uppercase tracking-wider text-[9px]">
                            Response
                          </p>
                          <p className="leading-relaxed whitespace-pre-wrap font-medium">
                            {req.responseNotes}
                          </p>
                        </div>
                      )}

                      <div className="mt-2.5 ml-13 text-[10px] text-slate-400 font-medium">
                        Requested{" "}
                        {new Date(req.createdAt).toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Vitals History Modal */}
      <AnimatePresence>
        {showVitalsHistory && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="vitals-history-title"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-emerald-50">
                <h3
                  id="vitals-history-title"
                  className="text-base font-bold text-slate-900"
                >
                  Vitals History
                </h3>
                <button
                  onClick={() => setShowVitalsHistory(false)}
                  aria-label="Close"
                  className={cn(
                    "min-h-9 min-w-9 inline-flex items-center justify-center hover:bg-white rounded-lg transition-colors",
                    FOCUS,
                  )}
                >
                  <X className="w-4 h-4 text-slate-600" />
                </button>
              </div>

              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                    Chart:
                  </span>
                  <div className="flex gap-0.5">
                    {(["line", "bar", "pie"] as const).map((type) => {
                      const Icon =
                        type === "line"
                          ? LineChart
                          : type === "bar"
                            ? BarChart3
                            : PieChart;
                      return (
                        <button
                          key={type}
                          onClick={() => setChartType(type)}
                          className={cn(
                            "min-h-8 min-w-8 inline-flex items-center justify-center rounded-md transition-colors",
                            chartType === type
                              ? "bg-emerald-100 text-emerald-700"
                              : "text-slate-500 hover:bg-slate-100",
                            FOCUS,
                          )}
                          aria-label={`${type} chart`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {chartType !== "pie" && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                      Fields:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {vitalFields.map((field) => (
                        <button
                          key={field}
                          onClick={() => toggleVitalKey(field)}
                          className={cn(
                            "min-h-7 px-2 rounded-full text-[10px] font-medium border transition-all",
                            selectedVitalKeys.includes(field)
                              ? "bg-emerald-600 text-white border-emerald-600"
                              : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50",
                          )}
                        >
                          {field.replace(/([A-Z])/g, " $1").trim()}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {vitalsHistoryData.length > 0 ? (
                  <div className="space-y-4">
                    <div className="bg-white rounded-lg p-3 border border-slate-200">
                      {chartType === "pie" ? (
                        <div className="max-h-[280px] mx-auto">
                          <Pie
                            data={pieChartData}
                            options={{
                              responsive: true,
                              plugins: {
                                legend: {
                                  position: "bottom",
                                  labels: {
                                    font: { size: 11 },
                                    boxWidth: 12,
                                  },
                                },
                                title: {
                                  display: true,
                                  text: "Average Vitals",
                                  font: { size: 13, weight: "bold" },
                                },
                              },
                            }}
                          />
                        </div>
                      ) : (
                        <div className="h-[280px]">
                          {chartType === "line" ? (
                            <Line
                              data={chartData}
                              options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                  legend: {
                                    position: "top",
                                    labels: { font: { size: 11 } },
                                  },
                                },
                                scales: {
                                  y: { beginAtZero: true },
                                  x: { ticks: { maxTicksLimit: 8 } },
                                },
                              }}
                            />
                          ) : (
                            <Bar
                              data={chartData}
                              options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                  legend: {
                                    position: "top",
                                    labels: { font: { size: 11 } },
                                  },
                                },
                                scales: {
                                  y: { beginAtZero: true },
                                  x: { ticks: { maxTicksLimit: 8 } },
                                },
                              }}
                            />
                          )}
                        </div>
                      )}
                    </div>

                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="text-left px-3 py-2 font-bold text-slate-600 uppercase tracking-wider text-[10px]">
                              Time
                            </th>
                            <th className="text-left px-3 py-2 font-bold text-slate-600 uppercase tracking-wider text-[10px]">
                              By
                            </th>
                            {selectedVitalKeys.map((key) => (
                              <th
                                key={key}
                                className="text-left px-3 py-2 font-bold text-slate-600 uppercase tracking-wider text-[10px]"
                              >
                                {key.replace(/([A-Z])/g, " $1").trim()}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {vitalsHistoryData.map((record, idx) => (
                            <tr
                              key={idx}
                              className="hover:bg-slate-50 transition-colors"
                            >
                              <td className="px-3 py-2 text-slate-700 whitespace-nowrap">
                                {new Date(record.timestamp).toLocaleString()}
                              </td>
                              <td className="px-3 py-2 text-slate-700">
                                {record.recordedBy || "Unknown"}
                              </td>
                              {selectedVitalKeys.map((key) => (
                                <td
                                  key={key}
                                  className="px-3 py-2 text-slate-700"
                                >
                                  {record[key] !== undefined &&
                                  record[key] !== null
                                    ? `${record[key]}`
                                    : "—"}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <HeartPulse className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-medium">
                      No vitals history available
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Empty State ─────────────────────────────────────────
function EmptyState({
  icon: Icon,
  title,
  description,
  ctaLabel,
  onCta,
}: {
  icon: any;
  title: string;
  description: string;
  ctaLabel?: string;
  onCta?: () => void;
}) {
  return (
    <div className="text-center py-12 px-4 bg-white rounded-2xl border border-dashed border-slate-200">
      <div className="w-12 h-12 mx-auto bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-3">
        <Icon className="w-5 h-5" />
      </div>
      <p className="font-bold text-slate-800 text-sm">{title}</p>
      <p className="text-[11px] text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">
        {description}
      </p>
      {ctaLabel && onCta && (
        <button
          onClick={onCta}
          className={cn(
            "mt-4 min-h-10 px-4 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm",
            FOCUS,
          )}
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
}

// ─── Skeleton Panel ──────────────────────────────────────
function SkeletonDozaPanel() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-28 pt-2">
      <div className="mx-auto max-w-7xl px-4 pt-3 sm:px-6 lg:px-8 space-y-4 lg:space-y-5">
        <div className="space-y-3 pt-1 lg:pt-2">
          <Skeleton className="h-9 w-56 md:h-11 md:w-64" />
          <Skeleton className="h-3.5 w-72" />
        </div>

        <Skeleton className="h-12 w-full sm:w-96 rounded-2xl" />

        <div className="grid md:grid-cols-2 gap-3 lg:gap-4">
          <SkeletonSessionCard />
          <SkeletonSessionCard />
        </div>
      </div>
    </div>
  );
}
