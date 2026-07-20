// app/dashboard/panels/DozaPanel.tsx

"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  History,
  Link,
  Clock,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Building,
  Calendar,
  Pill,
  Microscope,
  FileText,
  CheckCircle,
  Loader2,
  HeartPulse,
  Thermometer,
  Weight,
  RefreshCw,
  Star,
  Calendar as CalIcon,
  History as HistoryIcon,
  X,
  BarChart3,
  LineChart,
  PieChart,
} from "lucide-react";
import { useUserContext } from "../../UserContext";
import { useActiveSession } from "../../hooks/useSession";
import { useSessionHistory } from "@/app/dashboard/hooks/useSessionHistory";
import { useLinkedCenters } from "@/app/dashboard/hooks/useLinkedCenters";
import { mutate } from "swr";
import { cn } from "@/app/utils/utils";
import { poppins, bebasNeue } from "@/app/constants";

// Chart.js imports
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

// Register Chart.js components
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

// ─── Types ──────────────────────────────────────────────────────────
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
}

interface PatientClinicalData {
  id: string;
  fullName: string;
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
  }>;
  doctorNotes?: Array<{
    authorName: string;
    timestamp: string;
    content: string;
  }>;
  nursingNotes?: Array<{
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
}

// ─── Helpers ──────────────────────────────────────────────────────
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
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
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

// ─── Rating Stars ────────────────────────────────────────────────
const RatingStars = ({
  value,
  onRate,
  size = 20,
  disabled = false,
}: {
  value: number;
  onRate?: (rating: number) => void;
  size?: number;
  disabled?: boolean;
}) => {
  const [hover, setHover] = useState(0);
  const stars = [1, 2, 3, 4, 5];
  return (
    <div className="flex gap-1">
      {stars.map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onClick={() => onRate?.(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className={cn(
            "transition-colors focus:outline-none",
            disabled ? "cursor-default" : "cursor-pointer",
          )}
        >
          <Star
            size={size}
            className={cn(
              "fill-current transition-colors",
              (hover || value) >= star ? "text-amber-400" : "text-slate-300",
            )}
          />
        </button>
      ))}
    </div>
  );
};

// ─── Tab Button ──────────────────────────────────────────────────
const TabButton = ({ active, onClick, icon: Icon, label, count }: any) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap",
      active
        ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200/50"
        : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200",
    )}
  >
    <Icon className="w-4 h-4" />
    {label}
    {count !== undefined && (
      <span
        className={cn(
          "ml-1 text-[10px] font-bold px-2 py-0.5 rounded-full",
          active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600",
        )}
      >
        {count}
      </span>
    )}
  </button>
);

// ─── BentoTile ──────────────────────────────────────────────────
const BentoTile = ({ children, className }: any) => (
  <motion.div
    whileHover={{ y: -2 }}
    transition={{ type: "spring", stiffness: 200, damping: 25 }}
    className={cn(
      "rounded-[30px] bg-white border border-slate-100 shadow-sm transition-all p-4 md:p-6",
      className,
    )}
  >
    {children}
  </motion.div>
);

