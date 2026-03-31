"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import useSWR from "swr";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import {
  Activity,
  Heart,
  Footprints,
  Moon,
  Weight,
  Plus,
  Loader2,
  X,
  Download,
  ChevronRight,
  Smartphone,
  FileSpreadsheet,
  ClipboardList,
  HelpCircle,
  Cpu,
  Database,
  RefreshCcw,
  CheckCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/app/utils/utils";
import { authFetcher, authPost } from "@/app/utils/client-auth";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { DeviceScanner3D } from "../../threejs/DeviceScanner3D";
import { useBluetooth } from "../../hooks/useBluetooth";

const metricConfig = {
  heartRate: {
    label: "Heart Rate",
    unit: "BPM",
    icon: Heart,
    color: "#ef4444",
    tip: "A resting heart rate of 60-100 BPM is considered normal for adults.",
    criticalMax: 100,
    criticalMin: 60,
  },
  bloodPressure: {
    label: "Blood Pressure",
    unit: "mmHg",
    icon: Activity,
    color: "#3b82f6",
    tip: "Consistent readings above 140/90 may indicate hypertension.",
    criticalMax: 140,
    criticalMin: 90,
  },
  steps: {
    label: "Daily Steps",
    unit: "Steps",
    icon: Footprints,
    color: "#10b981",
    tip: "Target 8,000–10,000 steps daily for optimal health.",
    criticalMax: 15000,
    criticalMin: 3000,
  },
  sleep: {
    label: "Total Sleep",
    unit: "Hrs",
    icon: Moon,
    color: "#8b5cf6",
    tip: "Deep and REM sleep are vital for cognitive recovery.",
    criticalMax: 9,
    criticalMin: 6,
  },
  weight: {
    label: "Body Weight",
    unit: "kg",
    icon: Weight,
    color: "#64748b",
    tip: "Monitor weight trends weekly rather than daily.",
    criticalMax: 120,
    criticalMin: 50,
  },
} as const;

type MetricType = keyof typeof metricConfig;

