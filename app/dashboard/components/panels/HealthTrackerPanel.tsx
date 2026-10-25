// app/dashboard/panels/HealthTracker.tsx
"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import useSWR from "swr";
import {
  Download,
  FileSpreadsheet,
  Plus,
  Stethoscope,
  Activity,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

import { authFetcher } from "@/app/utils/client-auth";
import { useUser } from "../../hooks/useProfile";
import { cn } from "@/app/utils/utils";
import { poppins } from "@/app/constants";

import {
  metricConfig,
  MetricType,
  HealthRecord,
  ChartDataPoint,
} from "@/app/types/healthtracker";

import { MetricSelector } from "../subcomponents/healthtracker/MetricSelector";
import { MetricStatsCards } from "../subcomponents/healthtracker/MetricStatsCard";
import { TelemetryChart } from "../subcomponents/healthtracker/Telemetry";
import { DataEntryModal } from "../subcomponents/healthtracker/DataEntryModal";

// ─── Constants ──────────────────────────────────────────────
const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2";

const SKELETON_BARS = [45, 70, 35, 80, 55, 65, 40];

const VALID_METRICS: MetricType[] = [
  "heartRate",
  "bloodPressure",
  "steps",
  "weight",
];

const SWR_PANEL_CONFIG = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 60_000,
  keepPreviousData: true,
  revalidateIfStale: false,
} as const;

// ─── sessionStorage helpers ────────────────────────────────
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

// ─── Utility exports ───────────────────────────────────────
const generateSecureReportID = (): string => {
  if (typeof window !== "undefined" && window.crypto) {
    if (window.crypto.randomUUID)
      return `DOZA-${window.crypto.randomUUID().substring(0, 8).toUpperCase()}`;
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    return `DOZA-${array[0].toString(36).substring(0, 8).toUpperCase()}`;
  }
  return `DOZA-STATICID`;
};

export const getNumericValue = (record: HealthRecord): number => {
  if (
    record.type === "bloodPressure" &&
    typeof record.value === "object" &&
    record.value !== null
  ) {
    return (record.value as { systolic: number }).systolic;
  }
  return typeof record.value === "number"
    ? record.value
    : Number(record.value || 0);
};

export const formatDisplayValue = (record: HealthRecord): string => {
  if (
    record.type === "bloodPressure" &&
    typeof record.value === "object" &&
    record.value !== null
  ) {
    const bp = record.value as { systolic: number; diastolic: number };
    return `${bp.systolic}/${bp.diastolic}`;
  }
  return String(record.value ?? 0);
};

