// app/dashboard/panels/DozaPanel.tsx

"use client";

import React, { useState, useRef, useEffect } from "react";
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
import { poppins, bebasNeue } from "@/app/constants";
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
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {fields.map((field) => {
        const val = vitals[field.key];
        if (val === undefined || val === null) return null;
        return (
          <div
            key={field.key}
            className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm"
          >
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              {field.label}
            </p>
            <p className="text-lg font-bold text-slate-800">
              {val}
              {field.unit && (
                <span className="text-xs font-normal text-slate-500 ml-1">
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

const SkeletonCard = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "bg-white rounded-2xl p-5 border border-slate-200 shadow-sm",
      className,
    )}
    {...props}
  >
    <Skeleton className="h-6 w-3/4 mb-2" />
    <Skeleton className="h-4 w-1/2 mb-4" />
    <Skeleton className="h-10 w-full rounded-xl" />
  </div>
);

const SkeletonSessionCard = () => (
  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/40 rounded-2xl p-5 border border-emerald-200 shadow-sm">
    <div className="flex items-start justify-between">
      <div className="space-y-2 flex-1">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
      </div>
      <Skeleton className="h-6 w-12 rounded-full" />
    </div>
    <Skeleton className="h-10 w-full rounded-xl mt-5" />
  </div>
);

const SkeletonRequestItem = () => (
  <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
    <div className="flex items-start justify-between">
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-16 rounded-full" />
          </div>
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-40" />
        </div>
      </div>
      <Skeleton className="h-4 w-4 rounded-full" />
    </div>
    <div className="flex justify-between items-center mt-3">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-3 w-28" />
    </div>
  </div>
);

// ─── UI Components ────────────────────────────────────────
const BentoTile = ({ children, className }: any) => (
  <motion.div
    whileTap={{ scale: 0.998 }}
    transition={{ type: "spring", stiffness: 200, damping: 25 }}
    className={cn(
      "rounded-2xl bg-white border border-slate-200 shadow-sm transition-all p-4 md:p-6",
      className,
    )}
  >
    {children}
  </motion.div>
);

const TabButton = ({ active, onClick, icon: Icon, label, count }: any) => (
  <motion.button
    whileTap={{ scale: 0.96 }}
    onClick={onClick}
    className={cn(
      "relative group flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap border shadow-xs min-h-11",
      active
        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
        : "bg-white hover:bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900",
      FOCUS,
    )}
  >
    <Icon
      className={cn(
        "w-4 h-4 transition-colors",
        active ? "text-white" : "text-slate-500 group-hover:text-slate-700",
      )}
    />
    <span>{label}</span>
    {count !== undefined && (
      <span
        className={cn(
          "ml-0.5 text-xs font-extrabold px-1.5 py-0.5 rounded-full transition-colors min-w-5 h-5 inline-flex items-center justify-center",
          active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600",
        )}
      >
        {count}
      </span>
    )}
  </motion.button>
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
    <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
          <Star className="w-3.5 h-3.5 text-amber-500 fill-current" />
          Session Feedback
        </span>
        {rating > 0 && !showComment && (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
            {rating}/5
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 bg-white p-2 rounded-xl border border-slate-200">
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
                "p-1 rounded-lg hover:bg-amber-50 transition-colors min-h-9 min-w-9 inline-flex items-center justify-center",
                FOCUS,
              )}
              aria-label={`${star} star${star > 1 ? "s" : ""}`}
            >
              <Star
                size={22}
                className={cn(
                  "transition-all duration-200",
                  (hover || rating) >= star
                    ? "text-amber-500 fill-amber-400"
                    : "text-slate-300 fill-slate-100",
                )}
              />
            </button>
          ))}
        </div>
      </div>

      {showComment && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-3 pt-1 overflow-hidden"
        >
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Tell us about your experience (optional)…"
            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none transition resize-none min-h-[70px]"
            rows={2}
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowComment(false)}
              className="min-h-10 px-3.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className={cn(
                "flex items-center gap-2 min-h-10 px-4 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition disabled:opacity-50",
                FOCUS,
              )}
            >
              {submitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              Submit
            </button>
          </div>
        </motion.div>
      )}

      {initialRating > 0 && !showComment && (
        <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="font-semibold text-slate-700 shrink-0">
              Reviewed:
            </span>
            {initialComment ? (
              <span className="text-slate-500 italic truncate">
                "{initialComment}"
              </span>
            ) : (
              <span className="text-slate-400">No written comment</span>
            )}
          </div>
          <button
            onClick={() => setShowComment(true)}
            className={cn(
              "text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 shrink-0 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition min-h-8",
              FOCUS,
            )}
          >
            <Edit3 className="w-3 h-3" /> Edit
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

  // Single emerald family for charts
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

  // ─── Requests ────────────────────────────────────────
  const fetchUserRequests = async () => {
    if (!userId) return;
    setRequestsLoading(true);
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
      setRequestsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserRequests();
  }, [userId]);

  useEffect(() => {
    if (activeTab === "requests") fetchUserRequests();
  }, [activeTab, userId]);

  useEffect(() => {
    if (activeTab !== "requests") return;
    const interval = setInterval(fetchUserRequests, 30000);
    return () => clearInterval(interval);
  }, [activeTab, userId]);

  useEffect(() => {
    const handler = () => fetchUserRequests();
    window.addEventListener("doza-request-created", handler);
    return () => window.removeEventListener("doza-request-created", handler);
  }, [userId]);

  // ─── Refresh ─────────────────────────────────────────
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await mutate(`/api/user/${userId}/sessions`);
      await mutate(`/api/user/${userId}/linked-centers`);
      setClinicalDataMap({});
      setExpandedId(null);
      setClinicalError({});
      fetchUserRequests();
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

  // ─── Auto-fetch clinical data on restore ─────────────
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
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
          <span className="ml-2 text-sm text-slate-600">
            Loading clinical data…
          </span>
        </div>
      );
    }
    if (error) {
      return (
        <div className="p-4 bg-rose-50 rounded-xl border border-rose-200 text-rose-800 text-sm">
          <p className="font-semibold">Could not load clinical data</p>
          <p className="text-xs text-rose-700 mt-1">{error}</p>
          <button
            onClick={() => {
              const parts = key.split("-");
              const centerId = parts.length > 1 ? parts[1] : "";
              fetchClinicalData(centerId, userId!, key);
            }}
            className="mt-2 text-xs font-bold text-rose-900 underline hover:text-rose-950"
          >
            Retry
          </button>
        </div>
      );
    }
    if (!data) return null;
    return (
      <div className="space-y-6 mt-4">
        {/* Vitals */}
        <div>
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
            <HeartPulse className="w-4 h-4 text-emerald-600" /> Vitals
          </h4>
          <VitalsDisplay vitals={data.vitals} />
          {data.vitalsHistory && data.vitalsHistory.length > 0 && (
            <button
              onClick={() => {
                setVitalsHistoryData(data.vitalsHistory || []);
                setShowVitalsHistory(true);
              }}
              className="mt-2 text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 min-h-9 px-2 -mx-2 rounded-lg"
            >
              <LineChart className="w-3.5 h-3.5" /> View vitals history (
              {data.vitalsHistory.length} records)
            </button>
          )}
        </div>

        {/* Prescriptions */}
        <div>
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
            <Pill className="w-4 h-4 text-emerald-600" /> Prescriptions
          </h4>
          {data.prescriptions?.length ? (
            <div className="space-y-2">
              {data.prescriptions.map((rx, idx) => (
                <div
                  key={idx}
                  className="bg-slate-50 rounded-xl p-3 border border-slate-200"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 truncate">
                        {rx.medication}
                      </p>
                      <p className="text-xs text-slate-600">
                        {rx.dosage} – {rx.frequency}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "text-xs font-bold px-2 py-0.5 rounded-full shrink-0",
                        rx.dispensed
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800",
                      )}
                    >
                      {rx.dispensed ? "Dispensed" : "Pending"}
                    </span>
                  </div>
                  {rx.followUpDate && (
                    <div className="flex items-center gap-1 text-xs text-slate-500 mt-1.5">
                      <Calendar className="w-3 h-3" /> Follow-up:{" "}
                      {new Date(rx.followUpDate).toLocaleDateString()}
                    </div>
                  )}
                  {rx.instructions && (
                    <p className="text-xs text-slate-500 mt-1 italic">
                      "{rx.instructions}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No prescriptions.</p>
          )}
        </div>

        {/* Lab Tests */}
        <div>
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
            <Microscope className="w-4 h-4 text-emerald-600" /> Lab Tests
          </h4>
          {data.tests?.length ? (
            <div className="space-y-2">
              {data.tests.map((test, idx) => (
                <div
                  key={idx}
                  className="bg-slate-50 rounded-xl p-3 border border-slate-200"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 truncate">
                        {test.testType}
                      </p>
                      <p className="text-xs text-slate-600">
                        {test.collectionDate
                          ? `Collected: ${formatDateShort(test.collectionDate)}`
                          : "Pending collection"}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "text-xs font-bold px-2 py-0.5 rounded-full shrink-0",
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
                    <div className="mt-1.5 text-sm">
                      <span className="font-medium text-slate-600">
                        Result:{" "}
                      </span>
                      <span className="font-bold text-slate-900">
                        {test.result.value} {test.result.unit}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No lab tests.</p>
          )}
        </div>

        {/* Follow-ups */}
        <div>
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
            <Bell className="w-4 h-4 text-emerald-600" /> Follow-up Appointments
          </h4>
          {data.followUpAppointments?.length ? (
            <div className="space-y-2">
              {data.followUpAppointments.map((fu) => {
                const isPast = new Date(fu.date) < new Date();
                return (
                  <div
                    key={fu.id}
                    className={cn(
                      "bg-slate-50 rounded-xl p-3 border",
                      isPast ? "border-slate-200" : "border-emerald-200",
                    )}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800">
                          {new Date(fu.date).toLocaleDateString(undefined, {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                        <p className="text-xs text-slate-600">
                          {fu.time} {fu.reason && `– ${fu.reason}`}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "text-xs font-bold px-2 py-0.5 rounded-full shrink-0",
                          isPast
                            ? "bg-slate-100 text-slate-700"
                            : "bg-emerald-100 text-emerald-800",
                        )}
                      >
                        {isPast ? "Past" : "Upcoming"}
                      </span>
                    </div>
                    {fu.notes && (
                      <p className="text-xs text-slate-500 mt-1.5 italic">
                        "{fu.notes}"
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No follow-ups scheduled.</p>
          )}
        </div>

        {/* Take-home Meds */}
        <div>
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
            <Syringe className="w-4 h-4 text-emerald-600" /> Take-home
            Medications
          </h4>
          {data.takeHomeMedications?.length ? (
            <div className="space-y-2">
              {data.takeHomeMedications.map((med, idx) => (
                <div
                  key={idx}
                  className="bg-slate-50 rounded-xl p-3 border border-slate-200"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 truncate">
                        {med.medication}
                      </p>
                      <p className="text-xs text-slate-600">
                        {med.dosage} – {med.frequency}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0">
                      {med.source === "external" ? "External" : "Hospital"}
                    </span>
                  </div>
                  {med.instructions && (
                    <p className="text-xs text-slate-500 mt-1.5 italic">
                      "{med.instructions}"
                    </p>
                  )}
                  {med.dispensedAt && (
                    <p className="text-xs text-slate-500 mt-1.5">
                      Dispensed: {formatDateShort(med.dispensedAt)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No take-home medications.</p>
          )}
        </div>

        {/* Discharge Summary */}
        {data.dischargeSummary && (
          <div>
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
              <FileCheck className="w-4 h-4 text-emerald-600" /> Discharge
              Summary
            </h4>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-sm text-slate-700 whitespace-pre-wrap">
                {data.dischargeSummary}
              </p>
              {data.dischargeDate && (
                <p className="text-xs text-slate-500 mt-2">
                  Discharged on {formatDateShort(data.dischargeDate)}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Doctor Notes */}
        {data.doctorNotes && data.doctorNotes.length > 0 && (
          <div>
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-emerald-600" /> Doctor's Notes
            </h4>
            <div className="space-y-2">
              {data.doctorNotes.map((note, idx) => (
                <div
                  key={idx}
                  className="bg-slate-50 rounded-xl p-3 border border-slate-200"
                >
                  <div className="flex justify-between items-start gap-2">
                    <p className="font-medium text-slate-800">
                      {note.authorName}
                    </p>
                    <span className="text-xs text-slate-500 shrink-0">
                      {formatDateShort(note.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 mt-1.5">
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

  // ─── Render ─────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "space-y-6 p-3 md:p-6 max-w-7xl mx-auto",
        poppins.className,
      )}
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 pb-5 border-b border-slate-200">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-8 w-1 rounded-full bg-gradient-to-b from-emerald-500 to-emerald-700" />
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-[0.22em]">
              Doza Network
            </span>
          </div>

          <h1
            className={cn(
              "text-3xl sm:text-4xl md:text-5xl text-slate-900 leading-[1.05] tracking-tight",
              bebasNeue.className,
            )}
          >
            Your Care Hub
          </h1>

          <p className="text-xs md:text-sm text-slate-600 max-w-lg font-medium leading-relaxed">
            Manage linked centers, active sessions, pending requests, and your
            complete medical history.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className={cn(
            "group min-h-12 px-5 rounded-xl bg-white hover:bg-slate-50 transition-colors flex items-center justify-center gap-2.5 border border-slate-200 hover:border-slate-300 shadow-sm text-xs font-bold text-slate-700 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed",
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

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none [&::-webkit-scrollbar]:hidden">
        <TabButton
          active={activeTab === "ongoing"}
          onClick={() => setActiveTab("ongoing")}
          icon={Activity}
          label="Ongoing"
          count={activeSessions.length}
        />
        <TabButton
          active={activeTab === "history"}
          onClick={() => setActiveTab("history")}
          icon={History}
          label="History"
          count={history.length}
        />
        <TabButton
          active={activeTab === "centers"}
          onClick={() => setActiveTab("centers")}
          icon={Link2}
          label="Centers"
          count={linkedCenters.length}
        />
        <TabButton
          active={activeTab === "requests"}
          onClick={() => setActiveTab("requests")}
          icon={ClipboardCheck}
          label="Requests"
          count={userRequests.length}
        />
      </div>

      {/* Content */}
      <BentoTile>
        <AnimatePresence mode="wait">
          {/* ONGOING */}
          {activeTab === "ongoing" && (
            <motion.div
              key="ongoing"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="space-y-6"
            >
              {activeSessions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                  {activeSessions.map((session) => {
                    const key = `active-${session.centerId}`;
                    const isExpanded = expandedId === key;
                    return (
                      <div
                        key={session.sessionId}
                        className="group relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-emerald-50 to-white border border-emerald-200 shadow-sm md:hover:shadow-md transition-shadow"
                      >
                        <div className="absolute top-0 left-0 right-0 h-0.5 bg-emerald-600" />

                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div className="w-11 h-11 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0 text-emerald-700">
                              <Activity className="w-5 h-5 animate-pulse" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <h3 className="font-bold text-slate-900 text-base tracking-tight truncate">
                                {session.centerName}
                              </h3>
                              <div className="space-y-1 mt-1.5">
                                <p className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                                  <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  Started {formatDate(session.startTime)}
                                </p>
                                <p className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  Duration: {formatDuration(session.startTime)}
                                </p>
                              </div>
                            </div>
                          </div>

                          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border bg-emerald-100 text-emerald-800 border-emerald-200 shrink-0">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-current" />
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current" />
                            </span>
                            Live
                          </span>
                        </div>

                        <div className="mt-4 pt-3 border-t border-emerald-200/60">
                          <button
                            onClick={() =>
                              toggleExpand(key, session.centerId, userId!)
                            }
                            className={cn(
                              "w-full min-h-11 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border",
                              isExpanded
                                ? "bg-slate-900 text-white border-slate-900"
                                : "bg-white hover:bg-slate-50 text-emerald-800 border-emerald-200",
                              FOCUS,
                            )}
                          >
                            <span>
                              {isExpanded
                                ? "Hide Clinical Details"
                                : "View Clinical Details"}
                            </span>
                            <ChevronDown
                              className={cn(
                                "w-4 h-4 transition-transform duration-300",
                                isExpanded && "rotate-180",
                              )}
                            />
                          </button>
                        </div>

                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.25 }}
                            className="mt-3 pt-3 border-t border-emerald-200/60 overflow-hidden"
                          >
                            <div className="bg-white rounded-xl p-4 border border-emerald-200/60">
                              {renderClinicalDetails(key)}
                            </div>
                          </motion.div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  icon={Activity}
                  title="No active care sessions"
                  description="You are not currently in an active care session. Connect with a medical center to launch a live consultation."
                  ctaLabel="Find a Center Near You"
                  onCta={() => setActivePanel("doza-map")}
                />
              )}
            </motion.div>
          )}

          {/* HISTORY */}
          {activeTab === "history" && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {history.length > 0 ? (
                <div className="space-y-3">
                  {history.map((session: SessionSummary) => {
                    const key = `history-${session.sessionId}`;
                    const isExpanded = expandedId === key;
                    const isEnded =
                      session.status === "ended" || !session.status;

                    return (
                      <div
                        key={session.sessionId}
                        className="group bg-white rounded-2xl p-5 border border-slate-200 shadow-sm md:hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                              <History className="w-5 h-5 text-emerald-600" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-bold text-slate-900 text-sm tracking-tight truncate">
                                  {session.centerName}
                                </h4>
                                <span
                                  className={cn(
                                    "inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border",
                                    isEnded
                                      ? "bg-slate-100 text-slate-700 border-slate-200"
                                      : "bg-emerald-50 text-emerald-800 border-emerald-200",
                                  )}
                                >
                                  {session.status || "ended"}
                                </span>
                                {session.rating && (
                                  <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                    <Star className="w-3 h-3 fill-current" />
                                    {session.rating}/5
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 mt-1.5 font-medium">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                  {formatDate(session.startTime)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                                  {formatDuration(
                                    session.startTime,
                                    session.endTime,
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() =>
                              toggleExpand(key, session.centerId, userId!)
                            }
                            className={cn(
                              "min-h-10 px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border shrink-0",
                              isExpanded
                                ? "bg-slate-900 text-white border-slate-900"
                                : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200",
                              FOCUS,
                            )}
                          >
                            <span className="hidden sm:inline">
                              {isExpanded ? "Hide" : "View"}
                            </span>
                            <ChevronDown
                              className={cn(
                                "w-4 h-4 transition-transform duration-300",
                                isExpanded && "rotate-180",
                              )}
                            />
                          </button>
                        </div>

                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.25 }}
                            className="mt-3 pt-3 border-t border-slate-100 space-y-3 overflow-hidden"
                          >
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
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
                  description="Your past care sessions and provider summaries will appear here once completed."
                  ctaLabel="Find a Center Near You"
                  onCta={() => setActivePanel("doza-map")}
                />
              )}
            </motion.div>
          )}

          {/* CENTERS */}
          {activeTab === "centers" && (
            <motion.div
              key="centers"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {linkedCenters.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                  {linkedCenters.map((center: LinkedCenter) => {
                    const key = `center-${center.centerId}`;
                    const isExpanded = expandedId === key;
                    const hasActive = activeSessions.some(
                      (s) => s.centerId === center.centerId,
                    );
                    return (
                      <div
                        key={center.centerId}
                        className={cn(
                          "group relative overflow-hidden rounded-2xl p-5 border transition-shadow md:hover:shadow-md",
                          hasActive
                            ? "bg-gradient-to-br from-emerald-50 to-white border-emerald-200 shadow-sm"
                            : "bg-white border-slate-200 shadow-sm",
                        )}
                      >
                        {hasActive && (
                          <div className="absolute top-0 left-0 right-0 h-0.5 bg-emerald-600" />
                        )}

                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            <div
                              className={cn(
                                "w-11 h-11 rounded-xl border flex items-center justify-center shrink-0",
                                hasActive
                                  ? "bg-emerald-100 border-emerald-200 text-emerald-700"
                                  : "bg-slate-50 border-slate-200 text-slate-600",
                              )}
                            >
                              <Building className="w-5 h-5" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <h3 className="font-bold text-slate-900 text-base tracking-tight truncate">
                                {center.centerName}
                              </h3>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="text-xs font-bold text-slate-600 capitalize px-2 py-0.5 bg-slate-100 rounded-md border border-slate-200">
                                  {center.centerType?.replace("_", " ")}
                                </span>
                                <span className="text-xs font-medium text-slate-500">
                                  Linked {formatDate(center.linkedAt)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {hasActive && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border bg-emerald-50 text-emerald-800 border-emerald-200 shrink-0">
                              <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-current" />
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current" />
                              </span>
                              Active
                            </span>
                          )}
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100">
                          <button
                            onClick={() =>
                              toggleExpand(key, center.centerId, userId!)
                            }
                            className={cn(
                              "w-full min-h-11 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border",
                              isExpanded
                                ? "bg-slate-900 text-white border-slate-900"
                                : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200",
                              FOCUS,
                            )}
                          >
                            <span>
                              {isExpanded
                                ? "Hide Details"
                                : "View Clinical Records"}
                            </span>
                            <ChevronDown
                              className={cn(
                                "w-4 h-4 transition-transform duration-300",
                                isExpanded && "rotate-180",
                              )}
                            />
                          </button>
                        </div>

                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.25 }}
                            className="mt-3 pt-3 border-t border-slate-100 overflow-hidden"
                          >
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                              {renderClinicalDetails(key)}
                            </div>
                          </motion.div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  icon={Link2}
                  title="No linked centers found"
                  description="You haven't linked any healthcare centers yet. Connect with a facility to securely access shared records."
                  ctaLabel="Find a Center Near You"
                  onCta={() => setActivePanel("doza-map")}
                />
              )}
            </motion.div>
          )}

          {/* REQUESTS */}
          {activeTab === "requests" && (
            <motion.div
              key="requests"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit border border-slate-200">
                <button
                  onClick={() => setHistoryFilter("active")}
                  className={cn(
                    "min-h-9 px-4 rounded-lg text-xs font-bold transition-all",
                    historyFilter === "active"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900",
                    FOCUS,
                  )}
                >
                  Active
                </button>
                <button
                  onClick={() => setHistoryFilter("history")}
                  className={cn(
                    "min-h-9 px-4 rounded-lg text-xs font-bold transition-all",
                    historyFilter === "history"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900",
                    FOCUS,
                  )}
                >
                  Archive
                </button>
              </div>

              {requestsLoading ? (
                <div className="space-y-3">
                  <SkeletonRequestItem />
                  <SkeletonRequestItem />
                  <SkeletonRequestItem />
                </div>
              ) : (
                <>
                  {userRequests.filter((req) =>
                    historyFilter === "active"
                      ? req.status === "pending"
                      : req.status !== "pending",
                  ).length === 0 ? (
                    <EmptyState
                      icon={ClipboardCheck}
                      title={
                        historyFilter === "active"
                          ? "No active requests"
                          : "No past requests"
                      }
                      description={
                        historyFilter === "active"
                          ? "Your pending consultation, medication, or test requests will appear here."
                          : "Your completed and cancelled requests will be archived here."
                      }
                      ctaLabel={
                        historyFilter === "active"
                          ? "Make a New Request"
                          : undefined
                      }
                      onCta={
                        historyFilter === "active"
                          ? () => setActivePanel("doza-map")
                          : undefined
                      }
                    />
                  ) : (
                    <div className="space-y-3">
                      {userRequests
                        .filter((req) =>
                          historyFilter === "active"
                            ? req.status === "pending"
                            : req.status !== "pending",
                        )
                        .map((req) => (
                          <div
                            key={req.id}
                            className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm md:hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 min-w-0 flex-1">
                                <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 text-emerald-700">
                                  {req.type === "consultation" ? (
                                    <Calendar className="w-5 h-5" />
                                  ) : req.type === "prescription" ? (
                                    <Pill className="w-5 h-5" />
                                  ) : (
                                    <TestTube className="w-5 h-5" />
                                  )}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-bold text-slate-900 text-sm tracking-tight truncate">
                                      {req.centerName || "Medical Center"}
                                    </h4>
                                    <span
                                      className={cn(
                                        "inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border",
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

                                  <p className="text-xs font-semibold text-slate-500 capitalize mt-0.5">
                                    {req.type}
                                  </p>

                                  <div className="space-y-1.5 mt-2">
                                    {req.medication && (
                                      <div className="text-xs text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 inline-block">
                                        <span className="text-slate-500 font-semibold">
                                          Medication:
                                        </span>{" "}
                                        {req.medication}
                                      </div>
                                    )}
                                    {req.testName && (
                                      <div className="text-xs text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 inline-block">
                                        <span className="text-slate-500 font-semibold">
                                          Test:
                                        </span>{" "}
                                        {req.testName}
                                      </div>
                                    )}
                                    {req.fulfillmentMethod && (
                                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                                        <span className="p-1 rounded-md bg-slate-100 text-slate-500">
                                          {req.fulfillmentMethod ===
                                          "pickup" ? (
                                            <ShoppingBag className="w-3 h-3" />
                                          ) : (
                                            <Truck className="w-3 h-3" />
                                          )}
                                        </span>
                                        <span className="capitalize font-semibold text-slate-700">
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
                                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                                        {new Date(req.startTime).toLocaleString(
                                          undefined,
                                          {
                                            dateStyle: "medium",
                                            timeStyle: "short",
                                          },
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {req.responseNotes && (
                              <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900">
                                <p className="font-bold text-emerald-800 mb-1 uppercase tracking-wider">
                                  Response
                                </p>
                                <p className="leading-relaxed whitespace-pre-wrap font-medium">
                                  {req.responseNotes}
                                </p>
                              </div>
                            )}

                            <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500 font-medium">
                              Requested{" "}
                              {new Date(req.createdAt).toLocaleDateString(
                                undefined,
                                {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                },
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </BentoTile>

      {/* Vitals History Modal */}
      <AnimatePresence>
        {showVitalsHistory && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
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
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-emerald-50">
                <h3
                  id="vitals-history-title"
                  className="text-lg font-bold text-slate-900"
                >
                  Vitals History
                </h3>
                <button
                  onClick={() => setShowVitalsHistory(false)}
                  aria-label="Close"
                  className={cn(
                    "min-h-10 min-w-10 inline-flex items-center justify-center hover:bg-white rounded-xl transition-colors",
                    FOCUS,
                  )}
                >
                  <X className="w-5 h-5 text-slate-600" />
                </button>
              </div>

              <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Chart:
                  </span>
                  <div className="flex gap-1">
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
                            "min-h-9 min-w-9 inline-flex items-center justify-center rounded-lg transition-colors",
                            chartType === type
                              ? "bg-emerald-100 text-emerald-700"
                              : "text-slate-500 hover:bg-slate-100",
                            FOCUS,
                          )}
                          aria-label={`${type} chart`}
                        >
                          <Icon className="w-4 h-4" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {chartType !== "pie" && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Fields:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {vitalFields.map((field) => (
                        <button
                          key={field}
                          onClick={() => toggleVitalKey(field)}
                          className={cn(
                            "min-h-8 px-2.5 rounded-full text-xs font-medium border transition-all",
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

              <div className="flex-1 overflow-y-auto p-5">
                {vitalsHistoryData.length > 0 ? (
                  <div className="space-y-5">
                    <div className="bg-white rounded-xl p-4 border border-slate-200">
                      {chartType === "pie" ? (
                        <div className="max-h-[300px] mx-auto">
                          <Pie
                            data={pieChartData}
                            options={{
                              responsive: true,
                              plugins: {
                                legend: {
                                  position: "bottom",
                                  labels: { font: { size: 12 }, boxWidth: 12 },
                                },
                                title: {
                                  display: true,
                                  text: "Average Vitals",
                                  font: { size: 14, weight: "bold" },
                                },
                              },
                            }}
                          />
                        </div>
                      ) : (
                        <div className="h-[300px]">
                          {chartType === "line" ? (
                            <Line
                              data={chartData}
                              options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                  legend: {
                                    position: "top",
                                    labels: { font: { size: 12 } },
                                  },
                                },
                                scales: {
                                  y: { beginAtZero: true },
                                  x: { ticks: { maxTicksLimit: 10 } },
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
                                    labels: { font: { size: 12 } },
                                  },
                                },
                                scales: {
                                  y: { beginAtZero: true },
                                  x: { ticks: { maxTicksLimit: 10 } },
                                },
                              }}
                            />
                          )}
                        </div>
                      )}
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="text-left px-4 py-2 text-xs font-bold text-slate-600 uppercase tracking-wider">
                              Time
                            </th>
                            <th className="text-left px-4 py-2 text-xs font-bold text-slate-600 uppercase tracking-wider">
                              Recorded By
                            </th>
                            {selectedVitalKeys.map((key) => (
                              <th
                                key={key}
                                className="text-left px-4 py-2 text-xs font-bold text-slate-600 uppercase tracking-wider"
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
                              <td className="px-4 py-3 text-xs text-slate-700 whitespace-nowrap">
                                {new Date(record.timestamp).toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-xs text-slate-700">
                                {record.recordedBy || "Unknown"}
                              </td>
                              {selectedVitalKeys.map((key) => (
                                <td
                                  key={key}
                                  className="px-4 py-3 text-xs text-slate-700"
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
                    <HeartPulse className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                    <p className="font-medium">No vitals history available</p>
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

// ─── Empty State (extracted) ─────────────────────────────
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
    <div className="text-center py-16 px-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
      <div className="w-14 h-14 mx-auto bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-3 border border-emerald-100">
        <Icon className="w-6 h-6" />
      </div>
      <p className="font-bold text-slate-800 text-base">{title}</p>
      <p className="text-xs text-slate-600 max-w-sm mx-auto mt-1.5 leading-relaxed">
        {description}
      </p>
      {ctaLabel && onCta && (
        <button
          onClick={onCta}
          className={cn(
            "mt-5 min-h-11 px-5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm",
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
    <div className="space-y-6 p-3 md:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Skeleton className="h-8 w-1 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-12 w-64 md:w-80" />
          <Skeleton className="h-4 w-48 mt-2" />
        </div>
        <Skeleton className="h-12 w-28 rounded-xl" />
      </div>

      <div className="flex overflow-x-auto gap-2 pb-2">
        <Skeleton className="h-11 w-28 rounded-xl shrink-0" />
        <Skeleton className="h-11 w-28 rounded-xl shrink-0" />
        <Skeleton className="h-11 w-28 rounded-xl shrink-0" />
        <Skeleton className="h-11 w-28 rounded-xl shrink-0" />
      </div>

      <BentoTile>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SkeletonSessionCard />
          <SkeletonSessionCard />
        </div>
      </BentoTile>
    </div>
  );
}
