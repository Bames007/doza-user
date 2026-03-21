"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import useSWR from "swr";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Activity,
  Heart,
  Footprints,
  Moon,
  Weight,
  Plus,
  Loader2,
  HelpCircle,
  X,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Bell,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/app/utils/utils";
import { authFetcher, authPost } from "@/app/utils/client-auth";
import { bebasNeue, poppins } from "@/app/constants";

// ---------- Types ----------
type HealthRecord = {
  id: string;
  date: string;
  type: "heartRate" | "bloodPressure" | "steps" | "sleep" | "weight";
  value: number;
  unit?: string;
  note?: string;
  createdAt: string;
};

// ---------- Constants ----------
const metricConfig = {
  heartRate: {
    label: "Heart Rate",
    unit: "bpm",
    color: "#ef4444",
    icon: Heart,
  },
  bloodPressure: {
    label: "Blood Pressure",
    unit: "mmHg",
    color: "#f59e0b",
    icon: Activity,
  },
  steps: { label: "Steps", unit: "steps", color: "#3b82f6", icon: Footprints },
  sleep: { label: "Sleep", unit: "hours", color: "#8b5cf6", icon: Moon },
  weight: { label: "Weight", unit: "kg", color: "#10b981", icon: Weight },
} as const;

type MetricType = keyof typeof metricConfig;

const helpSlides = [
  {
    icon: <BarChart3 className="w-12 h-12 text-emerald-600" />,
    title: "Track your health",
    description:
      "Choose a metric (heart rate, steps, etc.) and view your trend over time.",
  },
  {
    icon: <Plus className="w-12 h-12 text-emerald-600" />,
    title: "Add a record",
    description:
      "Click 'Add Record' to log a new measurement. Fill in the date, value, and optional note.",
  },
  {
    icon: <Activity className="w-12 h-12 text-emerald-600" />,
    title: "Switch metrics",
    description:
      "Use the pill buttons to switch between different health metrics.",
  },
  {
    icon: <Bell className="w-12 h-12 text-emerald-600" />,
    title: "Stay consistent",
    description:
      "Regular tracking helps you spot trends and share with your doctor.",
  },
];

// ---------- Schema ----------
const recordSchema = z.object({
  date: z.string().min(1, "Date is required"),
  type: z.enum(["heartRate", "bloodPressure", "steps", "sleep", "weight"]),
  value: z.coerce.number().positive("Value must be positive"),
  unit: z.string().optional(),
  note: z.string().optional(),
});

type RecordForm = z.infer<typeof recordSchema>;

// ---------- Custom Tooltip ----------
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const record = payload[0].payload as HealthRecord;
    const config = metricConfig[record.type];
    return (
      <div className="bg-white/90 backdrop-blur-sm p-2 sm:p-3 rounded-xl shadow-xl border border-gray-100">
        <p className="text-xs sm:text-sm font-semibold text-gray-800 mb-1">
          {new Date(record.date).toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
          })}
        </p>
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: config.color }}
          />
          <p className="text-xs sm:text-sm text-gray-700">
            <span className="font-medium">{record.value}</span>{" "}
            {record.unit || config.unit}
          </p>
        </div>
        {record.note && (
          <p className="text-xs text-gray-500 mt-1 border-t border-gray-100 pt-1">
            Note: {record.note}
          </p>
        )}
      </div>
    );
  }
  return null;
};

// ---------- Modal Component ----------
const Modal = ({
  isOpen,
  onClose,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) => {
  if (!isOpen) return null;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-3"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 10 }}
        className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </motion.div>
  );
};