// ─── Main component ────────────────────────────────────────
export default function HealthTracker() {
  const [selectedType, setSelectedType] = useState<MetricType>(() => {
    const stored = ssGet("health:selectedType");
    if (stored && VALID_METRICS.includes(stored as MetricType)) {
      return stored as MetricType;
    }
    return "heartRate";
  });
  useEffect(() => {
    ssSet("health:selectedType", selectedType);
  }, [selectedType]);

  const [showForm, setShowForm] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [uniqueReportId, setUniqueReportId] = useState<string>("DOZA-PENDING");
  useEffect(() => {
    setUniqueReportId(generateSecureReportID());
  }, []);

  const chartRef = useRef<HTMLDivElement>(null);
  const pdfTemplateRef = useRef<HTMLDivElement>(null);

  const { user } = useUser();

  const { data, mutate, isLoading } = useSWR<{
    success: boolean;
    data: HealthRecord[];
  }>("/api/health-records", authFetcher, SWR_PANEL_CONFIG);

  const scrollerRef = useRef<HTMLElement | null>(null);
  const scrollRestoredRef = useRef(false);
  useEffect(() => {
    const el =
      (document.getElementById("dashboard-scroll") as HTMLElement | null) ||
      (document.querySelector("main") as HTMLElement | null);
    scrollerRef.current = el;
    if (!el) return;

    if (!scrollRestoredRef.current) {
      const saved = ssGet("health:scroll");
      el.scrollTo({ top: saved ? Number(saved) : 0, behavior: "instant" });
      scrollRestoredRef.current = true;
    }

    const onScroll = () => ssSet("health:scroll", String(el.scrollTop));
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const records = useMemo(() => (data?.success ? data.data : []), [data]);

  const filteredRecords = useMemo(() => {
    return records
      .filter((r) => r.type === selectedType)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [records, selectedType]);

  const chartData = useMemo<ChartDataPoint[]>(() => {
    return filteredRecords.map((r) => ({
      date: r.date,
      displayValue: formatDisplayValue(r),
      numericValue: getNumericValue(r),
      originalRecord: r,
    }));
  }, [filteredRecords]);

  const stats = useMemo(() => {
    if (filteredRecords.length === 0) return { avg: 0, min: 0, max: 0 };

    if (selectedType === "bloodPressure") {
      const systolicVals = filteredRecords.map((r) =>
        typeof r.value === "object" && r.value ? (r.value as any).systolic : 0,
      );
      const diastolicVals = filteredRecords.map((r) =>
        typeof r.value === "object" && r.value ? (r.value as any).diastolic : 0,
      );

      return {
        avg: {
          systolic: Math.round(
            systolicVals.reduce((a, b) => a + b, 0) / systolicVals.length,
          ),
          diastolic: Math.round(
            diastolicVals.reduce((a, b) => a + b, 0) / diastolicVals.length,
          ),
        },
        min: {
          systolic: Math.min(...systolicVals),
          diastolic: Math.min(...diastolicVals),
        },
        max: {
          systolic: Math.max(...systolicVals),
          diastolic: Math.max(...diastolicVals),
        },
      };
    }

    const values = filteredRecords.map((r) => getNumericValue(r));
    return {
      avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }, [filteredRecords, selectedType]);

  const handleExportCSV = () => {
    if (filteredRecords.length === 0) return;
    const headers = ["Date", "Metric", "Value", "Unit"];
    const rows = filteredRecords.map((r) => [
      r.date,
      metricConfig[selectedType].label,
      formatDisplayValue(r),
      metricConfig[selectedType].unit,
    ]);
    const csvContent = [headers, ...rows].map((e) => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Health_Data_${selectedType}_${
      new Date().toISOString().split("T")[0]
    }.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleExportPDF = async () => {
    if (!pdfTemplateRef.current || !chartRef.current || isExporting) return;
    setIsExporting(true);
    try {
      const chartCanvas = await html2canvas(chartRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
      });
      const chartImg = chartCanvas.toDataURL("image/png");

      const template = pdfTemplateRef.current;
      const imgElement = template.querySelector(
        "#captured-chart",
      ) as HTMLImageElement | null;
      if (imgElement) {
        await new Promise<void>((resolve, reject) => {
          imgElement.onload = () => resolve();
          imgElement.onerror = () =>
            reject(new Error("PDF Engine initialization failed"));
          imgElement.src = chartImg;
        });
      }

      template.style.display = "block";
      await new Promise((r) => setTimeout(r, 250));

      const canvas = await html2canvas(template, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(
        `Health_Report_${selectedType.toUpperCase()}_${
          new Date().toISOString().split("T")[0]
        }.pdf`,
      );
    } catch (err) {
      console.error("PDF generation block error:", err);
      alert("Unable to generate PDF report at this time.");
    } finally {
      if (pdfTemplateRef.current) pdfTemplateRef.current.style.display = "none";
      setIsExporting(false);
    }
  };

  const handleFormSubmissionSuccess = () => {
    mutate();
    setShowForm(false);
  };

  if (isLoading && !data) return <HealthTrackerSkeleton />;

  const isBP = selectedType === "bloodPressure";
  const renderPdfValue = (val: any) => {
    if (isBP && val && typeof val === "object") {
      return `${val.systolic}/${val.diastolic}`;
    }
    return String(val);
  };

  const hasAnyData = records.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "min-h-screen bg-[#F8FAFC] pb-28 pt-2 text-slate-900 selection:bg-emerald-100 antialiased",
        poppins.className,
      )}
    >
      {/* Hidden PDF Engine */}
      <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
        <div
          ref={pdfTemplateRef}
          className="hidden w-[210mm] min-h-[297mm] bg-white p-[15mm] font-poppins"
        >
          <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h1 className="text-xl font-black uppercase leading-none tracking-tight text-slate-900">
                DOZA<span className="text-emerald-500">.</span>
              </h1>
              <p className="mt-1 text-[8px] font-black uppercase tracking-widest text-slate-400">
                Official Medical Data Report
              </p>
            </div>
            <div className="text-right text-[10px]">
              <p className="font-bold text-slate-900">
                {user?.fullName || "Account Patient"}
              </p>
              <p className="text-slate-500">{user?.email || ""}</p>
              <p className="mt-0.5 font-mono text-[8px] text-slate-400">
                ID: {uniqueReportId}
              </p>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-3 gap-3 text-center">
            {[
              { label: "Activity Average", val: stats.avg },
              { label: "Lowest Value", val: stats.min },
              { label: "Highest Value", val: stats.max },
            ].map((s, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-slate-100 bg-slate-50 p-3 shadow-2xs"
              >
                <p className="mb-0.5 text-[8px] font-bold uppercase tracking-wider text-slate-400">
                  {s.label}
                </p>
                <p className="text-base font-black text-slate-900">
                  {renderPdfValue(s.val)}{" "}
                  <span className="text-[10px] font-normal text-slate-500">
                    {metricConfig[selectedType].unit}
                  </span>
                </p>
              </div>
            ))}
          </div>

          <div className="mb-6">
            <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Historical Timeline Log ({metricConfig[selectedType].label})
            </p>
            <div className="flex h-[220px] w-full items-center justify-center rounded-xl border border-slate-100 bg-white p-3 shadow-2xs">
              <img
                id="captured-chart"
                alt="Health Data Curve Chart"
                className="max-h-full max-w-full object-contain"
              />
            </div>
          </div>

          <div>
            <table className="w-full border-collapse text-left text-[10px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-bold text-slate-500">
                  <th className="p-2">Log Entry Date</th>
                  <th className="p-2 text-center">Recorded Measurement</th>
                  <th className="p-2 text-center">Standard Range</th>
                  <th className="p-2 text-right">Medical Evaluation</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords
                  .slice(-8)
                  .reverse()
                  .map((r, i) => {
                    const numVal = getNumericValue(r);
                    let status = "NORMAL";
                    let color = "text-emerald-600";
                    if (numVal > metricConfig[selectedType].criticalMax) {
                      status = "ELEVATED";
                      color = "text-red-500";
                    } else if (
                      numVal < metricConfig[selectedType].criticalMin
                    ) {
                      status = "LOW";
                      color = "text-amber-500";
                    }
                    return (
                      <tr
                        key={i}
                        className="border-b border-slate-100 font-medium text-slate-700"
                      >
                        <td className="p-2 font-semibold">{r.date}</td>
                        <td className="p-2 text-center font-bold">
                          {formatDisplayValue(r)}{" "}
                          {metricConfig[selectedType].unit}
                        </td>
                        <td className="p-2 text-center text-slate-400">
                          {metricConfig[selectedType].criticalMin} -{" "}
                          {metricConfig[selectedType].criticalMax}
                        </td>
                        <td
                          className={`p-2 text-right text-[9px] font-bold ${color}`}
                        >
                          {status}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Main view */}
      <main className="mx-auto max-w-7xl px-4 pt-3 sm:px-6 lg:px-8 space-y-4 lg:space-y-6">
        {/* ─── HEADER — matches Dashboard header pattern ──────── */}
        <header className="pt-1 lg:pt-2 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight leading-tight">
                Health Tracker
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Track your vitals over time. Export reports for your doctor
                anytime.
              </p>
            </div>

            {/* Export icons + desktop Add entry */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleExportCSV}
                disabled={filteredRecords.length === 0}
                aria-label="Export data as CSV"
                title="Export CSV"
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-600 shadow-xs transition-all duration-150 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed",
                  FOCUS,
                )}
              >
                <FileSpreadsheet size={18} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={handleExportPDF}
                disabled={isExporting || filteredRecords.length === 0}
                aria-label="Export data as PDF"
                title="Export PDF"
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-600 shadow-xs transition-all duration-150 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed",
                  FOCUS,
                )}
              >
                {isExporting ? (
                  <span
                    className="h-4 w-4 rounded-full border-2 border-slate-400 border-t-transparent animate-spin"
                    aria-hidden
                  />
                ) : (
                  <Download size={18} aria-hidden="true" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowForm(true)}
                className={cn(
                  "hidden h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white shadow-sm shadow-emerald-600/25 transition-all duration-150 hover:bg-emerald-700 active:scale-[0.97] sm:inline-flex",
                  FOCUS,
                )}
              >
                <Plus size={16} aria-hidden="true" />
                <span>Add entry</span>
              </button>
            </div>
          </div>

          {/* Mobile-only full-width primary CTA */}
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className={cn(
              "sm:hidden w-full min-h-12 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white shadow-sm shadow-emerald-600/25 transition-all duration-150 hover:bg-emerald-700 active:scale-[0.98]",
              FOCUS,
            )}
          >
            <Plus size={18} aria-hidden="true" />
            <span>Add entry</span>
          </button>
        </header>

        {/* Empty state OR full content */}
        {!hasAnyData ? (
          <HealthTrackerEmpty onAdd={() => setShowForm(true)} />
        ) : (
          <>
            <div className="lg:hidden">
              <MetricSelector
                variant="chips"
                selectedType={selectedType}
                onSelectMetric={setSelectedType}
              />
            </div>

            <MetricStatsCards stats={stats} currentMetric={selectedType} />

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-4 lg:gap-6">
              <aside className="hidden flex-col gap-4 lg:flex">
                <MetricSelector
                  variant="list"
                  selectedType={selectedType}
                  onSelectMetric={setSelectedType}
                />

                <div className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-800 p-5 text-white shadow-md shadow-slate-950/10">
                  <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-emerald-500/10 blur-2xl transition-all duration-500 group-hover:bg-emerald-500/25" />
                  <div className="mb-2 flex items-center gap-2">
                    <Stethoscope
                      className="h-3.5 w-3.5 text-emerald-400"
                      aria-hidden="true"
                    />
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">
                      Clinical Insight
                    </span>
                  </div>
                  <p className="text-xs font-medium leading-relaxed text-slate-300">
                    {metricConfig[selectedType].tip}
                  </p>
                </div>
              </aside>

              <div
                ref={chartRef}
                className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition-shadow duration-300 sm:p-5 lg:col-span-3 lg:hover:shadow-md"
              >
                <TelemetryChart
                  chartData={chartData}
                  currentMetric={selectedType}
                  filteredRecords={filteredRecords}
                />
              </div>
            </div>

            <div className="lg:hidden">
              <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-800 p-4 text-white shadow-md">
                <div className="absolute right-0 top-0 h-20 w-20 rounded-full bg-emerald-500/10 blur-2xl" />
                <div className="mb-1.5 flex items-center gap-2">
                  <Stethoscope
                    className="h-3.5 w-3.5 text-emerald-400"
                    aria-hidden="true"
                  />
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">
                    Clinical Insight
                  </span>
                </div>
                <p className="text-xs font-medium leading-relaxed text-slate-300">
                  {metricConfig[selectedType].tip}
                </p>
              </div>
            </div>
          </>
        )}
      </main>

      <AnimatePresence>
        {showForm && (
          <DataEntryModal
            currentMetric={selectedType}
            onClose={() => setShowForm(false)}
            onSuccess={handleFormSubmissionSuccess}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Empty State ──────────────────────────────────────────
function HealthTrackerEmpty({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-8 sm:p-12 text-center shadow-xs">
      <div className="w-16 h-16 rounded-2xl bg-emerald-50 inline-flex items-center justify-center mb-4 mx-auto">
        <Activity size={28} className="text-emerald-700" />
      </div>
      <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-2 tracking-tight">
        Start tracking your vitals
      </h2>
      <p className="text-sm text-slate-600 max-w-sm mx-auto mb-6 leading-relaxed">
        Add your first reading to see trends, insights, and share reports with
        your doctor.
      </p>
      <button
        onClick={onAdd}
        className={cn(
          "inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-emerald-600 text-white font-bold text-sm shadow-sm shadow-emerald-600/25 hover:bg-emerald-700 active:scale-[0.97] transition-all",
          FOCUS,
        )}
      >
        <Plus size={18} aria-hidden="true" />
        Add your first entry
      </button>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────
function HealthTrackerSkeleton() {
  return (
    <div className="mx-auto min-h-screen max-w-7xl animate-pulse space-y-4 lg:space-y-6 px-4 pt-3 pb-28 sm:px-6 lg:px-8">
      <div className="space-y-3 pt-1 lg:pt-2">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div className="flex-1 space-y-2">
            <div className="h-9 w-56 rounded-lg bg-slate-200 md:h-11 md:w-64" />
            <div className="h-3.5 w-72 rounded-lg bg-slate-200" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-11 w-11 rounded-xl bg-slate-200" />
            <div className="h-11 w-11 rounded-xl bg-slate-200" />
            <div className="hidden h-11 w-24 rounded-xl bg-slate-200 sm:block" />
          </div>
        </div>
        <div className="sm:hidden h-12 w-full rounded-xl bg-slate-200" />
      </div>

      <div className="-mx-4 flex gap-2 overflow-hidden px-4 lg:hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-11 w-32 shrink-0 rounded-xl bg-slate-200" />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-24 space-y-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs"
          >
            <div className="h-3 w-1/3 rounded-full bg-slate-200" />
            <div className="h-6 w-1/2 rounded-lg bg-slate-200" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4 lg:gap-6">
        <div className="hidden space-y-2 lg:block">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-12 rounded-2xl border border-slate-200/80 bg-white shadow-xs"
            />
          ))}
          <div className="h-24 rounded-2xl bg-slate-900/90" />
        </div>

        <div className="flex h-[380px] flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs sm:p-5 lg:col-span-3">
          <div className="flex items-center justify-between">
            <div className="h-4 w-1/4 rounded-lg bg-slate-200" />
            <div className="h-4 w-12 rounded-lg bg-slate-200" />
          </div>
          <div className="flex h-48 w-full items-end justify-between gap-2 rounded-xl bg-slate-50 p-4">
            {SKELETON_BARS.map((h, i) => (
              <div
                key={i}
                className="w-full rounded-lg bg-slate-200/60"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
          <div className="mx-auto h-3 w-1/2 rounded-lg bg-slate-200" />
        </div>
      </div>

      <div className="h-28 rounded-2xl bg-slate-900/90 lg:hidden" />
    </div>
  );
}
