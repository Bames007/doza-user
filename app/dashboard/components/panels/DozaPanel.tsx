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
  CheckCircle,
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
  Stethoscope,
  FileCheck,
  Users,
  Edit3,
  MessageSquare,
  Send,
  TestTube,
  ShoppingBag,
  Truck,
  PlusCircle,
  MapPin,
  ArrowRight,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import { useUserContext } from "../../UserContext";
import { useActiveSession } from "../../hooks/useSession";
import { useSessionHistory } from "@/app/dashboard/hooks/useSessionHistory";
import { useLinkedCenters } from "@/app/dashboard/hooks/useLinkedCenters";
import { mutate } from "swr";
import { cn } from "@/app/utils/utils";
import { poppins, bebasNeue } from "@/app/constants";

// Import dashboard context to switch panels
import { useDashboard } from "../../DashboardContext";

// Chart.js (unchanged)
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

// ─── Types (unchanged) ─────────────────────────────────────────────
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

// ─── Helpers (unchanged) ──────────────────────────────────────────
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
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
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

// ─── Skeleton Components (unchanged) ──────────────────────────────
const Skeleton = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("animate-pulse bg-slate-200 rounded-lg", className)}
    {...props}
  />
);

const SkeletonText = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <Skeleton className={cn("h-4 w-full", className)} {...props} />
);

const SkeletonCard = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "bg-white rounded-3xl p-5 border border-slate-200 shadow-sm",
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
  <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl p-5 border border-emerald-200 shadow-sm">
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

const SkeletonHistoryItem = () => (
  <div className="py-4 first:pt-0 last:pb-0">
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-12 rounded-full" />
        </div>
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <Skeleton className="h-9 w-28 rounded-xl" />
    </div>
    <Skeleton className="h-0.5 w-full mt-4" />
  </div>
);

