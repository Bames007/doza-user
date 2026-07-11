"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import useSWR from "swr";
import { ActivityIcon, Download, FileSpreadsheet, Plus } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

import { authFetcher } from "@/app/utils/client-auth";
import { useUser } from "../../hooks/useProfile";

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

  // --- INTERCEPT SYNC WITH SKELETON PLACEHOLDER ---
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
    <div className="min-h-screen bg-[#fcfdfe] text-slate-900 font-poppins selection:bg-slate-100 antialiased">
      {/* Hidden PDF Engine Canvas Component Layer */}
      <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
        <div
          ref={pdfTemplateRef}
          className="w-[210mm] min-h-[297mm] p-[15mm] bg-white hidden font-poppins"
        >
          <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
            <div>
              <h1 className="text-xl font-black uppercase tracking-tight text-slate-900 leading-none">
                DOZA<span className="text-[#22C55E]">.</span>
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
            =
            {[
              { label: "Activity Average", val: stats.avg },
              { label: "Lowest Value", val: stats.min },
              { label: "Highest Value", val: stats.max },
            ].map((s, idx) => (
              <div
                key={idx}
                className="bg-slate-50 border border-slate-100 rounded-lg p-2.5"
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
            <div className="w-full h-[220px] border border-slate-100 rounded-xl p-3 flex items-center justify-center bg-white">
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

      {/* Main View Area Wrapper */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 pt-3 sm:pt-5 pb-24 sm:pb-8">
        {/* Native-Optimized App Bar Header */}
        <header className="sticky top-3 z-40 flex items-center justify-between gap-4 bg-white/70 backdrop-blur-md p-2.5 pl-4 rounded-2xl border border-slate-200/80 shadow-[0_8px_30px_rgb(15,23,42,0.04)] transition-all duration-300 mb-8 mx-1">
          {/* Left Section: Branding */}
          <div className="flex items-center gap-3 select-none">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100/80 text-emerald-600">
              <ActivityIcon
                size={18}
                strokeWidth={2.5}
                className="animate-[pulse_3s_ease-in-out_infinite]"
              />
              <span className="absolute top-1 right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>

            <div className="flex flex-col">
              <h1 className="font-black text-lg text-slate-900 tracking-tight leading-none">
                DOZA
              </h1>
              <span className="text-[11px] text-slate-500 font-medium tracking-normal mt-0.5 leading-none">
                Vitals Engine
              </span>
            </div>
          </div>

          {/* Right Section: Actions */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-50 rounded-xl p-1 border border-slate-200/60 shadow-sm">
              <button
                onClick={handleExportCSV}
                title="Export CSV Data"
                className="p-2 text-slate-500 hover:text-slate-900 hover:bg-white rounded-lg transition-all duration-200 active:scale-95 shadow-none hover:shadow-sm border border-transparent hover:border-slate-200/40"
              >
                <FileSpreadsheet size={15} strokeWidth={2} />
              </button>

              <div className="w-[1px] h-3 bg-slate-200 mx-1" />

              <button
                onClick={handleExportPDF}
                disabled={isExporting}
                title="Export PDF Report"
                className="p-2 text-slate-500 hover:text-slate-900 hover:bg-white rounded-lg transition-all duration-200 active:scale-95 shadow-none hover:shadow-sm border border-transparent hover:border-slate-200/40 disabled:opacity-30 disabled:pointer-events-none"
              >
                <Download size={15} strokeWidth={2} />
              </button>
            </div>

            <button
              onClick={() => setShowForm(true)}
              className="relative overflow-hidden bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide flex items-center gap-1.5 shadow-[0_4px_12px_rgba(15,23,42,0.15)] transition-all duration-200 active:scale-[0.98]"
            >
              <Plus size={14} strokeWidth={2.5} className="text-emerald-400" />
              <span>Add Entry</span>
            </button>
          </div>
        </header>

        {/* Aggregated Trends Metrics Row Card Subcomponent */}
        <MetricStatsCards stats={stats} currentMetric={selectedType} />

        {/* Dynamic Telemetry Context Interface Split Grid Area */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start mt-4">
          <aside className="w-full flex flex-col gap-4">
            <MetricSelector
              selectedType={selectedType}
              onSelectMetric={setSelectedType}
            />
            <div className="bg-slate-900 p-4 rounded-xl text-white shadow-sm relative overflow-hidden hidden lg:block border border-slate-800">
              <p className="text-[9px] font-black uppercase tracking-widest text-[#22C55E] mb-1">
                Health Tip
              </p>
              <p className="text-[11px] font-medium text-slate-300 leading-relaxed">
                {metricConfig[selectedType].tip}
              </p>
            </div>
          </aside>

          <div
            ref={chartRef}
            className="lg:col-span-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm min-w-0"
          >
            <TelemetryChart
              chartData={chartData}
              currentMetric={selectedType}
              filteredRecords={filteredRecords}
            />
          </div>
        </div>
      </main>

      {/* Input Overlay Modal */}
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

/* --- LIGHTWEIGHT METRIC-ALIGNED SHIMMER COMPONENT --- */
function HealthTrackerSkeleton() {
  return (
    <div className="min-h-screen bg-[#fcfdfe] max-w-7xl mx-auto px-3 sm:px-4 pt-3 sm:pt-5 pb-24 sm:pb-8 animate-pulse">
      {/* Header Mock */}
      <div className="h-16 bg-white rounded-2xl border border-slate-200/60 mb-8 w-full" />

      {/* Top Stats Strip Mock (3 Columns to replicate MetricStatsCards footprint) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div
            key={idx}
            className="h-24 bg-white rounded-2xl border border-slate-100 p-4 space-y-3"
          >
            <div className="h-3 bg-slate-200 rounded w-1/3" />
            <div className="h-6 bg-slate-200 rounded w-1/2" />
          </div>
        ))}
      </div>

      {/* Split Interactive Dashboard Arena Mock */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
        {/* Left Vertical Metric Controls Menu Shimmer */}
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div
              key={idx}
              className="h-14 bg-white rounded-xl border border-slate-100"
            />
          ))}
          <div className="h-24 bg-slate-900 rounded-xl hidden lg:block" />
        </div>

        {/* Main Canvas Chart Graph Window Mock */}
        <div className="lg:col-span-3 h-[380px] bg-white rounded-2xl border border-slate-100 p-6 flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <div className="h-4 bg-slate-200 rounded w-1/4" />
            <div className="h-4 bg-slate-100 rounded w-12" />
          </div>
          {/* Geometric lines block mocking multi-axis vector bars */}
          <div className="w-full h-48 bg-slate-50 rounded-xl flex items-end justify-between p-4 space-x-2">
            <div className="w-full h-[30%] bg-slate-200/60 rounded" />
            <div className="w-full h-[55%] bg-slate-200/60 rounded" />
            <div className="w-full h-[40%] bg-slate-200/60 rounded" />
            <div className="w-full h-[75%] bg-slate-200/60 rounded" />
            <div className="w-full h-[50%] bg-slate-200/60 rounded" />
            <div className="w-full h-[85%] bg-slate-200/60 rounded" />
          </div>
          <div className="h-3 bg-slate-100 rounded w-1/2 mx-auto" />
        </div>
      </div>
    </div>
  );
}
