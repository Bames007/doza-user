// app/dashboard/panels/HealthTracker.tsx
"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import useSWR from "swr";
import { Download, FileSpreadsheet, Plus, Stethoscope } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import Image from "next/image";

import { authFetcher } from "@/app/utils/client-auth";
import { useUser } from "../../hooks/useProfile";
import { cn } from "@/app/utils/utils";
import { bebasNeue, poppins } from "@/app/constants";

import {
  metricConfig,
  MetricType,
  HealthRecord,
  ChartDataPoint,
} from "@/app/types/healthtracker";

// Subcomponents
import { MetricSelector } from "../subcomponents/healthtracker/MetricSelector";
import { MetricStatsCards } from "../subcomponents/healthtracker/MetricStatsCard";
import { TelemetryChart } from "../subcomponents/healthtracker/Telemetry";
import { DataEntryModal } from "../subcomponents/healthtracker/DataEntryModal";

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

export default function HealthTracker() {
  const [selectedType, setSelectedType] = useState<MetricType>("heartRate");
  const [showForm, setShowForm] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const chartRef = useRef<HTMLDivElement>(null);
  const pdfTemplateRef = useRef<HTMLDivElement>(null);

  const { user } = useUser();
  const uniqueReportId = useMemo(() => generateSecureReportID(), []);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data, mutate, isLoading } = useSWR<{
    success: boolean;
    data: HealthRecord[];
  }>("/api/health-records", authFetcher);

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
    link.download = `Health_Data_${selectedType}_${new Date().toISOString().split("T")[0]}.csv`;
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
        `Health_Report_${selectedType.toUpperCase()}_${new Date().toISOString().split("T")[0]}.pdf`,
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

  if (!mounted) return null;

  if (isLoading) {
    return <HealthTrackerSkeleton />;
  }

  const isBP = selectedType === "bloodPressure";
  const renderPdfValue = (val: any) => {
    if (isBP && val && typeof val === "object") {
      return `${val.systolic}/${val.diastolic}`;
    }
    return String(val);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 selection:bg-emerald-100 antialiased">
      {/* Hidden PDF Engine */}
      <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
        <div
          ref={pdfTemplateRef}
          className="w-[210mm] min-h-[297mm] p-[15mm] bg-white hidden font-poppins"
        >
          <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
            <div>
              <h1 className="text-xl font-black uppercase tracking-tight text-slate-900 leading-none">
                DOZA<span className="text-emerald-500">.</span>
              </h1>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">
                Official Medical Data Report
              </p>
            </div>
            <div className="text-right text-[10px]">
              <p className="font-bold text-slate-900">
                {user?.fullName || "Account Patient"}
              </p>
              <p className="text-slate-500">{user?.email || ""}</p>
              <p className="text-[8px] text-slate-400 font-mono mt-0.5">
                ID: {uniqueReportId}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6 text-center">
            {[
              { label: "Activity Average", val: stats.avg },
              { label: "Lowest Value", val: stats.min },
              { label: "Highest Value", val: stats.max },
            ].map((s, idx) => (
              <div
                key={idx}
                className="bg-slate-50 border border-slate-100 rounded-xl p-3 shadow-2xs"
              >
                <p className="text-[8px] font-bold text-slate-400 tracking-wider uppercase mb-0.5">
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
            <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Historical Timeline Log ({metricConfig[selectedType].label})
            </p>
            <div className="w-full h-[220px] border border-slate-100 rounded-xl p-3 flex items-center justify-center bg-white shadow-2xs">
              <img
                id="captured-chart"
                alt="Health Data Curve Chart"
                className="max-w-full max-h-full object-contain"
              />
            </div>
          </div>

          <div>
            <table className="w-full text-left text-[10px] border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
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
                        className="border-b border-slate-100 text-slate-700 font-medium"
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
                          className={`p-2 text-right font-bold text-[9px] ${color}`}
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

      {/* Main View */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6 pb-24 sm:pb-8 space-y-6">
        {/* Header – Doza styled */}

        <div
          className={cn(
            "space-y-8 p-3 md:p-6 max-w-7xl mx-auto",
            poppins.className,
          )}
        >
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 pb-6 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-8 w-1 rounded-full bg-gradient-to-b from-emerald-500 to-teal-600" />
                <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-[0.25em]">
                  Vitals Monitoring
                </span>
              </div>
              <h1
                className={cn(
                  "text-4xl md:text-5xl text-slate-900 leading-[1.05] tracking-tight pt-1",
                  bebasNeue.className,
                )}
              >
                Health <span className="text-emerald-600">Tracker</span>
              </h1>
              <p className="text-xs md:text-sm text-slate-500 max-w-lg font-medium leading-relaxed mt-1">
                Monitor your heart rate, blood pressure, and other vital metrics
                seamlessly with advanced telemetry.
              </p>
            </div>

            {/* Action buttons with micro‑interactions */}
            <div className="flex items-center gap-3 shrink-0">
              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center bg-white rounded-2xl p-1 border border-slate-200/80 shadow-xs"
              >
                <button
                  onClick={handleExportCSV}
                  title="Export CSV"
                  className="p-2.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all duration-200"
                >
                  <FileSpreadsheet size={16} />
                </button>
                <div className="w-px h-5 bg-slate-200/80 mx-0.5" />
                <button
                  onClick={handleExportPDF}
                  disabled={isExporting}
                  title="Export PDF"
                  className="p-2.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all duration-200 disabled:opacity-50"
                >
                  <Download size={16} />
                </button>
              </motion.div>

              <motion.button
                whileHover={{ y: -1, scale: 1.01 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-2xl font-bold text-xs shadow-md shadow-emerald-600/25 hover:bg-emerald-700 transition-all duration-300"
              >
                <Plus size={16} />
                <span>Add Entry</span>
              </motion.button>
            </div>
          </div>
        </div>

        {/* Metric Stats Cards */}
        <MetricStatsCards stats={stats} currentMetric={selectedType} />

        {/* Telemetry & Metric Selector */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <aside className="w-full flex flex-col gap-4">
            <MetricSelector
              selectedType={selectedType}
              onSelectMetric={setSelectedType}
            />
            {/* Health Tip Card – hidden on mobile */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="hidden lg:block bg-gradient-to-br from-slate-900 to-slate-800 p-5 rounded-2xl text-white shadow-md shadow-slate-950/10 border border-slate-800 relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/25 transition-all duration-500" />
              <div className="flex items-center gap-2 mb-2">
                <Stethoscope className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">
                  Clinical Insight
                </span>
              </div>
              <p className="text-xs font-medium text-slate-300 leading-relaxed">
                {metricConfig[selectedType].tip}
              </p>
            </motion.div>
          </aside>

          {/* Chart Card with hover lift */}
          <motion.div
            ref={chartRef}
            whileHover={{ y: -2 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="lg:col-span-3 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between"
          >
            <TelemetryChart
              chartData={chartData}
              currentMetric={selectedType}
              filteredRecords={filteredRecords}
            />
          </motion.div>
        </div>
      </main>

      {/* Data Entry Modal */}
      <AnimatePresence>
        {showForm && (
          <DataEntryModal
            currentMetric={selectedType}
            onClose={() => setShowForm(false)}
            onSuccess={handleFormSubmissionSuccess}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* --- Skeleton – styled to match the new design language --- */
function HealthTrackerSkeleton() {
  return (
    <div className="min-h-screen bg-[#f8fafc] max-w-7xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6 pb-24 sm:pb-8 animate-pulse space-y-6">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 pb-6 border-b border-slate-100">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-8 w-1 rounded-full bg-slate-200" />
            <div className="h-3 w-32 bg-slate-200 rounded-full" />
          </div>
          <div className="h-10 w-64 md:w-80 bg-slate-200 rounded-xl" />
          <div className="h-3.5 w-48 bg-slate-200 rounded-lg" />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="w-10 h-10 bg-slate-200 rounded-xl" />
            <div className="w-px h-5 bg-slate-200" />
            <div className="w-10 h-10 bg-slate-200 rounded-xl" />
          </div>
          <div className="w-24 h-11 bg-slate-200 rounded-2xl" />
        </div>
      </div>

      {/* Stats Row Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div
            key={idx}
            className="h-24 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 space-y-3"
          >
            <div className="h-3 bg-slate-200 rounded-full w-1/3" />
            <div className="h-6 bg-slate-200 rounded-lg w-1/2" />
          </div>
        ))}
      </div>

      {/* Main Area Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div
              key={idx}
              className="h-14 bg-white rounded-2xl border border-slate-200/80 shadow-xs"
            />
          ))}
          <div className="h-24 bg-slate-900 rounded-2xl hidden lg:block" />
        </div>

        <div className="lg:col-span-3 h-[380px] bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <div className="h-4 bg-slate-200 rounded-lg w-1/4" />
            <div className="h-4 bg-slate-200 rounded-lg w-12" />
          </div>
          <div className="w-full h-48 bg-slate-50 rounded-xl flex items-end justify-between p-4 space-x-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="w-full bg-slate-200/60 rounded-lg"
                style={{ height: `${20 + Math.random() * 60}%` }}
              />
            ))}
          </div>
          <div className="h-3 bg-slate-200 rounded-lg w-1/2 mx-auto" />
        </div>
      </div>
    </div>
  );
}