const SkeletonCenterCard = () => (
  <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-5 rounded-full" />
        <Skeleton className="h-5 w-32" />
      </div>
      <Skeleton className="h-5 w-14 rounded-full" />
    </div>
    <Skeleton className="h-3 w-24 mb-1" />
    <Skeleton className="h-3 w-20 mb-4" />
    <Skeleton className="h-9 w-full rounded-xl" />
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

// ─── UI Components ────────────────────────────────────────────────
const BentoTile = ({ children, className }: any) => (
  <motion.div
    whileHover={{ y: -2 }}
    transition={{ type: "spring", stiffness: 200, damping: 25 }}
    className={cn(
      "rounded-[32px] bg-white/80 backdrop-blur-xl border border-white/50 shadow-sm transition-all p-4 md:p-6",
      className,
    )}
  >
    {children}
  </motion.div>
);

const TabButton = ({ active, onClick, icon: Icon, label, count }: any) => (
  <motion.button
    whileTap={{ scale: 0.96 }}
    whileHover={{ y: -1 }}
    onClick={onClick}
    className={cn(
      "relative group flex items-center gap-2.5 px-5 py-3 rounded-2xl text-xs font-bold transition-all duration-300 whitespace-nowrap border shadow-xs",
      active
        ? "bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-600/25"
        : "bg-white hover:bg-slate-50 text-slate-600 border-slate-200/80 hover:border-slate-300 hover:text-slate-900",
    )}
  >
    <Icon
      className={cn(
        "w-4 h-4 transition-colors",
        active ? "text-white" : "text-slate-400 group-hover:text-slate-600",
      )}
    />
    <span>{label}</span>
    {count !== undefined && (
      <span
        className={cn(
          "ml-0.5 text-[10px] font-extrabold px-2 py-0.5 rounded-full transition-colors tracking-wide",
          active
            ? "bg-white/20 text-white border border-white/30"
            : "bg-slate-100 text-slate-600 border border-slate-200/60",
        )}
      >
        {count}
      </span>
    )}
  </motion.button>
);

// ─── Rating Component ───────────────────────────────────
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
    <div className="rounded-2xl bg-gradient-to-br from-slate-50/70 to-slate-100/40 p-4 border border-slate-200/80 shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Star className="w-3.5 h-3.5 text-amber-500 fill-current" />
          Care Session Feedback
        </span>
        {rating > 0 && !showComment && (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/80 shadow-xs">
            {rating}/5 Stars
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 bg-white p-2 rounded-2xl border border-slate-200/80 shadow-xs">
          {[1, 2, 3, 4, 5].map((star) => (
            <motion.button
              key={star}
              type="button"
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleRate(star)}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
              className="p-1 focus:outline-none transition-colors rounded-lg hover:bg-amber-50"
            >
              <Star
                size={22}
                className={cn(
                  "transition-all duration-200",
                  (hover || rating) >= star
                    ? "text-amber-500 fill-amber-400 drop-shadow-xs"
                    : "text-slate-300 fill-slate-100",
                )}
              />
            </motion.button>
          ))}
        </div>
      </div>

      {showComment && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-3 pt-2 overflow-hidden"
        >
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Tell us about your experience with this care center (optional)..."
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition shadow-xs resize-none min-h-[75px]"
            rows={2}
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowComment(false)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-200/60 transition"
            >
              Cancel
            </button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition shadow-md shadow-slate-950/10 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              Submit Review
            </motion.button>
          </div>
        </motion.div>
      )}

      {initialRating > 0 && !showComment && (
        <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="font-semibold text-slate-700 shrink-0">
              Reviewed:
            </span>
            {initialComment ? (
              <span className="text-slate-500 italic truncate">
                “{initialComment}”
              </span>
            ) : (
              <span className="text-slate-400">
                No written comment provided.
              </span>
            )}
          </div>
          <button
            onClick={() => setShowComment(true)}
            className="text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 shrink-0 ml-2 bg-emerald-50 hover:bg-emerald-100/80 px-2.5 py-1 rounded-lg border border-emerald-200/60 transition"
          >
            <Edit3 className="w-3 h-3" /> Edit Review
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────
export default function DozaPanel() {
  const user = useUserContext();
  const userId = user?.id;

  // Use dashboard context to switch panels
  const { setActivePanel } = useDashboard();

  const { sessions: activeSessions, loading: sessionLoading } =
    useActiveSession(userId);
  const { sessions: initialHistory, loading: historyLoading } =
    useSessionHistory(userId);
  const { centers: linkedCenters, loading: centersLoading } =
    useLinkedCenters(userId);

  const [history, setHistory] = useState<SessionSummary[]>([]);
  const [activeTab, setActiveTab] = useState<
    "ongoing" | "history" | "centers" | "requests"
  >("ongoing");

  const [expandedId, setExpandedId] = useState<string | null>(null);
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
  const [chartType, setChartType] = useState<"line" | "bar" | "pie">("line");
  const [selectedVitalKeys, setSelectedVitalKeys] = useState<string[]>([
    "heartRate",
  ]);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const [userRequests, setUserRequests] = useState<any[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<"active" | "history">(
    "active",
  );

  // ─── Available vital fields ──────────────────────────────────────
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
    "#0d9488",
    "#2563eb",
    "#d97706",
    "#7c3aed",
    "#e11d48",
    "#059669",
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
          "rgba(16, 185, 129, 0.8)",
          "rgba(59, 130, 246, 0.8)",
          "rgba(245, 158, 11, 0.8)",
          "rgba(239, 68, 68, 0.8)",
          "rgba(168, 85, 247, 0.8)",
          "rgba(236, 72, 153, 0.8)",
          "rgba(20, 184, 166, 0.8)",
          "rgba(251, 146, 60, 0.8)",
          "rgba(14, 165, 233, 0.8)",
          "rgba(234, 179, 8, 0.8)",
        ],
      },
    ],
  };

  // ─── Lifecycle ──────────────────────────────────────────────────
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

  // ─── Fetch clinical data ────────────────────────────────────────
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
          `HTTP ${res.status}: ${text.substring(0, 100)}${text.length > 100 ? "…" : ""}`,
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

  // ─── Render clinical details ────────────────────────────────────
  const renderClinicalDetails = (key: string) => {
    const data = clinicalDataMap[key];
    const error = clinicalError[key];
    if (loadingClinical[key]) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
          <span className="ml-2 text-sm text-slate-500">
            Loading clinical data...
          </span>
        </div>
      );
    }
    if (error) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-rose-50 rounded-xl border border-rose-200 text-rose-700 text-sm"
        >
          <p className="font-semibold">Could not load clinical data</p>
          <p className="text-xs text-rose-600 mt-1">{error}</p>
          <button
            onClick={() => {
              const parts = key.split("-");
              const centerId = parts.length > 1 ? parts[1] : "";
              fetchClinicalData(centerId, userId!, key);
            }}
            className="mt-2 text-xs font-medium text-rose-800 underline hover:text-rose-900"
          >
            Retry
          </button>
        </motion.div>
      );
    }
    if (!data) return null;
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6 mt-4"
      >
        {/* Vitals */}
        <div>
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
            <HeartPulse className="w-4 h-4 text-emerald-500" /> Vitals
          </h4>
          <VitalsDisplay vitals={data.vitals} />
          {data.vitalsHistory && data.vitalsHistory.length > 0 && (
            <button
              onClick={() => {
                setVitalsHistoryData(data.vitalsHistory || []);
                setSelectedVitalKeys(["heartRate"]);
                setShowVitalsHistory(true);
              }}
              className="mt-2 text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
            >
              <LineChart className="w-3 h-3" /> View Vitals History (
              {data.vitalsHistory.length} records)
            </button>
          )}
        </div>

        {/* Prescriptions */}
        <div>
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
            <Pill className="w-4 h-4 text-emerald-500" /> Prescriptions
          </h4>
          {data.prescriptions?.length ? (
            <div className="space-y-2">
              {data.prescriptions.map((rx, idx) => (
                <div
                  key={idx}
                  className="bg-slate-50 rounded-xl p-3 border border-slate-200"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-slate-800">
                        {rx.medication}
                      </p>
                      <p className="text-xs text-slate-600">
                        {rx.dosage} – {rx.frequency}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full",
                        rx.dispensed
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700",
                      )}
                    >
                      {rx.dispensed ? "Dispensed" : "Pending"}
                    </span>
                  </div>
                  {rx.followUpDate && (
                    <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
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
            <Microscope className="w-4 h-4 text-emerald-500" /> Lab Tests
          </h4>
          {data.tests?.length ? (
            <div className="space-y-2">
              {data.tests.map((test, idx) => (
                <div
                  key={idx}
                  className="bg-slate-50 rounded-xl p-3 border border-slate-200"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-slate-800">
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
                        "text-[10px] font-bold px-2 py-0.5 rounded-full",
                        test.status === "completed"
                          ? "bg-emerald-100 text-emerald-700"
                          : test.status === "processing"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-slate-100 text-slate-600",
                      )}
                    >
                      {test.status}
                    </span>
                  </div>
                  {test.result && (
                    <div className="mt-1 text-sm">
                      <span className="font-medium">Result: </span>
                      {test.result.value} {test.result.unit}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No lab tests.</p>
          )}
        </div>

        {/* Follow‑up Appointments */}
        <div>
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
            <Bell className="w-4 h-4 text-emerald-500" /> Follow‑up Appointments
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
                    <div className="flex justify-between items-start">
                      <div>
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
                          "text-[10px] font-bold px-2 py-0.5 rounded-full",
                          isPast
                            ? "bg-slate-100 text-slate-600"
                            : "bg-emerald-100 text-emerald-700",
                        )}
                      >
                        {isPast ? "Past" : "Upcoming"}
                      </span>
                    </div>
                    {fu.notes && (
                      <p className="text-xs text-slate-500 mt-1 italic">
                        "{fu.notes}"
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No follow‑ups scheduled.</p>
          )}
        </div>

        {/* Take‑home Medications */}
        <div>
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
            <Syringe className="w-4 h-4 text-emerald-500" /> Take‑home
            Medications
          </h4>
          {data.takeHomeMedications?.length ? (
            <div className="space-y-2">
              {data.takeHomeMedications.map((med, idx) => (
                <div
                  key={idx}
                  className="bg-slate-50 rounded-xl p-3 border border-slate-200"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-slate-800">
                        {med.medication}
                      </p>
                      <p className="text-xs text-slate-600">
                        {med.dosage} – {med.frequency}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      {med.source === "external" ? "External" : "Hospital"}
                    </span>
                  </div>
                  {med.instructions && (
                    <p className="text-xs text-slate-500 mt-1 italic">
                      "{med.instructions}"
                    </p>
                  )}
                  {med.dispensedAt && (
                    <p className="text-[10px] text-slate-400 mt-1">
                      Dispensed: {formatDateShort(med.dispensedAt)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No take‑home medications.</p>
          )}
        </div>

        {/* Discharge Summary */}
        {data.dischargeSummary && (
          <div>
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
              <FileCheck className="w-4 h-4 text-emerald-500" /> Discharge
              Summary
            </h4>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-sm text-slate-700 whitespace-pre-wrap">
                {data.dischargeSummary}
              </p>
              {data.dischargeDate && (
                <p className="text-xs text-slate-400 mt-2">
                  Discharged on {formatDateShort(data.dischargeDate)}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Doctor's Notes */}
        {data.doctorNotes && data.doctorNotes.length > 0 && (
          <div>
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-emerald-500" /> Doctor's Notes
            </h4>
            <div className="space-y-2">
              {data.doctorNotes.map((note, idx) => (
                <div
                  key={idx}
                  className="bg-slate-50 rounded-xl p-3 border border-slate-200"
                >
                  <div className="flex justify-between items-start">
                    <p className="font-medium text-slate-800">
                      {note.authorName}
                    </p>
                    <span className="text-xs text-slate-500">
                      {formatDateShort(note.timestamp)} at{" "}
                      {new Date(note.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 mt-1">{note.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  // ─── Loading state (skeleton) ──────────────────────────────────
  if (!user || sessionLoading || historyLoading || centersLoading) {
    return <SkeletonDozaPanel />;
  }

  // ─── Render ──────────────────────────────────────────────────
  return (
    <div
      className={cn(
        "space-y-8 p-3 md:p-6 max-w-7xl mx-auto",
        poppins.className,
      )}
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 pb-6 border-b border-slate-100">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-8 w-1 rounded-full bg-gradient-to-b from-emerald-500 to-teal-600" />
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-[0.25em]">
              Doza Network
            </span>
          </div>

          <h1
            className={cn(
              "text-4xl md:text-5xl text-slate-900 leading-[1.05] tracking-tight pt-1",
              bebasNeue.className,
            )}
          >
            Your Care Hub
          </h1>

          <p className="text-xs md:text-sm text-slate-500 max-w-lg font-medium leading-relaxed">
            Manage linked medical centers, active care sessions, pending
            requests, and your complete medical history seamlessly in one place.
          </p>
        </div>

        <motion.button
          whileHover={{ y: -1, scale: 1.01 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleRefresh}
          disabled={isRefreshing}
          className={cn(
            "group px-5 py-3 rounded-2xl bg-white hover:bg-slate-50 transition-all duration-300 flex items-center justify-center gap-2.5 border border-slate-200/80 hover:border-slate-300 shadow-sm text-xs font-bold text-slate-700 shrink-0",
            isRefreshing && "opacity-50 cursor-not-allowed hover:bg-white",
          )}
        >
          {isRefreshing ? (
            <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
          ) : (
            <RefreshCw className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors duration-300" />
          )}
          <span>{isRefreshing ? "Syncing Data..." : "Refresh Hub"}</span>
        </motion.button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-3 pt-1 px-1 scrollbar-none [-ms-overflow-style:none] [&-webkit-scrollbar]:hidden">
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

      {/* Main Content Area */}
      <BentoTile>
        <AnimatePresence mode="wait">
          {/* ONGOING TAB */}
          {activeTab === "ongoing" && (
            <motion.div
              key="ongoing"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="space-y-6"
            >
              {activeSessions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {activeSessions.map((session) => {
                    const key = `active-${session.centerId}`;
                    const isExpanded = expandedId === key;
                    return (
                      <motion.div
                        key={session.sessionId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ y: -3, transition: { duration: 0.2 } }}
                        className="group relative overflow-hidden rounded-[2rem] p-6 bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-white border border-emerald-300/80 shadow-lg shadow-emerald-950/[0.04] transition-all duration-300"
                      >
                        {/* Top Pulse Glow Accent */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 animate-pulse" />

                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4 min-w-0 flex-1">
                            {/* Icon Badge */}
                            <div className="w-12 h-12 rounded-2xl bg-emerald-100/80 border border-emerald-200/80 flex items-center justify-center shrink-0 shadow-xs text-emerald-700 transition-transform duration-300 group-hover:scale-105">
                              <Activity className="w-6 h-6 animate-pulse" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-extrabold text-slate-900 text-base tracking-tight truncate">
                                  {session.centerName}
                                </h3>
                              </div>

                              <div className="space-y-1 mt-2">
                                <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                                  Started {formatDate(session.startTime)}
                                </p>
                                <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                                  Duration: {formatDuration(session.startTime)}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Live Indicator Pill */}
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold px-3 py-1 rounded-full border tracking-wide uppercase bg-emerald-100 text-emerald-800 border-emerald-200 shadow-xs shrink-0">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-current" />
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current" />
                            </span>
                            Live Session
                          </span>
                        </div>

                        {/* Toggle Button */}
                        <div className="mt-6 pt-4 border-t border-emerald-200/60">
                          <motion.button
                            whileTap={{ scale: 0.98 }}
                            onClick={() =>
                              toggleExpand(key, session.centerId, userId!)
                            }
                            className={cn(
                              "w-full py-3 px-4 rounded-2xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2 border shadow-xs",
                              isExpanded
                                ? "bg-slate-900 text-white border-slate-900 shadow-md shadow-slate-950/10"
                                : "bg-white/90 hover:bg-white text-emerald-900 border-emerald-200 hover:border-emerald-300 shadow-xs",
                            )}
                          >
                            <span>
                              {isExpanded
                                ? "Hide Clinical Details"
                                : "View Live Clinical Details"}
                            </span>
                            <ChevronDown
                              className={cn(
                                "w-4 h-4 transition-transform duration-300",
                                isExpanded && "rotate-180",
                              )}
                            />
                          </motion.button>
                        </div>

                        {/* Expandable Clinical Details Container */}
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="mt-4 pt-4 border-t border-emerald-200/60 space-y-4 overflow-hidden"
                          >
                            <div className="bg-white/90 backdrop-blur-md rounded-2xl p-4 border border-emerald-200/60 shadow-xs">
                              {renderClinicalDetails(key)}
                            </div>
                          </motion.div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-20 px-6 bg-gradient-to-b from-slate-50/80 to-white rounded-[2.5rem] border border-dashed border-slate-200 shadow-sm"
                >
                  <div className="w-16 h-16 mx-auto bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4 border border-emerald-100 shadow-sm">
                    <Activity className="w-7 h-7" />
                  </div>
                  <p className="font-bold text-slate-800 text-base">
                    No active care sessions
                  </p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1.5 leading-relaxed">
                    You are not currently in an active care session. Connect
                    with a medical center or provider to launch a live
                    consultation.
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="mt-6 px-6 py-3 bg-slate-900 text-white rounded-2xl text-xs font-bold hover:bg-slate-800 transition shadow-lg shadow-slate-950/10"
                    onClick={() => setActivePanel("doza-map")}
                  >
                    Find a Center Near You
                  </motion.button>
                </motion.div>
              )}
            </motion.div>
          )}
          {/* HISTORY TAB */}
          {activeTab === "history" && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="space-y-6"
            >
              {history.length > 0 ? (
                <div className="space-y-4">
                  {history.map((session: SessionSummary) => {
                    const key = `history-${session.sessionId}`;
                    const isExpanded = expandedId === key;
                    const isEnded =
                      session.status === "ended" || !session.status;

                    return (
                      <motion.div
                        key={session.sessionId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ y: -2, transition: { duration: 0.2 } }}
                        className="group bg-white rounded-[1.75rem] p-5 border border-slate-200/80 shadow-sm hover:shadow-xl hover:shadow-slate-950/[0.03] transition-all duration-300 relative overflow-hidden"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4 min-w-0 flex-1">
                            {/* Icon Indicator Badge */}
                            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200/70 flex items-center justify-center shrink-0 shadow-xs group-hover:border-emerald-200 group-hover:bg-emerald-50/50 transition-colors">
                              <History className="w-5 h-5 text-emerald-600" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <h4 className="font-extrabold text-slate-900 text-sm tracking-tight truncate">
                                  {session.centerName}
                                </h4>
                                <span
                                  className={cn(
                                    "inline-flex items-center gap-1.5 text-[10px] font-extrabold px-2.5 py-1 rounded-full border tracking-wide uppercase",
                                    isEnded
                                      ? "bg-slate-100 text-slate-700 border-slate-200"
                                      : "bg-emerald-50 text-emerald-700 border-emerald-200/80 shadow-xs",
                                  )}
                                >
                                  {!isEnded && (
                                    <span className="relative flex h-1.5 w-1.5">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-current" />
                                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current" />
                                    </span>
                                  )}
                                  {session.status || "ended"}
                                </span>

                                {session.rating && (
                                  <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/80 shadow-xs">
                                    <Star className="w-3.5 h-3.5 fill-current text-amber-500" />
                                    {session.rating}/5
                                  </span>
                                )}
                              </div>

                              {/* Metadata Row */}
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 mt-2 font-medium">
                                <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                  {formatDate(session.startTime)}
                                </span>
                                <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                                  {formatDuration(
                                    session.startTime,
                                    session.endTime,
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Toggle Details Button */}
                          <motion.button
                            whileTap={{ scale: 0.96 }}
                            onClick={() =>
                              toggleExpand(key, session.centerId, userId!)
                            }
                            className={cn(
                              "px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 flex items-center gap-2 border shrink-0 shadow-xs",
                              isExpanded
                                ? "bg-slate-900 text-white border-slate-900 shadow-md shadow-slate-950/10"
                                : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80",
                            )}
                          >
                            <span>
                              {isExpanded ? "Hide Details" : "View Details"}
                            </span>
                            <ChevronDown
                              className={cn(
                                "w-4 h-4 transition-transform duration-300",
                                isExpanded && "rotate-180",
                              )}
                            />
                          </motion.button>
                        </div>

                        {/* Expandable Clinical Details & Rating Container */}
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="mt-4 pt-4 border-t border-slate-100 space-y-4 overflow-hidden"
                          >
                            <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/60">
                              {renderClinicalDetails(key)}
                            </div>

                            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
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
                            </div>
                          </motion.div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-20 px-6 bg-gradient-to-b from-slate-50/80 to-white rounded-[2.5rem] border border-dashed border-slate-200 shadow-sm"
                >
                  <div className="w-16 h-16 mx-auto bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4 border border-emerald-100 shadow-sm">
                    <History className="w-7 h-7" />
                  </div>
                  <p className="font-bold text-slate-800 text-base">
                    No session history found
                  </p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1.5 leading-relaxed">
                    Your past care sessions, consultations, and provider
                    summaries will safely archive here once completed.
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="mt-6 px-6 py-3 bg-slate-900 text-white rounded-2xl text-xs font-bold hover:bg-slate-800 transition shadow-lg shadow-slate-950/10"
                    onClick={() => setActivePanel("doza-map")}
                  >
                    Find a Center Near You
                  </motion.button>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* CENTERS TAB */}
          {activeTab === "centers" && (
            <motion.div
              key="centers"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="space-y-6"
            >
              {linkedCenters.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {linkedCenters.map((center: LinkedCenter) => {
                    const key = `center-${center.centerId}`;
                    const isExpanded = expandedId === key;
                    const hasActive = activeSessions.some(
                      (s) => s.centerId === center.centerId,
                    );
                    return (
                      <motion.div
                        key={center.centerId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ y: -3, transition: { duration: 0.2 } }}
                        className={cn(
                          "group relative overflow-hidden rounded-[2rem] p-6 border transition-all duration-300",
                          hasActive
                            ? "bg-gradient-to-br from-emerald-50/90 via-teal-50/30 to-white border-emerald-300/80 shadow-lg shadow-emerald-950/[0.04]"
                            : "bg-white border-slate-200/80 shadow-sm hover:shadow-xl hover:shadow-slate-950/[0.04]",
                        )}
                      >
                        {/* Top Accent Glow for Active State */}
                        {hasActive && (
                          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />
                        )}

                        {/* Header Section */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4 min-w-0">
                            <div
                              className={cn(
                                "w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 shadow-xs transition-transform duration-300 group-hover:scale-105",
                                hasActive
                                  ? "bg-emerald-100/80 border-emerald-200 text-emerald-700 shadow-emerald-200/50"
                                  : "bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200/70 text-slate-600 group-hover:border-emerald-200 group-hover:bg-emerald-50/50 group-hover:text-emerald-600",
                              )}
                            >
                              <Building className="w-6 h-6" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <h3 className="font-extrabold text-slate-900 text-base tracking-tight truncate">
                                  {center.centerName}
                                </h3>
                              </div>

                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs font-bold text-slate-500 capitalize px-2 py-0.5 bg-slate-100/80 rounded-md border border-slate-200/60">
                                  {center.centerType?.replace("_", " ")}
                                </span>
                                <span className="text-xs font-medium text-slate-400">
                                  • Linked {formatDate(center.linkedAt)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {hasActive && (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold px-3 py-1 rounded-full border tracking-wide uppercase bg-emerald-50 text-emerald-700 border-emerald-200/80 shadow-xs shrink-0">
                              <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-current" />
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current" />
                              </span>
                              Active Session
                            </span>
                          )}
                        </div>

                        {/* Action Button & Expand Toggle */}
                        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-3">
                          <motion.button
                            whileTap={{ scale: 0.98 }}
                            onClick={() =>
                              toggleExpand(key, center.centerId, userId!)
                            }
                            className={cn(
                              "w-full py-3 px-4 rounded-2xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2 border shadow-xs",
                              isExpanded
                                ? "bg-slate-900 text-white border-slate-900 shadow-md shadow-slate-950/10"
                                : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80 hover:border-slate-300",
                            )}
                          >
                            <span>
                              {isExpanded
                                ? "Hide Details"
                                : "View Clinical Details & Records"}
                            </span>
                            <ChevronDown
                              className={cn(
                                "w-4 h-4 transition-transform duration-300",
                                isExpanded && "rotate-180",
                              )}
                            />
                          </motion.button>
                        </div>

                        {/* Expandable Clinical Details Container */}
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="mt-4 pt-4 border-t border-slate-100 space-y-4 overflow-hidden"
                          >
                            <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/60">
                              {renderClinicalDetails(key)}
                            </div>
                          </motion.div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-20 px-6 bg-gradient-to-b from-slate-50/80 to-white rounded-[2.5rem] border border-dashed border-slate-200 shadow-sm"
                >
                  <div className="w-16 h-16 mx-auto bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4 border border-emerald-100 shadow-sm">
                    <Link2 className="w-7 h-7" />
                  </div>
                  <p className="font-bold text-slate-800 text-base">
                    No linked centers found
                  </p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1.5 leading-relaxed">
                    You haven't linked any healthcare centers yet. Connect with
                    a facility to securely access shared records, prescriptions,
                    and diagnostics.
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="mt-6 px-6 py-3 bg-slate-900 text-white rounded-2xl text-xs font-bold hover:bg-slate-800 transition shadow-lg shadow-slate-950/10"
                    onClick={() => setActivePanel("doza-map")}
                  >
                    Find a Center Near You
                  </motion.button>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* REQUESTS TAB */}
          {activeTab === "requests" && (
            <motion.div
              key="requests"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="space-y-6"
            >
              {/* Segmented Filter Control Bar */}
              <div className="flex items-center gap-2 p-1.5 bg-slate-100/80 backdrop-blur-md rounded-2xl w-fit border border-slate-200/60 shadow-inner">
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setHistoryFilter("active")}
                  className={cn(
                    "px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 relative",
                    historyFilter === "active"
                      ? "bg-white text-slate-900 shadow-md shadow-slate-950/5 border border-slate-200/80"
                      : "text-slate-500 hover:text-slate-900 bg-transparent border border-transparent",
                  )}
                >
                  Active Requests
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setHistoryFilter("history")}
                  className={cn(
                    "px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 relative",
                    historyFilter === "history"
                      ? "bg-white text-slate-900 shadow-md shadow-slate-950/5 border border-slate-200/80"
                      : "text-slate-500 hover:text-slate-900 bg-transparent border border-transparent",
                  )}
                >
                  History Archive
                </motion.button>
              </div>

              {requestsLoading ? (
                <div className="space-y-3.5">
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
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center py-20 px-6 bg-gradient-to-b from-slate-50/80 to-white rounded-[2.5rem] border border-dashed border-slate-200 shadow-sm"
                    >
                      <div className="w-16 h-16 mx-auto bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4 border border-emerald-100 shadow-sm">
                        <ClipboardCheck className="w-7 h-7" />
                      </div>
                      <p className="font-bold text-slate-800 text-base">
                        {historyFilter === "active"
                          ? "No active requests right now"
                          : "No past request history"}
                      </p>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1.5 leading-relaxed">
                        {historyFilter === "active"
                          ? "Your pending consultation, medication, or test requests will show up here as they process."
                          : "Your completed, scheduled, or cancelled medical records will be safely archived here."}
                      </p>
                      {historyFilter === "active" && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="mt-6 px-6 py-3 bg-slate-900 text-white rounded-2xl text-xs font-bold hover:bg-slate-800 transition shadow-lg shadow-slate-950/10"
                          onClick={() => setActivePanel("doza-map")}
                        >
                          Make a New Request
                        </motion.button>
                      )}
                    </motion.div>
                  ) : (
                    <div className="space-y-4">
                      {userRequests
                        .filter((req) =>
                          historyFilter === "active"
                            ? req.status === "pending"
                            : req.status !== "pending",
                        )
                        .map((req) => (
                          <motion.div
                            key={req.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{
                              y: -2,
                              transition: { duration: 0.2 },
                            }}
                            className="group bg-white rounded-[1.75rem] p-5 border border-slate-200/80 shadow-sm hover:shadow-xl hover:shadow-slate-950/[0.03] transition-all duration-300 relative overflow-hidden"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-4 min-w-0">
                                {/* Icon Indicator Badge */}
                                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200/70 flex items-center justify-center shrink-0 shadow-xs group-hover:border-emerald-200 group-hover:bg-emerald-50/50 transition-colors">
                                  {req.type === "consultation" ? (
                                    <Calendar className="w-5 h-5 text-blue-500" />
                                  ) : req.type === "prescription" ? (
                                    <Pill className="w-5 h-5 text-emerald-600" />
                                  ) : (
                                    <TestTube className="w-5 h-5 text-purple-500" />
                                  )}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2.5 flex-wrap">
                                    <h4 className="font-extrabold text-slate-900 text-sm tracking-tight truncate">
                                      {req.centerName || "Medical Center"}
                                    </h4>
                                    <span
                                      className={cn(
                                        "inline-flex items-center gap-1.5 text-[10px] font-extrabold px-2.5 py-1 rounded-full border tracking-wide uppercase",
                                        req.status === "pending"
                                          ? "bg-amber-50 text-amber-700 border-amber-200/80 shadow-xs"
                                          : req.status === "scheduled" ||
                                              req.status === "confirmed"
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200/80 shadow-xs"
                                            : req.status === "cancelled"
                                              ? "bg-rose-50 text-rose-700 border-rose-200/80 shadow-xs"
                                              : "bg-slate-100 text-slate-700 border-slate-200",
                                      )}
                                    >
                                      <span className="relative flex h-1.5 w-1.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-current" />
                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current" />
                                      </span>
                                      {req.status}
                                    </span>
                                  </div>

                                  <p className="text-xs font-semibold text-slate-400 capitalize mt-0.5 tracking-wide">
                                    {req.type}
                                  </p>

                                  {/* Details Stack */}
                                  <div className="space-y-1 mt-2.5">
                                    {req.medication && (
                                      <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                                        <span className="text-slate-400 font-semibold">
                                          Medication:
                                        </span>{" "}
                                        {req.medication}
                                      </div>
                                    )}
                                    {req.testName && (
                                      <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                                        <span className="text-slate-400 font-semibold">
                                          Test:
                                        </span>{" "}
                                        {req.testName}
                                      </div>
                                    )}
                                    {req.fulfillmentMethod && (
                                      <div className="flex items-center gap-2 mt-1.5 text-xs font-medium text-slate-600">
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
                                          <span className="text-slate-400 truncate">
                                            – {req.deliveryAddress}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                    {req.startTime && (
                                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 font-medium">
                                        <Clock className="w-3.5 h-3.5 text-slate-400" />
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

                              <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white group-hover:border-slate-900 transition-all duration-300 shrink-0 shadow-xs">
                                <ChevronDown className="w-4 h-4 -rotate-90 group-hover:rotate-0 transition-transform duration-300" />
                              </div>
                            </div>

                            {/* Full Response Notes Container */}
                            {req.responseNotes && (
                              <div className="mt-4 p-3.5 bg-emerald-50/70 border border-emerald-100/80 rounded-2xl text-xs text-emerald-900">
                                <div className="flex items-center gap-1.5 font-bold text-emerald-800 mb-1 uppercase tracking-wider text-[10px]">
                                  <span>Response Note</span>
                                </div>
                                <p className="leading-relaxed whitespace-pre-wrap font-medium">
                                  {req.responseNotes}
                                </p>
                              </div>
                            )}

                            {/* Footer Timestamp */}
                            <div className="flex items-center justify-between mt-4 pt-3.5 border-t border-slate-100 text-[11px]">
                              <span className="text-slate-400 font-medium">
                                Requested on{" "}
                                {new Date(req.createdAt).toLocaleDateString(
                                  undefined,
                                  {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  },
                                )}
                              </span>
                            </div>
                          </motion.div>
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
              className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200/80 overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 bg-gradient-to-r from-emerald-50 to-teal-50">
                <h3
                  id="vitals-history-title"
                  className={cn(
                    "text-xl font-bold text-slate-900",
                    poppins.className,
                  )}
                >
                  Vitals History
                </h3>
                <button
                  onClick={() => setShowVitalsHistory(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              {/* Controls */}
              <div className="px-6 py-3 bg-slate-50/50 border-b border-slate-200 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Chart Type:
                  </span>
                  <div className="flex gap-1">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setChartType("line")}
                      className={cn(
                        "p-1.5 rounded-lg transition-colors",
                        chartType === "line"
                          ? "bg-emerald-100 text-emerald-700"
                          : "text-slate-400 hover:bg-slate-100",
                      )}
                    >
                      <LineChart className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setChartType("bar")}
                      className={cn(
                        "p-1.5 rounded-lg transition-colors",
                        chartType === "bar"
                          ? "bg-emerald-100 text-emerald-700"
                          : "text-slate-400 hover:bg-slate-100",
                      )}
                    >
                      <BarChart3 className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setChartType("pie")}
                      className={cn(
                        "p-1.5 rounded-lg transition-colors",
                        chartType === "pie"
                          ? "bg-emerald-100 text-emerald-700"
                          : "text-slate-400 hover:bg-slate-100",
                      )}
                    >
                      <PieChart className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>

                {chartType !== "pie" && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Fields:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {vitalFields.map((field) => (
                        <motion.button
                          key={field}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => toggleVitalKey(field)}
                          className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-medium border transition-all",
                            selectedVitalKeys.includes(field)
                              ? "bg-emerald-600 text-white border-emerald-600"
                              : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50",
                          )}
                        >
                          {field.replace(/([A-Z])/g, " $1").trim()}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Chart */}
              <div className="flex-1 overflow-y-auto p-6">
                {vitalsHistoryData.length > 0 ? (
                  <div className="space-y-6">
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
                                  labels: { font: { size: 10 }, boxWidth: 12 },
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
                      ) : chartType === "line" || chartType === "bar" ? (
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
                                    labels: { font: { size: 10 } },
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
                                    labels: { font: { size: 10 } },
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
                      ) : null}
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="text-left px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              Time
                            </th>
                            <th className="text-left px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              Recorded By
                            </th>
                            {selectedVitalKeys.map((key) => (
                              <th
                                key={key}
                                className="text-left px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider"
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
                              className="hover:bg-slate-50/60 transition-colors"
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
    </div>
  );
}

// ─── Skeleton Panel ──────────────────────────────────────────────
function SkeletonDozaPanel() {
  return (
    <div className="space-y-8 p-3 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Skeleton className="h-8 w-1 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-12 w-64 md:w-80" />
          <Skeleton className="h-4 w-48 mt-2" />
        </div>
        <Skeleton className="h-12 w-32 rounded-2xl" />
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-2 pb-2">
        <Skeleton className="h-12 w-28 rounded-2xl shrink-0" />
        <Skeleton className="h-12 w-28 rounded-2xl shrink-0" />
        <Skeleton className="h-12 w-28 rounded-2xl shrink-0" />
        <Skeleton className="h-12 w-28 rounded-2xl shrink-0" />
      </div>

      {/* Main Tile */}
      <BentoTile>
        <div className="space-y-6">
          {/* Skeleton cards for active sessions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SkeletonSessionCard />
            <SkeletonSessionCard />
          </div>
        </div>
      </BentoTile>
    </div>
  );
}