export default function HealthTracker() {
  const [selectedType, setSelectedType] = useState<MetricType>("heartRate");
  const [showForm, setShowForm] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const pdfTemplateRef = useRef<HTMLDivElement>(null);

  const { status: btStatus, error: btError, scanAndConnect } = useBluetooth();

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data, mutate } = useSWR<{ success: boolean; data: any[] }>(
    "/api/health-records",
    authFetcher,
  );
  const records = data?.success ? data.data : [];

  const filteredRecords = useMemo(() => {
    return records
      .filter((r) => r.type === selectedType)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [records, selectedType]);

  const sleepBreakdown = useMemo(() => {
    if (selectedType !== "sleep" || filteredRecords.length === 0) return null;
    const latest = filteredRecords[filteredRecords.length - 1];
    const val = latest.value;
    return [
      { name: "Deep", value: val * 0.2, color: "#4c1d95" },
      { name: "REM", value: val * 0.25, color: "#8b5cf6" },
      { name: "Light", value: val * 0.55, color: "#ddd6fe" },
    ];
  }, [selectedType, filteredRecords]);

  const stats = useMemo(() => {
    if (filteredRecords.length === 0) return { avg: 0, min: 0, max: 0 };
    const values = filteredRecords.map((r) => r.value);
    return {
      avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }, [filteredRecords]);

  const handleExportCSV = () => {
    const headers = ["Date", "Metric", "Value", "Unit"];
    const rows = filteredRecords.map((r) => [
      r.date,
      metricConfig[selectedType].label,
      r.value,
      metricConfig[selectedType].unit,
    ]);
    const csvContent = [headers, ...rows].map((e) => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `DOZA_Health_${selectedType}_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  const handleExportPDF = async () => {
    if (!pdfTemplateRef.current || !chartRef.current) return;
    setIsExporting(true);
    try {
      // Capture chart image
      const chartCanvas = await html2canvas(chartRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
      });
      const chartImg = chartCanvas.toDataURL("image/png");

      // Inject into hidden template
      const template = pdfTemplateRef.current;
      const imgElement = template.querySelector("#captured-chart");
      if (imgElement) {
        imgElement.setAttribute("src", chartImg);
        imgElement.setAttribute("style", "width: 100%; height: auto;");
      }

      template.style.display = "block";
      await new Promise((r) => setTimeout(r, 600));

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
      pdf.save(`DOZA_REPORT_${selectedType.toUpperCase()}.pdf`);
    } catch (err) {
      console.error("PDF Export Error:", err);
    } finally {
      pdfTemplateRef.current.style.display = "none";
      setIsExporting(false);
    }
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm({
    resolver: zodResolver(
      z.object({
        date: z.string().min(1),
        value: z.coerce.number().positive(),
      }),
    ),
    defaultValues: { date: new Date().toISOString().split("T")[0], value: 0 },
  });

  const onSubmit = async (formData: any) => {
    const result = await authPost("/api/health-records", {
      ...formData,
      type: selectedType,
    });
    if (result.success) {
      mutate();
      setShowForm(false);
      reset();
    }
  };

  if (!mounted) return null;

  const recentRecords = filteredRecords.slice(-5).reverse();

  return (
    <div className="min-h-screen bg-[#fcfdfe] text-slate-900 pb-20 font-sans selection:bg-blue-100">
      {/* Hidden PDF Template */}
      <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
        <div
          ref={pdfTemplateRef}
          style={{
            width: "210mm",
            padding: "20mm",
            background: "white",
            display: "none",
            fontFamily: "sans-serif",
          }}
        >
          <div className="flex justify-between items-center border-b-4 border-slate-900 pb-8 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-[#2563eb] rounded-lg flex items-center justify-center text-white font-black">
                  D
                </div>
                <h1
                  style={{
                    fontSize: "28px",
                    fontWeight: 800,
                    letterSpacing: "-0.02em",
                  }}
                >
                  DOZA<span style={{ color: "#2563eb" }}>.</span>
                </h1>
              </div>
              <p
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "#94a3b8",
                  letterSpacing: "0.3em",
                }}
              >
                Precision Health Systems
              </p>
            </div>
            <div className="text-right">
              <h2
                style={{
                  fontSize: "18px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  fontStyle: "italic",
                }}
              >
                Diagnostic Report
              </h2>
              <p
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "#2563eb",
                  textTransform: "uppercase",
                }}
              >
                Ref: {Math.random().toString(36).substring(7).toUpperCase()}
              </p>
              <p
                style={{
                  fontSize: "10px",
                  color: "#64748b",
                  fontWeight: 700,
                  marginTop: "4px",
                }}
              >
                {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6 mb-10">
            <div
              style={{
                background: "#f8fafc",
                padding: "24px",
                borderRadius: "24px",
                border: "1px solid #f1f5f9",
              }}
            >
              <p
                style={{
                  fontSize: "9px",
                  fontWeight: 800,
                  color: "#94a3b8",
                  textTransform: "uppercase",
                  marginBottom: "8px",
                }}
              >
                Analysis Target
              </p>
              <p
                style={{ fontSize: "18px", fontWeight: 800, color: "#0f172a" }}
              >
                {metricConfig[selectedType].label}
              </p>
            </div>
            <div
              style={{
                background: "#f8fafc",
                padding: "24px",
                borderRadius: "24px",
                border: "1px solid #f1f5f9",
              }}
            >
              <p
                style={{
                  fontSize: "9px",
                  fontWeight: 800,
                  color: "#94a3b8",
                  textTransform: "uppercase",
                  marginBottom: "8px",
                }}
              >
                Average Value
              </p>
              <p
                style={{ fontSize: "18px", fontWeight: 800, color: "#0f172a" }}
              >
                {stats.avg} {metricConfig[selectedType].unit}
              </p>
            </div>
            <div
              style={{
                background: "#2563eb",
                padding: "24px",
                borderRadius: "24px",
              }}
            >
              <p
                style={{
                  fontSize: "9px",
                  fontWeight: 800,
                  color: "#bfdbfe",
                  textTransform: "uppercase",
                  marginBottom: "8px",
                }}
              >
                System Status
              </p>
              <p
                style={{
                  fontSize: "18px",
                  fontWeight: 800,
                  color: "white",
                  textTransform: "uppercase",
                  fontStyle: "italic",
                }}
              >
                Optimal
              </p>
            </div>
          </div>

          {/* Chart image placeholder */}
          <div style={{ marginBottom: "40px" }}>
            <h3
              style={{
                fontSize: "12px",
                fontWeight: 800,
                textTransform: "uppercase",
                color: "#94a3b8",
                textAlign: "center",
                marginBottom: "20px",
              }}
            >
              Biometric Timeline
            </h3>
            <img
              id="captured-chart"
              alt="Health Chart"
              style={{ width: "100%", height: "auto" }}
            />
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#0f172a", color: "white" }}>
                <th
                  style={{
                    padding: "16px",
                    textAlign: "left",
                    fontSize: "10px",
                    fontWeight: 800,
                    textTransform: "uppercase",
                  }}
                >
                  Date
                </th>
                <th
                  style={{
                    padding: "16px",
                    textAlign: "center",
                    fontSize: "10px",
                    fontWeight: 800,
                    textTransform: "uppercase",
                  }}
                >
                  Value
                </th>
                <th
                  style={{
                    padding: "16px",
                    textAlign: "center",
                    fontSize: "10px",
                    fontWeight: 800,
                    textTransform: "uppercase",
                  }}
                >
                  Range
                </th>
                <th
                  style={{
                    padding: "16px",
                    textAlign: "right",
                    fontSize: "10px",
                    fontWeight: 800,
                    textTransform: "uppercase",
                  }}
                >
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {recentRecords.map((r, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td
                    style={{
                      padding: "16px",
                      fontWeight: 600,
                      color: "#334155",
                    }}
                  >
                    {r.date}
                  </td>
                  <td
                    style={{
                      padding: "16px",
                      textAlign: "center",
                      fontWeight: 800,
                    }}
                  >
                    {r.value} {metricConfig[selectedType].unit}
                  </td>
                  <td
                    style={{
                      padding: "16px",
                      textAlign: "center",
                      color: "#64748b",
                    }}
                  >
                    {metricConfig[selectedType].criticalMin}-
                    {metricConfig[selectedType].criticalMax}
                  </td>
                  <td
                    style={{
                      padding: "16px",
                      textAlign: "right",
                      fontWeight: 800,
                      color: "#10b981",
                    }}
                  >
                    NORMAL
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p
            style={{
              marginTop: "48px",
              fontSize: "10px",
              color: "#cbd5e1",
              textAlign: "center",
              fontWeight: 800,
              letterSpacing: "0.5em",
            }}
          >
            DOZA Health Systems — Confidential
          </p>
        </div>
      </div>

      {/* Main UI */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <header className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8 bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-100">
          <div className="text-center md:text-left">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tighter italic uppercase text-slate-900 leading-none">
              DOZA<span className="text-blue-600">Health.</span>
            </h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">
              Precision Biometrics
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-md hover:scale-105 transition-all flex items-center gap-2"
            >
              <Plus size={16} strokeWidth={3} /> Entry
            </button>
            <button
              onClick={handleExportCSV}
              className="bg-slate-100 text-slate-600 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-2"
            >
              <FileSpreadsheet size={14} /> CSV
            </button>
            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              className="bg-slate-900 text-white px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2"
            >
              {isExporting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Download size={14} />
              )}{" "}
              Report
            </button>
          </div>
        </header>

        {/* Mobile: metric selector above chart; Desktop: sidebar left */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar – appears above on mobile */}
          <aside className="space-y-6 order-2 lg:order-1">
            <nav className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                Metrics
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-2">
                {(Object.entries(metricConfig) as any).map(
                  ([key, config]: [MetricType, any]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedType(key)}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl transition-all font-bold text-sm",
                        selectedType === key
                          ? "bg-slate-50 text-blue-600 shadow-inner"
                          : "text-slate-400 hover:bg-slate-50",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <config.icon
                          size={18}
                          strokeWidth={selectedType === key ? 3 : 2}
                        />
                        <span className="inline-block text-xs sm:text-sm">
                          {config.label}
                        </span>
                      </div>
                      <ChevronRight
                        size={14}
                        className={
                          selectedType === key ? "opacity-100" : "opacity-0"
                        }
                      />
                    </button>
                  ),
                )}
              </div>
            </nav>

            <div className="bg-slate-900 p-6 rounded-3xl text-white relative overflow-hidden group">
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-3">
                  {btStatus !== "idle" && btStatus !== "complete" && (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    >
                      <RefreshCcw size={18} className="text-blue-400" />
                    </motion.div>
                  )}
                  {btStatus === "complete" && (
                    <CheckCircle size={18} className="text-green-400" />
                  )}
                  {btStatus === "idle" && (
                    <Smartphone size={18} className="text-blue-400" />
                  )}
                  <h4 className="font-black text-xs uppercase italic">
                    IoT Sync
                  </h4>
                </div>
                {btError && (
                  <p className="text-red-400 text-xs mb-3">{btError}</p>
                )}
                <p className="text-[10px] text-slate-400 mb-4 leading-relaxed">
                  Connect DOZA wearables for automated biometric sequence data.
                </p>
                <div className="flex justify-center">
                  <DeviceScanner3D status={btStatus} />
                </div>
                <button
                  onClick={scanAndConnect}
                  disabled={btStatus !== "idle"}
                  className="w-full mt-4 py-2.5 rounded-xl bg-white text-slate-900 text-[10px] font-black uppercase tracking-widest hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                >
                  {btStatus === "idle" && "CONNECT DEVICE"}
                  {btStatus !== "idle" && btStatus !== "complete" && (
                    <>
                      <Loader2 size={12} className="animate-spin" />{" "}
                      {btStatus.toUpperCase()}...
                    </>
                  )}
                  {btStatus === "complete" && "DEVICE CONNECTED"}
                </button>
              </div>
            </div>
          </aside>

          {/* Main content – appears below metric selector on mobile, side on desktop */}
          <div className="lg:col-span-3 space-y-6 order-1 lg:order-2">
            {/* Chart Card */}
            <div
              className="bg-white p-5 sm:p-8 rounded-3xl border border-slate-100 shadow-sm"
              ref={chartRef}
            >
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
                <div>
                  <h3 className="font-black text-2xl tracking-tighter italic uppercase">
                    {metricConfig[selectedType].label}{" "}
                    <span className="text-blue-600">Flux</span>
                  </h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                    Live Telemetry
                  </p>
                </div>
                {filteredRecords.length > 0 && (
                  <div className="bg-emerald-50 px-4 py-2 rounded-2xl flex items-baseline gap-2">
                    <span className="text-3xl font-black text-emerald-600 tracking-tighter">
                      {filteredRecords[filteredRecords.length - 1].value}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-500 uppercase">
                      {metricConfig[selectedType].unit}
                    </span>
                  </div>
                )}
              </div>
              <div className="h-[250px] sm:h-[300px] md:h-[400px] w-full">
                {filteredRecords.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={filteredRecords}>
                      <defs>
                        <linearGradient
                          id="colorMetric"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor={metricConfig[selectedType].color}
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor={metricConfig[selectedType].color}
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="5 5"
                        vertical={false}
                        stroke="#f1f5f9"
                      />
                      <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fontSize: 9,
                          fontWeight: "800",
                          fill: "#94a3b8",
                        }}
                        tickFormatter={(v) =>
                          new Date(v).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })
                        }
                        dy={10}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fontSize: 9,
                          fontWeight: "800",
                          fill: "#94a3b8",
                        }}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "20px",
                          border: "none",
                          boxShadow: "0 10px 25px rgba(0,0,0,0.05)",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke={metricConfig[selectedType].color}
                        strokeWidth={3}
                        fill="url(#colorMetric)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
                    <Database size={32} className="text-slate-300 mb-3" />
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                      No data yet
                    </p>
                    <button
                      onClick={() => setShowForm(true)}
                      className="mt-2 text-blue-500 font-bold text-[10px] uppercase underline underline-offset-2"
                    >
                      Add first entry
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Sleep Stages (only when selected) */}
            {selectedType === "sleep" && sleepBreakdown && (
              <div className="bg-slate-900 p-5 sm:p-8 rounded-3xl text-white">
                <div className="flex items-center gap-3 mb-6">
                  <Moon className="text-blue-400" size={20} />
                  <h3 className="font-black text-xl uppercase italic tracking-tight">
                    Advanced Sleep Stages
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sleepBreakdown}>
                        <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                          {sleepBreakdown.map((entry, idx) => (
                            <Cell key={idx} fill={entry.color} />
                          ))}
                        </Bar>
                        <XAxis
                          dataKey="name"
                          axisLine={false}
                          tickLine={false}
                          tick={{
                            fill: "#fff",
                            fontSize: 10,
                            fontWeight: "bold",
                          }}
                        />
                        <Tooltip
                          cursor={{ fill: "transparent" }}
                          contentStyle={{ color: "#000" }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-3">
                    {sleepBreakdown.map((stage) => (
                      <div
                        key={stage.name}
                        className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/10"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: stage.color }}
                          />
                          <span className="text-xs font-black uppercase tracking-widest">
                            {stage.name}
                          </span>
                        </div>
                        <span className="font-black text-blue-400">
                          {stage.value.toFixed(1)} Hrs
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Bottom row: Recent & Insight */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-sm">
                <h4 className="font-black text-xs uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                  <ClipboardList size={14} className="text-blue-600" /> Recent
                  Sequence
                </h4>
                <div className="space-y-3">
                  {filteredRecords
                    .slice(-3)
                    .reverse()
                    .map((r, i) => (
                      <div
                        key={i}
                        className="flex justify-between items-center p-3 bg-slate-50 rounded-xl"
                      >
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase">
                            {r.date}
                          </p>
                          <p className="text-lg font-black">
                            {r.value}{" "}
                            <span className="text-[10px] text-slate-400">
                              {metricConfig[selectedType].unit}
                            </span>
                          </p>
                        </div>
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                      </div>
                    ))}
                </div>
              </div>

              <div className="bg-blue-600 p-5 sm:p-6 rounded-3xl text-white flex flex-col justify-between shadow-lg">
                <div>
                  <div className="bg-white/20 w-fit p-2 rounded-xl mb-4">
                    <Database size={18} />
                  </div>
                  <h4 className="font-black text-[10px] uppercase tracking-widest opacity-70 mb-2 italic">
                    Clinician Insight
                  </h4>
                  <p className="text-base sm:text-lg font-bold italic leading-tight">
                    "{metricConfig[selectedType].tip}"
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-white/10">
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-60">
                    Reference Standard
                  </p>
                  <p className="text-xs font-black">
                    {metricConfig[selectedType].criticalMin}–
                    {metricConfig[selectedType].criticalMax}{" "}
                    {metricConfig[selectedType].unit}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Help */}
        <div className="fixed bottom-4 right-4 z-50">
          <button className="w-12 h-12 bg-white border border-slate-100 shadow-xl rounded-full flex items-center justify-center text-slate-900 hover:scale-110 transition-all group">
            <HelpCircle size={20} strokeWidth={2} />
            <span className="absolute right-full mr-2 px-3 py-1 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              Support
            </span>
          </button>
        </div>
      </main>

      {/* Add Data Drawer */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowForm(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="fixed bottom-0 inset-x-0 bg-white z-[101] rounded-t-3xl p-6 sm:p-8 max-w-2xl mx-auto shadow-2xl border-t-4 border-blue-600"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-black text-2xl text-slate-900 uppercase italic">
                  Log Biometrics
                </h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-2 bg-slate-50 rounded-full"
                >
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input
                    type="date"
                    {...register("date")}
                    className="w-full bg-slate-50 rounded-xl px-4 py-3 font-black outline-none border-2 border-transparent focus:border-blue-600 transition-all"
                  />
                  <input
                    type="number"
                    step="any"
                    {...register("value")}
                    placeholder="Value"
                    className="w-full bg-slate-50 rounded-xl px-4 py-3 font-black outline-none border-2 border-transparent focus:border-blue-600 transition-all"
                  />
                </div>
                <button
                  disabled={isSubmitting}
                  className="w-full py-3 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-xs"
                >
                  {isSubmitting ? "Processing..." : "Authorize Data Entry"}
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