// ─── Main Component ──────────────────────────────────────────────
export default function DozaPanel() {
  const user = useUserContext(); // ✅ use session user instead of Firebase auth
  const userId = user?.id;

  // ─── Data Hooks ────────────────────────────────────────────────
  const { session: activeSession, loading: sessionLoading } =
    useActiveSession(userId);
  const { sessions: initialHistory, loading: historyLoading } =
    useSessionHistory(userId);
  const { centers: linkedCenters, loading: centersLoading } =
    useLinkedCenters(userId);

  const [history, setHistory] = useState<SessionSummary[]>([]);
  const [activeTab, setActiveTab] = useState<"ongoing" | "history" | "centers">(
    "ongoing",
  );

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [clinicalDataMap, setClinicalDataMap] = useState<
    Record<string, PatientClinicalData>
  >({});
  const [loadingClinical, setLoadingClinical] = useState<
    Record<string, boolean>
  >({});

  // Vitals history modal state
  const [showVitalsHistory, setShowVitalsHistory] = useState(false);
  const [vitalsHistoryData, setVitalsHistoryData] = useState<any[]>([]);
  const [chartType, setChartType] = useState<"line" | "bar" | "pie">("line");
  const [selectedVitalKey, setSelectedVitalKey] = useState<string>("heartRate");

  const [isRefreshing, setIsRefreshing] = useState(false);

  const prevInitialHistoryRef = useRef<SessionSummary[]>([]);
  useEffect(() => {
    if (
      JSON.stringify(initialHistory) !==
      JSON.stringify(prevInitialHistoryRef.current)
    ) {
      prevInitialHistoryRef.current = initialHistory;
      setHistory(initialHistory);
    }
  }, [initialHistory]);

  // ─── Refresh Handler ──────────────────────────────────────────
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await mutate(`/api/user/${userId}/active-session`);
      await mutate(`/api/user/${userId}/sessions`);
      await mutate(`/api/user/${userId}/linked-centers`);
      setClinicalDataMap({});
      setExpandedId(null);
    } catch (err) {
      console.error("Refresh failed:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // ─── Chart Data ────────────────────────────────────────────────
  const getVitalLabels = (data: any[]) => {
    return data.map((r) => new Date(r.timestamp).toLocaleString());
  };

  const getVitalValues = (data: any[], key: string) => {
    return data.map((r) => (r[key] !== undefined ? r[key] : null));
  };

  const vitalFields =
    vitalsHistoryData.length > 0
      ? Object.keys(vitalsHistoryData[0]).filter(
          (k) => !["timestamp", "recordedBy", "recordedById"].includes(k),
        )
      : [];

  const chartData = {
    labels: getVitalLabels(vitalsHistoryData),
    datasets: [
      {
        label: selectedVitalKey.replace(/([A-Z])/g, " $1").trim(),
        data: getVitalValues(vitalsHistoryData, selectedVitalKey),
        borderColor: "rgb(16, 185, 129)",
        backgroundColor: "rgba(16, 185, 129, 0.2)",
        borderWidth: 2,
        pointRadius: 4,
        pointBackgroundColor: "rgb(16, 185, 129)",
        tension: 0.3,
      },
    ],
  };

  const pieChartData = {
    labels: vitalFields.map((f) => f.replace(/([A-Z])/g, " $1").trim()),
    datasets: [
      {
        data: vitalFields.map((field) => {
          const values = getVitalValues(vitalsHistoryData, field).filter(
            (v) => v !== null,
          );
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

  // ─── Fetch Clinical Data ───────────────────────────────────────
  const fetchClinicalData = async (
    centerId: string,
    patientId: string,
    key: string,
  ) => {
    if (clinicalDataMap[key]) return;
    setLoadingClinical((prev) => ({ ...prev, [key]: true }));
    try {
      // ✅ Use fetch with credentials: "include" – session cookie is sent automatically
      const res = await fetch(
        `/api/centers/${centerId}/patients/${patientId}`,
        {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            // x-user-id header is also sent by api.ts, but we're using direct fetch
            // so we need to add it manually or use the session cookie
          },
        },
      );
      const data = await res.json();
      if (data.success) {
        setClinicalDataMap((prev) => ({ ...prev, [key]: data.data }));
      }
    } catch (err) {
      console.error("Failed to fetch clinical data", err);
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

  const renderClinicalDetails = (key: string) => {
    const data = clinicalDataMap[key];
    if (loadingClinical[key]) {
      return (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
          <span className="ml-2 text-sm text-slate-500">
            Loading clinical data...
          </span>
        </div>
      );
    }
    if (!data) return null;
    return (
      <div className="space-y-6">
        {/* Vitals */}
        <div>
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
            <HeartPulse className="w-4 h-4 text-emerald-500" />
            Vitals
          </h4>
          <VitalsDisplay vitals={data.vitals} />
          {data.vitalsHistory && data.vitalsHistory.length > 0 && (
            <button
              onClick={() => {
                setVitalsHistoryData(data.vitalsHistory || []);
                const firstRecord = data.vitalsHistory?.[0];
                const firstKey = firstRecord
                  ? Object.keys(firstRecord).find(
                      (k) =>
                        !["timestamp", "recordedBy", "recordedById"].includes(
                          k,
                        ),
                    )
                  : null;
                setSelectedVitalKey(firstKey || "heartRate");
                setShowVitalsHistory(true);
              }}
              className="mt-2 text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1 transition-colors"
            >
              <HistoryIcon className="w-3 h-3" />
              View Vitals History ({data.vitalsHistory.length} records)
            </button>
          )}
        </div>

        {/* Prescriptions */}
        <div>
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
            <Pill className="w-4 h-4 text-emerald-500" />
            Prescriptions
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
                      <CalIcon className="w-3 h-3" />
                      Follow-up:{" "}
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

        {/* Tests */}
        <div>
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
            <Microscope className="w-4 h-4 text-emerald-500" />
            Lab Tests
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

        {/* Notes */}
        <div>
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-emerald-500" />
            Notes
          </h4>
          {data.doctorNotes?.length ? (
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-500">Doctor's Notes</p>
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
          ) : null}
          {data.nursingNotes?.length ? (
            <div className="space-y-2 mt-3">
              <p className="text-xs font-bold text-slate-500">Nursing Notes</p>
              {data.nursingNotes.map((note, idx) => (
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
          ) : null}
          {!data.doctorNotes?.length && !data.nursingNotes?.length && (
            <p className="text-sm text-slate-500">No notes available.</p>
          )}
        </div>
      </div>
    );
  };

  // ─── Loading State ──────────────────────────────────────────────
  if (!user) {
    return <LoadingState />;
  }

  if (sessionLoading || historyLoading || centersLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <div className={cn("space-y-6 p-2 md:p-6", poppins.className)}>
      {/* ─── Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-8 w-1 rounded-full bg-gradient-to-b from-emerald-500 to-teal-600" />
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-[0.25em]">
              Doza Health Network
            </span>
          </div>
          <h1
            className={cn(
              "text-3xl md:text-5xl lg:text-6xl text-slate-900 leading-[1.1] tracking-tight",
              bebasNeue.className,
            )}
          >
            Sessions & Centers
          </h1>
          <p className="text-sm text-slate-700 mt-2 max-w-md">
            Manage your linked centers, active sessions, and care history.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className={cn(
            "px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm text-sm font-medium text-slate-700",
            isRefreshing && "opacity-50 cursor-not-allowed",
          )}
        >
          {isRefreshing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* ─── Tabs ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        <TabButton
          active={activeTab === "ongoing"}
          onClick={() => setActiveTab("ongoing")}
          icon={Activity}
          label="Ongoing"
          count={activeSession ? 1 : 0}
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
          icon={Link}
          label="Linked Centers"
          count={linkedCenters.length}
        />
      </div>

      {/* ─── Content ────────────────────────────────────────────────── */}
      <BentoTile>
        <AnimatePresence mode="wait">
          {/* ─── ONGOING ───────────────────────────────────────────── */}
          {activeTab === "ongoing" && (
            <motion.div
              key="ongoing"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {activeSession ? (
                <div className="space-y-5">
                  <div className="flex items-center gap-3 text-emerald-600">
                    <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-sm font-bold uppercase tracking-widest">
                      Session Active
                    </span>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-4 md:p-6 border border-emerald-100">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
                          {activeSession.centerType || "Healthcare Center"}
                        </p>
                        <h3 className="text-xl md:text-2xl font-bold text-slate-900 mt-1">
                          {activeSession.centerName || "Healthcare Center"}
                        </h3>
                        <p className="text-sm text-slate-600 mt-1">
                          Session ID:{" "}
                          <span className="font-mono text-xs">
                            {activeSession.sessionId?.slice(0, 8)}
                          </span>
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold self-start">
                        <CheckCircle className="w-3 h-3" /> Active
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Started
                        </p>
                        <p className="text-sm font-medium text-slate-700">
                          {formatDate(activeSession.startTime)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Duration
                        </p>
                        <p className="text-sm font-medium text-slate-700 flex items-center gap-1">
                          <Clock className="w-4 h-4 text-emerald-500" />
                          {formatDuration(activeSession.startTime)}
                        </p>
                      </div>
                      <div className="col-span-2 md:col-span-1">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Status
                        </p>
                        <p className="text-sm font-medium text-emerald-600">
                          In Progress
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      const key = `ongoing-${activeSession.centerId}`;
                      toggleExpand(key, activeSession.centerId, userId!);
                    }}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition flex items-center justify-center gap-2"
                  >
                    {expandedId === `ongoing-${activeSession.centerId}`
                      ? "Hide Details"
                      : "View Details"}
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 transition-transform",
                        expandedId === `ongoing-${activeSession.centerId}` &&
                          "rotate-180",
                      )}
                    />
                  </button>

                  {expandedId === `ongoing-${activeSession.centerId}` && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      {renderClinicalDetails(
                        `ongoing-${activeSession.centerId}`,
                      )}
                    </motion.div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <Activity className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <p className="font-medium text-slate-700">
                    No active session
                  </p>
                  <p className="text-sm">
                    You are not currently in an active care session.
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* ─── HISTORY ───────────────────────────────────────────── */}
          {activeTab === "history" && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {history.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {history.map((session: SessionSummary) => {
                    const key = `history-${session.sessionId}`;
                    const isExpanded = expandedId === key;
                    return (
                      <div
                        key={session.sessionId}
                        className="py-4 first:pt-0 last:pb-0"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-slate-900">
                                {session.centerName}
                              </span>
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
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDate(session.startTime)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatDuration(
                                  session.startTime,
                                  session.endTime,
                                )}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() =>
                              toggleExpand(key, session.centerId, userId!)
                            }
                            className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-medium border border-slate-200 transition flex items-center gap-2 self-start"
                          >
                            {isExpanded ? "Hide" : "View Details"}
                            <ChevronDown
                              className={cn(
                                "w-4 h-4 transition-transform",
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
                            className="mt-3 pl-4 border-l-2 border-emerald-200 space-y-3 overflow-hidden"
                          >
                            {renderClinicalDetails(key)}

                            {/* Rating Section */}
                            <div className="pt-3 border-t border-slate-200">
                              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                Rate your experience
                              </p>
                              <div className="flex flex-wrap items-center gap-4">
                                <RatingStars
                                  value={session.rating || 0}
                                  onRate={async (rating) => {
                                    try {
                                      const res = await fetch(
                                        `/api/user/${userId}/rate`,
                                        {
                                          method: "POST",
                                          headers: {
                                            "Content-Type": "application/json",
                                          },
                                          credentials: "include",
                                          body: JSON.stringify({
                                            centerId: session.centerId,
                                            sessionId: session.sessionId,
                                            rating,
                                          }),
                                        },
                                      );
                                      if (res.ok) {
                                        setHistory((prev) =>
                                          prev.map((s) =>
                                            s.sessionId === session.sessionId
                                              ? { ...s, rating }
                                              : s,
                                          ),
                                        );
                                      }
                                    } catch (err) {
                                      console.error(
                                        "Failed to rate session",
                                        err,
                                      );
                                    }
                                  }}
                                />
                                <span className="text-xs text-slate-500">
                                  {session.rating
                                    ? `Rated: ${session.rating}/5`
                                    : "Tap a star to rate"}
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <History className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <p className="font-medium text-slate-700">
                    No session history
                  </p>
                  <p className="text-sm">
                    Your past care sessions will appear here.
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* ─── CENTERS ───────────────────────────────────────────── */}
          {activeTab === "centers" && (
            <motion.div
              key="centers"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {linkedCenters.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {linkedCenters.map((center: LinkedCenter) => {
                    const key = `center-${center.centerId}`;
                    const isExpanded = expandedId === key;
                    return (
                      <div
                        key={center.centerId}
                        className="bg-slate-50 rounded-xl p-4 border border-slate-200 hover:shadow-md transition-shadow"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <Building className="w-4 h-4 text-emerald-500" />
                              <h4 className="font-bold text-slate-900">
                                {center.centerName}
                              </h4>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                              {center.centerType}
                            </p>
                            <p className="text-xs text-slate-400 mt-2">
                              Linked {formatDate(center.linkedAt)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded-full",
                                center.status === "active"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-slate-200 text-slate-600",
                              )}
                            >
                              {center.status}
                            </span>
                            <button
                              onClick={() =>
                                toggleExpand(key, center.centerId, userId!)
                              }
                              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium border border-slate-200 transition flex items-center gap-1"
                            >
                              {isExpanded ? "Hide" : "View Details"}
                              <ChevronDown
                                className={cn(
                                  "w-4 h-4 transition-transform",
                                  isExpanded && "rotate-180",
                                )}
                              />
                            </button>
                          </div>
                        </div>

                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-4 pt-4 border-t border-slate-200 space-y-3 overflow-hidden"
                          >
                            {renderClinicalDetails(key)}
                          </motion.div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <Link className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <p className="font-medium text-slate-700">
                    No linked centers
                  </p>
                  <p className="text-sm">
                    You haven't linked any healthcare centers yet.
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </BentoTile>

      {/* ─── Vitals History Modal ───────────────────────────────────── */}
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
              className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200/80 overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-slate-200/80 bg-gradient-to-r from-emerald-50 to-teal-50">
                <h3
                  id="vitals-history-title"
                  className={cn(
                    "text-lg font-bold text-slate-900",
                    poppins.className,
                  )}
                >
                  Vitals History
                </h3>
                <button
                  onClick={() => setShowVitalsHistory(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              {/* Chart Controls */}
              <div className="px-4 md:px-6 py-3 bg-slate-50/50 border-b border-slate-200 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Chart Type:
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setChartType("line")}
                      className={cn(
                        "p-1.5 rounded-lg transition-colors",
                        chartType === "line"
                          ? "bg-emerald-100 text-emerald-700"
                          : "text-slate-400 hover:bg-slate-100",
                      )}
                      title="Line Chart"
                    >
                      <LineChart className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setChartType("bar")}
                      className={cn(
                        "p-1.5 rounded-lg transition-colors",
                        chartType === "bar"
                          ? "bg-emerald-100 text-emerald-700"
                          : "text-slate-400 hover:bg-slate-100",
                      )}
                      title="Bar Chart"
                    >
                      <BarChart3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setChartType("pie")}
                      className={cn(
                        "p-1.5 rounded-lg transition-colors",
                        chartType === "pie"
                          ? "bg-emerald-100 text-emerald-700"
                          : "text-slate-400 hover:bg-slate-100",
                      )}
                      title="Pie Chart"
                    >
                      <PieChart className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {chartType !== "pie" && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Field:
                    </span>
                    <select
                      value={selectedVitalKey}
                      onChange={(e) => setSelectedVitalKey(e.target.value)}
                      className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                    >
                      {vitalFields.map((field) => (
                        <option key={field} value={field}>
                          {field.replace(/([A-Z])/g, " $1").trim()}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Chart Container */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6">
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
                                  labels: {
                                    font: { size: 10 },
                                    boxWidth: 12,
                                  },
                                },
                                title: {
                                  display: true,
                                  text: "Average Vitals",
                                  font: { size: 14, weight: "bold" },
                                },
                              },
                            }}
                            className="max-h-[300px] w-full"
                          />
                        </div>
                      ) : chartType === "line" ? (
                        <Line
                          data={chartData}
                          options={{
                            responsive: true,
                            plugins: {
                              legend: {
                                display: true,
                                position: "top",
                                labels: {
                                  font: { size: 10 },
                                },
                              },
                              title: {
                                display: true,
                                text: `${selectedVitalKey.replace(/([A-Z])/g, " $1").trim()} over time`,
                                font: { size: 14, weight: "bold" },
                              },
                            },
                            scales: {
                              y: {
                                beginAtZero: true,
                                grid: { color: "rgba(0,0,0,0.05)" },
                              },
                              x: {
                                grid: { display: false },
                                ticks: {
                                  maxTicksLimit: 10,
                                  font: { size: 8 },
                                },
                              },
                            },
                            maintainAspectRatio: false,
                          }}
                          className="h-[250px] md:h-[300px] w-full"
                        />
                      ) : (
                        <Bar
                          data={chartData}
                          options={{
                            responsive: true,
                            plugins: {
                              legend: {
                                display: true,
                                position: "top",
                                labels: {
                                  font: { size: 10 },
                                },
                              },
                              title: {
                                display: true,
                                text: `${selectedVitalKey.replace(/([A-Z])/g, " $1").trim()} over time`,
                                font: { size: 14, weight: "bold" },
                              },
                            },
                            scales: {
                              y: {
                                beginAtZero: true,
                                grid: { color: "rgba(0,0,0,0.05)" },
                              },
                              x: {
                                grid: { display: false },
                                ticks: {
                                  maxTicksLimit: 10,
                                  font: { size: 8 },
                                },
                              },
                            },
                            maintainAspectRatio: false,
                          }}
                          className="h-[250px] md:h-[300px] w-full"
                        />
                      )}
                    </div>

                    {/* Data Table */}
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
                            {vitalFields.map((field) => (
                              <th
                                key={field}
                                className="text-left px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider"
                              >
                                {field.replace(/([A-Z])/g, " $1").trim()}
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
                              {vitalFields.map((field) => (
                                <td
                                  key={field}
                                  className="px-4 py-3 text-xs text-slate-700"
                                >
                                  {record[field] !== undefined &&
                                  record[field] !== null
                                    ? `${record[field]}`
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

// ─── Loading State ──────────────────────────────────────────────────
function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
    </div>
  );
}