// ---------- Main Component ----------
export default function HealthTrackerPanel() {
  const [selectedType, setSelectedType] = useState<MetricType>("heartRate");
  const [showForm, setShowForm] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [helpSlide, setHelpSlide] = useState(0);

  // First visit help modal
  useEffect(() => {
    const hasSeenHelp = localStorage.getItem("doza_health_help");
    if (!hasSeenHelp) {
      setShowHelp(true);
      localStorage.setItem("doza_health_help", "true");
    }
  }, []);

  // Fetch records
  const { data, error, isLoading, mutate } = useSWR<{
    success: boolean;
    data: HealthRecord[];
  }>("/api/health-records", authFetcher);
  const records = data?.success ? data.data : [];

  // Memoized filtered and sorted records
  const filteredRecords = useMemo(() => {
    return records
      .filter((r) => r.type === selectedType)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [records, selectedType]);

  // Form - with proper default values
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RecordForm>({
    resolver: zodResolver(recordSchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      type: selectedType,
      value: 0,
      unit: metricConfig[selectedType].unit,
      note: "",
    },
  });

  const watchType = watch("type");
  useEffect(() => {
    if (watchType) {
      reset({
        date: new Date().toISOString().split("T")[0],
        type: watchType as MetricType,
        value: 0,
        unit: metricConfig[watchType as MetricType].unit,
        note: "",
      });
    }
  }, [watchType, reset]);

  const onSubmit = async (formData: RecordForm) => {
    try {
      const result = await authPost("/api/health-records", formData);
      if (result.success) {
        mutate();
        reset({
          date: new Date().toISOString().split("T")[0],
          type: selectedType,
          value: 0,
          unit: metricConfig[selectedType].unit,
          note: "",
        });
        setShowForm(false);
      } else {
        alert(`Error: ${result.error || "Failed to add record"}`);
      }
    } catch {
      alert("Network error. Please try again.");
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-3 pb-24  min-h-screen">
        <div className="pt-4 pb-3">
          <div className="h-7 w-36 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-3 w-48 bg-gray-200 rounded-lg animate-pulse mt-2" />
        </div>
        <div className="h-9 bg-gray-200 rounded-full w-48 animate-pulse mb-4" />
        <div className="flex gap-2 mb-5 overflow-hidden">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-9 w-20 bg-gray-200 rounded-full animate-pulse"
            />
          ))}
        </div>
        <div className="h-64 bg-gray-200 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-3 pb-24  min-h-screen pt-4">
        <div className="p-4 text-red-600 text-center bg-white rounded-2xl border border-gray-100">
          Failed to load health records. Please refresh the page.
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "max-w-6xl mx-auto px-3 pb-24  min-h-screen",
        poppins.className,
      )}
    >
      {/* Header with help icon */}
      <div className="pt-4 pb-3 flex items-center justify-between">
        <div>
          <h1
            className={cn(
              "text-2xl sm:text-3xl font-bold text-gray-800",
              bebasNeue.className,
            )}
          >
            Health Tracker
          </h1>
          <p className="text-xs sm:text-sm text-emerald-600 mt-0.5">
            Monitor your vital signs and activity over time
          </p>
        </div>
        <button
          onClick={() => setShowHelp(true)}
          className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-200 active:bg-gray-50"
          aria-label="How to use"
        >
          <HelpCircle className="w-5 h-5 text-emerald-600" />
        </button>
      </div>

      {/* Add Record Button */}
      <div className="flex justify-end mb-3">
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition shadow-sm text-sm sm:text-base"
          aria-label={showForm ? "Cancel" : "Add Record"}
        >
          <Plus className="w-4 h-4" />
          {showForm ? "Cancel" : "Add Record"}
        </button>
      </div>

      {/* Metric Pills */}
      <div
        className="flex overflow-x-auto pb-2 mb-4 gap-1.5 scrollbar-hide"
        role="tablist"
        aria-label="Health metrics"
      >
        {(
          Object.entries(metricConfig) as [
            MetricType,
            (typeof metricConfig)[MetricType],
          ][]
        ).map(([key, config]) => {
          const Icon = config.icon;
          const isSelected = selectedType === key;
          return (
            <button
              key={key}
              onClick={() => setSelectedType(key)}
              role="tab"
              aria-selected={isSelected}
              aria-label={config.label}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition whitespace-nowrap shadow-sm text-xs sm:text-sm",
                isSelected
                  ? "bg-emerald-600 border-emerald-600 text-white"
                  : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50",
              )}
            >
              <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
              <span className="font-medium">{config.label}</span>
            </button>
          );
        })}
      </div>

      {/* Add Record Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="bg-white border border-gray-100 rounded-2xl p-3 shadow-sm">
              <h2
                className={cn(
                  "text-base font-semibold text-gray-800 mb-2 flex items-center gap-2",
                  bebasNeue.className,
                )}
              >
                <Plus className="w-4 h-4 text-emerald-600" />
                Add New Record
              </h2>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      {...register("date")}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-gray-900"
                    />
                    {errors.date && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.date.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Type
                    </label>
                    <select
                      {...register("type")}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-gray-900"
                    >
                      <option value="heartRate">Heart Rate</option>
                      <option value="bloodPressure">Blood Pressure</option>
                      <option value="steps">Steps</option>
                      <option value="sleep">Sleep</option>
                      <option value="weight">Weight</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Value
                    </label>
                    <input
                      type="number"
                      step="any"
                      {...register("value")}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-gray-900"
                      placeholder={`e.g. 72 ${metricConfig[selectedType].unit}`}
                    />
                    {errors.value && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.value.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Unit (opt)
                    </label>
                    <input
                      type="text"
                      {...register("unit")}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-gray-900"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Note (optional)
                    </label>
                    <textarea
                      {...register("note")}
                      rows={2}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-gray-900"
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 text-sm bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center justify-center gap-2 px-4 py-2 text-sm bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition shadow-sm"
                  >
                    {isSubmitting && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                    Save
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chart */}
      {filteredRecords.length > 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-3 shadow-sm">
          <h2
            className={cn(
              "text-base font-semibold text-gray-800 mb-2 flex items-center gap-2",
              bebasNeue.className,
            )}
          >
            <BarChart3 className="w-4 h-4 text-emerald-600" />
            {metricConfig[selectedType].label} Trend
          </h2>
          <div className="h-56 sm:h-64 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={filteredRecords}
                margin={{ top: 5, right: 5, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id={`gradient-${selectedType}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor={metricConfig[selectedType].color}
                      stopOpacity={0.15}
                    />
                    <stop
                      offset="100%"
                      stopColor={metricConfig[selectedType].color}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f0f0f0"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 9, fill: "#6b7280" }}
                  tickFormatter={(date) =>
                    new Date(date).toLocaleDateString(undefined, {
                      month: "numeric",
                      day: "numeric",
                    })
                  }
                  axisLine={{ stroke: "#e5e7eb" }}
                  tickLine={false}
                  interval="preserveStartEnd"
                  minTickGap={20}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: "#6b7280" }}
                  axisLine={{ stroke: "#e5e7eb" }}
                  tickLine={false}
                  width={25}
                  domain={["auto", "auto"]}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={metricConfig[selectedType].color}
                  strokeWidth={2}
                  dot={{
                    r: 3,
                    fill: "white",
                    stroke: metricConfig[selectedType].color,
                    strokeWidth: 2,
                  }}
                  activeDot={{ r: 5, stroke: "white", strokeWidth: 2 }}
                  fill={`url(#gradient-${selectedType})`}
                  name={metricConfig[selectedType].label}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {filteredRecords.length < 2 && (
            <p className="text-xs text-gray-400 text-center mt-2">
              Add more data points to see a trend line.
            </p>
          )}
        </div>
      ) : (
        <div className="bg-white/60 backdrop-blur-sm p-8 text-center text-gray-500 rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <Activity className="w-7 h-7 text-emerald-600" />
          </div>
          <p className="text-base font-medium text-gray-700 mb-1">
            No {metricConfig[selectedType].label.toLowerCase()} records yet
          </p>
          <p className="text-xs mb-3 max-w-md mx-auto">
            Start tracking your health by adding your first measurement.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition inline-flex items-center gap-2 text-sm shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Record
          </button>
        </div>
      )}

      {/* Help Carousel Modal */}
      <Modal isOpen={showHelp} onClose={() => setShowHelp(false)}>
        <div className="flex items-center justify-between mb-3">
          <h2
            className={cn(
              "text-lg font-bold text-gray-900 flex items-center gap-2",
              bebasNeue.className,
            )}
          >
            <HelpCircle className="w-5 h-5 text-emerald-600" />
            How to use
          </h2>
          <button
            onClick={() => setShowHelp(false)}
            className="p-1 hover:bg-gray-100 rounded-full"
            aria-label="Close help"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={helpSlide}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center text-center p-2"
            >
              <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mb-2">
                {helpSlides[helpSlide].icon}
              </div>
              <h3 className="text-sm font-semibold text-gray-800 mb-1">
                {helpSlides[helpSlide].title}
              </h3>
              <p className="text-xs text-gray-600">
                {helpSlides[helpSlide].description}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="flex justify-center gap-2 mt-3">
            {helpSlides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setHelpSlide(idx)}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition",
                  idx === helpSlide ? "bg-emerald-600 w-3" : "bg-gray-300",
                )}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>

          <button
            onClick={() =>
              setHelpSlide((prev) =>
                prev === 0 ? helpSlides.length - 1 : prev - 1,
              )
            }
            className="absolute left-0 top-1/2 -translate-y-1/2 p-1 bg-gray-100 rounded-full hover:bg-gray-200"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={() =>
              setHelpSlide((prev) =>
                prev === helpSlides.length - 1 ? 0 : prev + 1,
              )
            }
            className="absolute right-0 top-1/2 -translate-y-1/2 p-1 bg-gray-100 rounded-full hover:bg-gray-200"
            aria-label="Next slide"
          >
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        <button
          onClick={() => setShowHelp(false)}
          className="mt-4 w-full px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 text-sm"
        >
          Get Started
        </button>
      </Modal>
    </motion.div>
  );
}
