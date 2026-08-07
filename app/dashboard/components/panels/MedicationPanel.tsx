// app/dashboard/components/panels/MedicationPanel.tsx

"use client";

import {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  type ChangeEvent,
} from "react";
import useSWR, { mutate } from "swr";
import { motion, AnimatePresence } from "framer-motion";
import {
  Pill,
  Bell,
  Users,
  Plus,
  CheckCircle,
  Loader2,
  ChevronDown,
  Calendar,
  AlertCircle,
  UserPlus,
  Clock,
  HelpCircle,
  X,
  ChevronLeft,
  ChevronRight,
  StopCircle,
  Activity,
  TrendingUp,
  Shield,
  Stethoscope,
  Sunrise,
  Sun,
  Sunset,
  Moon,
  Check,
  Sparkles,
  BarChart3,
  Camera,
  Search,
  Building,
  Store,
  Play,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
} from "recharts";
import { cn } from "@/app/utils/utils";
import { authFetcher, authPost, authPut } from "@/app/utils/client-auth";
import { useProfile } from "@/app/dashboard/hooks/useUserData";
import { poppins, bebasNeue } from "@/app/constants";
import { usePrescribedMedications } from "@/app/dashboard/hooks/usePrescribedMedications";
import { useUserContext } from "../../UserContext";
import Tesseract from "tesseract.js";

// ---------- Constants ----------
const DEFAULT_MAX_DOSES = 90;

// ---------- Types ----------
type FamilyMember = {
  id: string;
  name: string;
  relationship: string;
  phone?: string;
};

type Dose = {
  id: string;
  scheduledTime: string;
  takenAt?: string;
  skipped?: boolean;
  reaction?: string;
};

type Medication = {
  id: string;
  name: string;
  dosage: string;
  quantityPerDose: number;
  totalQuantity: number;
  durationDays?: number;
  ailment?: string;
  frequency: "once" | "twice" | "thrice" | "custom";
  times: string[];
  instructions?: string;
  startDate: string;
  endDate?: string;
  assignedTo: string;
  status: "active" | "completed" | "paused" | "pending";
  doses: Dose[];
  createdAt: string;
  color?: string;
};

type UpcomingDose = {
  medicationId: string;
  medicationName: string;
  scheduledTime: string;
  dosage: string;
  assignedToName: string;
};

interface ExtendedMedication extends Medication {
  source: "self" | "prescribed";
  centerName?: string;
  prescribedBy?: string;
  prescribedAt?: string;
  sourceType?: "hospital" | "external";
  prescriptionId?: string;
  centerId?: string;
}

// ---------- Schemas ----------
const medicationSchema = z
  .object({
    name: z.string().min(1, "Medication name is required"),
    dosage: z.string().min(1, "Dosage is required"),
    quantityPerDose: z.coerce.number().min(0.1, "Must be at least 0.1"),
    totalQuantity: z.coerce.number().optional(),
    durationDays: z.coerce.number().int().positive().optional(),
    ailment: z.string().optional(),
    frequency: z.enum(["once", "twice", "thrice", "custom"]),
    times: z.string().optional(),
    instructions: z.string().optional(),
    startDate: z.string().min(1, "Start date is required"),
    assignedTo: z.string().min(1, "Assign to someone"),
  })
  .refine((d) => d.frequency !== "custom" || d.times, {
    message: "Please specify custom times",
    path: ["times"],
  });

type MedicationForm = z.infer<typeof medicationSchema>;

const reactionSchema = z.object({
  reaction: z.string().min(3, "Please describe the reaction (min 3 chars)"),
});
type ReactionForm = z.infer<typeof reactionSchema>;

const familySchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone is required"),
  relationship: z.string().min(1, "Relationship is required"),
});
type FamilyForm = z.infer<typeof familySchema>;

// ---------- Helpers ----------
const medicationColors = [
  "#0d9488", // teal-600
  "#7c3aed", // violet-600
  "#db2777", // pink-600
  "#d97706", // amber-600
  "#2563eb", // blue-600
  "#059669", // emerald-600
  "#9333ea", // purple-600
  "#dc2626", // red-600
];

function getMedicationColor(index: number): string {
  return medicationColors[index % medicationColors.length];
}

function getTimeOfDay(hour: number) {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

function getIntakesPerDay(frequency: string): number {
  switch (frequency) {
    case "once":
      return 1;
    case "twice":
      return 2;
    case "thrice":
      return 3;
    default:
      return 3;
  }
}

function deriveDuration(
  totalQty: number,
  qtyPerDose: number,
  intakesPerDay: number,
): number {
  return Math.ceil(totalQty / (qtyPerDose * intakesPerDay));
}

function deriveTotalQuantity(
  durationDays: number,
  qtyPerDose: number,
  intakesPerDay: number,
): number {
  return durationDays * qtyPerDose * intakesPerDay;
}

function generateDosesFromStart(
  startDateTime: string,
  frequency: "once" | "twice" | "thrice" | "custom",
  totalQuantity: number,
): Dose[] {
  const start = new Date(startDateTime);
  let intervalMs: number;
  switch (frequency) {
    case "once":
      intervalMs = 24 * 60 * 60 * 1000;
      break;
    case "twice":
      intervalMs = 12 * 60 * 60 * 1000;
      break;
    case "thrice":
    case "custom":
      intervalMs = 8 * 60 * 60 * 1000;
      break;
    default:
      intervalMs = 8 * 60 * 60 * 1000;
  }
  const numDoses = totalQuantity > 0 ? totalQuantity : DEFAULT_MAX_DOSES;
  const doses: Dose[] = [];
  for (let i = 0; i < numDoses; i++) {
    const doseTime = new Date(start.getTime() + i * intervalMs);
    doses.push({
      id: `dose-${i}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      scheduledTime: doseTime.toISOString(),
    });
  }
  return doses;
}

function generateCustomDoses(
  startDate: string,
  times: string[],
  totalQuantity: number,
): Dose[] {
  const numDoses = totalQuantity > 0 ? totalQuantity : DEFAULT_MAX_DOSES;
  const [y, m, d] = startDate.split("-").map(Number);
  const start = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const perDay = times.length;
  const doses: Dose[] = [];
  for (let i = 0; i < numDoses; i++) {
    const dayOffset = Math.floor(i / perDay);
    const timeIdx = i % perDay;
    const date = new Date(start);
    date.setDate(start.getDate() + dayOffset);
    if (date < today) continue;
    const [h, min] = times[timeIdx].split(":").map(Number);
    date.setHours(h, min, 0, 0);
    doses.push({
      id: `${date.toISOString()}-${timeIdx}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      scheduledTime: date.toISOString(),
    });
  }
  return doses;
}

function computeEndDateFromDoses(doses: Dose[]): string | undefined {
  if (doses.length === 0) return undefined;
  const takenDoses = doses.filter((d) => d.takenAt);
  if (takenDoses.length === 0) {
    const lastDose = doses[doses.length - 1];
    return new Date(lastDose.scheduledTime).toISOString().split("T")[0];
  }
  const lastTaken = takenDoses[takenDoses.length - 1];
  return new Date(lastTaken.takenAt!).toISOString().split("T")[0];
}

function normalizeFrequency(
  freq: string,
): "once" | "twice" | "thrice" | "custom" {
  const lower = freq.toLowerCase().trim();
  if (lower.includes("once") || lower === "qd" || lower === "daily")
    return "once";
  if (lower.includes("twice") || lower === "bid") return "twice";
  if (lower.includes("thrice") || lower === "tid") return "thrice";
  return "custom";
}

function getAdherenceScore(medications: ExtendedMedication[]): number {
  const allDoses = medications.flatMap((m) => m.doses);
  if (allDoses.length === 0) return 0;
  const taken = allDoses.filter((d) => d.takenAt).length;
  return Math.round((taken / allDoses.length) * 100);
}

function getStreak(medications: ExtendedMedication[]): number {
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() - i);
    const dateStr = checkDate.toISOString().split("T")[0];
    const dayDoses = medications.flatMap((m) =>
      m.doses.filter((d) => d.scheduledTime.startsWith(dateStr)),
    );
    if (dayDoses.length === 0 && i === 0) continue;
    if (dayDoses.length === 0) break;
    const allTaken = dayDoses.every((d) => d.takenAt);
    if (allTaken) streak++;
    else if (i > 0) break;
  }
  return streak;
}

// ---------- Custom Tooltip ----------
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white p-4 rounded-xl shadow-lg border border-slate-200">
        <p className="text-sm font-semibold text-slate-800 mb-2">{label}</p>
        {payload.map((entry: any, idx: number) => (
          <div
            key={idx}
            className="flex items-center gap-2 text-sm text-slate-700"
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="font-medium">{entry.name}:</span>
            <span className="font-semibold">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// ---------- Skeleton Loaders ----------
const SkeletonPulse = ({ className }: { className?: string }) => (
  <div className={cn("animate-pulse bg-slate-200 rounded-xl", className)} />
);

const SkeletonCard = () => (
  <div className="bg-white border border-slate-200 rounded-2xl md:rounded-3xl p-5 md:p-6">
    <div className="flex items-start justify-between">
      <div className="flex-1 space-y-3">
        <div className="flex gap-2">
          <SkeletonPulse className="h-6 w-28 rounded-full" />
          <SkeletonPulse className="h-4 w-16 rounded-full" />
        </div>
        <SkeletonPulse className="h-3 w-36 rounded-lg" />
        <div className="space-y-2 mt-4">
          <SkeletonPulse className="h-2 w-full rounded-full" />
          <SkeletonPulse className="h-2 w-3/4 rounded-full" />
        </div>
      </div>
      <SkeletonPulse className="w-10 h-10 rounded-full" />
    </div>
  </div>
);

const SkeletonStatCard = () => (
  <div className="bg-white border border-slate-200 rounded-2xl md:rounded-3xl p-5 md:p-7">
    <SkeletonPulse className="h-4 w-20 rounded-lg mb-4" />
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <SkeletonPulse key={i} className="h-12 w-full rounded-xl" />
      ))}
    </div>
  </div>
);

// ---------- Subcomponents ----------
const BentoTile = ({
  children,
  className,
  onClick,
  gradient,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  gradient?: boolean;
}) => (
  <motion.div
    whileHover={{ y: -3 }}
    whileTap={{ scale: 0.99 }}
    transition={{ type: "spring", stiffness: 300, damping: 25 }}
    onClick={onClick}
    className={cn(
      "p-4 md:p-6 rounded-2xl md:rounded-3xl border transition-all duration-300",
      gradient
        ? "bg-gradient-to-br text-white border-transparent shadow-lg"
        : "bg-white border-slate-200 shadow-sm hover:shadow-xl",
      className,
    )}
  >
    {children}
  </motion.div>
);

const Modal = ({
  children,
  onClose,
  title,
  icon: Icon,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title?: string;
  icon?: any;
}) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    onClick={onClose}
  >
    <motion.div
      initial={{ scale: 0.9, y: 20 }}
      animate={{ scale: 1, y: 0 }}
      exit={{ scale: 0.9, y: 20 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="bg-white rounded-2xl md:rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200"
      onClick={(e) => e.stopPropagation()}
    >
      {(title || Icon) && (
        <div className="flex items-center gap-3 px-4 md:px-6 pt-5 md:pt-6 pb-2">
          {Icon && (
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-2xl bg-teal-50 flex items-center justify-center">
              <Icon className="w-4 h-4 md:w-5 md:h-5 text-teal-600" />
            </div>
          )}
          {title && (
            <h2 className="text-lg md:text-xl font-bold text-slate-800">
              {title}
            </h2>
          )}
        </div>
      )}
      <div className="p-4 md:p-6 pt-2">{children}</div>
    </motion.div>
  </motion.div>
);

// ---------- Input Components ----------
const Input = ({ label, error, className, ...props }: any) => (
  <div className={cn("space-y-1.5", className)}>
    {label && (
      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
        {label}
      </label>
    )}
    <input
      {...props}
      className={cn(
        "w-full px-4 py-2.5 text-sm bg-white border rounded-xl transition-all outline-none placeholder:text-slate-400 text-slate-800",
        error
          ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100"
          : "border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100",
      )}
    />
    {error && <p className="text-red-500 text-xs">{error}</p>}
  </div>
);

const Select = ({ label, error, className, children, ...props }: any) => (
  <div className={cn("space-y-1.5", className)}>
    {label && (
      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
        {label}
      </label>
    )}
    <select
      {...props}
      className={cn(
        "w-full px-4 py-2.5 text-sm bg-white border rounded-xl transition-all outline-none text-slate-800",
        error
          ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100"
          : "border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100",
      )}
    >
      {children}
    </select>
    {error && <p className="text-red-500 text-xs">{error}</p>}
  </div>
);

const Textarea = ({ label, error, className, ...props }: any) => (
  <div className={cn("space-y-1.5", className)}>
    {label && (
      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
        {label}
      </label>
    )}
    <textarea
      {...props}
      className={cn(
        "w-full px-4 py-2.5 text-sm bg-white border rounded-xl transition-all outline-none placeholder:text-slate-400 text-slate-800 resize-y min-h-[80px]",
        error
          ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100"
          : "border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100",
      )}
    />
    {error && <p className="text-red-500 text-xs">{error}</p>}
  </div>
);

// ---------- Drug Search ----------
async function searchDrug(
  query: string,
): Promise<{ name: string; dosage?: string; ailment?: string }[]> {
  if (!query.trim()) return [];
  try {
    const url = `https://api.fda.gov/drug/label.json?search=openfda.brand_name:"${encodeURIComponent(query)}"+OR+openfda.generic_name:"${encodeURIComponent(query)}"&limit=5`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.results) return [];
    return data.results.map((item: any) => {
      const brand = item.openfda?.brand_name?.[0] || "";
      const generic = item.openfda?.generic_name?.[0] || "";
      const name = brand || generic || "Unknown";
      let dosage = "";
      if (item.active_ingredient && item.active_ingredient.length > 0) {
        const ing = item.active_ingredient[0];
        const match = ing.match(/(\d+\s*mg|\d+\s*mcg|\d+\s*g)/i);
        if (match) dosage = match[0];
      }
      const ailment = item.indications_and_usage?.[0] || "";
      return { name, dosage, ailment };
    });
  } catch {
    return [];
  }
}

// ---------- Medication Card (with Ongoing support) ----------
const MedicationCard = ({
  medication,
  expanded,
  onToggleExpand,
  onLogDose,
  onReportReaction,
  onStop,
  isPast,
  colorIndex,
  now,
}: {
  medication: ExtendedMedication;
  expanded: boolean;
  onToggleExpand: () => void;
  onLogDose: (doseId: string, taken: boolean, reaction?: string) => void;
  onReportReaction: (doseId: string) => void;
  onStop: () => void;
  isPast?: boolean;
  colorIndex: number;
  now: number;
}) => {
  const medColor = medication.color || getMedicationColor(colorIndex);
  const isPrescribed = medication.source === "prescribed";
  const isOngoing = medication.totalQuantity === 0;

  const totalDoses = medication.doses.length;
  const takenDoses = medication.doses.filter((d) => d.takenAt).length;
  const remainingDoses = totalDoses - takenDoses;
  const completion = totalDoses > 0 ? (takenDoses / totalDoses) * 100 : 0;

  const today = new Date();
  const localToday = new Date(
    today.getTime() - today.getTimezoneOffset() * 60000,
  )
    .toISOString()
    .split("T")[0];
  const todaysDoses = medication.doses.filter((d) =>
    d.scheduledTime.startsWith(localToday),
  );
  const takenToday = todaysDoses.filter((d) => d.takenAt).length;
  const progress =
    todaysDoses.length > 0 ? (takenToday / todaysDoses.length) * 100 : 0;

  // Next upcoming dose
  const nextDose = medication.doses.find(
    (d) => !d.takenAt && new Date(d.scheduledTime).getTime() > now,
  );
  const isNextDoseDue = nextDose
    ? now >= new Date(nextDose.scheduledTime).getTime()
    : false;

  const nextDoseCountdown = nextDose
    ? (() => {
        const diff = new Date(nextDose.scheduledTime).getTime() - now;
        if (diff <= 0) return "Due now";
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        return `${h}h ${m}m`;
      })()
    : "";

  const next7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .split("T")[0];
  });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{
        y: -4,
        boxShadow: "0 20px 40px -12px rgba(15, 23, 42, 0.15)",
      }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={cn(
        "bg-white rounded-2xl md:rounded-3xl border overflow-hidden transition-shadow duration-300",
        isPast ? "border-slate-200 opacity-60" : "border-slate-200 shadow-sm",
      )}
    >
      <div
        className="h-1.5 w-full"
        style={{
          background: isPast
            ? "#cbd5e1"
            : `linear-gradient(90deg, ${medColor}, ${medColor}88)`,
        }}
      />

      <div className="p-4 md:p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 cursor-pointer" onClick={onToggleExpand}>
            <div className="flex items-center gap-1.5 md:gap-2 flex-wrap mb-1">
              <div
                className="w-7 h-7 md:w-8 md:h-8 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${medColor}15` }}
              >
                <Pill
                  className="w-3.5 h-3.5 md:w-4 md:h-4"
                  style={{ color: medColor }}
                />
              </div>
              <h3 className="font-semibold text-slate-900 text-base md:text-lg">
                {medication.name}
              </h3>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: `${medColor}15`,
                  color: medColor,
                }}
              >
                {medication.dosage}
              </span>
              {isPrescribed && medication.sourceType && (
                <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 border border-blue-100">
                  {medication.sourceType === "hospital" ? (
                    <Building className="w-3 h-3" />
                  ) : (
                    <Store className="w-3 h-3" />
                  )}
                  {medication.sourceType === "hospital"
                    ? "Hospital"
                    : "External"}
                </span>
              )}
              {medication.ailment && (
                <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-medium border border-slate-200">
                  {medication.ailment}
                </span>
              )}
            </div>

            {isPrescribed && (
              <p className="text-xs text-slate-600 ml-10">
                from{" "}
                <span className="font-medium text-slate-800">
                  {medication.centerName}
                </span>
                {medication.prescribedBy && ` · by ${medication.prescribedBy}`}
              </p>
            )}

            <div className="flex items-center gap-2 mt-1.5 md:mt-2 ml-10">
              {isOngoing ? (
                <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Ongoing
                </span>
              ) : (
                <span className="text-xs text-slate-600">
                  <span className="font-semibold text-slate-800">
                    {remainingDoses}
                  </span>{" "}
                  / {totalDoses} doses remaining
                </span>
              )}
            </div>
            {/* Start and End dates */}
            <div className="ml-10 mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
              <span className="text-[10px] text-slate-500">
                Start: {new Date(medication.startDate).toLocaleDateString()}
              </span>
              {medication.endDate && (
                <span className="text-[10px] text-slate-500">
                  Finished: {new Date(medication.endDate).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={onToggleExpand}
            className="p-1.5 md:p-2 hover:bg-slate-50 rounded-xl transition-colors"
          >
            <motion.div
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-4 h-4 md:w-5 md:h-5 text-slate-400" />
            </motion.div>
          </button>
        </div>

        {/* Progress bars */}
        <div className="mt-4 md:mt-5 space-y-3">
          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1.5">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> Today
              </span>
              <span>
                {takenToday}/{todaysDoses.length} doses
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{
                  backgroundColor: progress === 100 ? "#22c55e" : medColor,
                }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1.5">
              <span className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Overall
              </span>
              <span>{Math.round(completion)}%</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${isNaN(completion) ? 0 : completion}%` }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                className="h-full rounded-full bg-slate-400"
              />
            </div>
          </div>
        </div>

        {/* NEXT DOSE TIMER + BUTTON */}
        {!isPast && nextDose && (
          <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-xs font-semibold text-slate-700">
                  Next dose
                </p>
                <p className="text-sm font-bold text-slate-900">
                  {new Date(nextDose.scheduledTime).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <span
                className={cn(
                  "text-xs font-bold px-2 py-1 rounded-lg",
                  isNextDoseDue
                    ? "text-red-600 bg-red-100"
                    : nextDoseCountdown.includes("h")
                      ? "text-slate-500"
                      : "text-amber-600 bg-amber-100",
                )}
              >
                {nextDoseCountdown}
              </span>
            </div>
            {isNextDoseDue ? (
              <div className="flex gap-2">
                <button
                  onClick={() => onLogDose(nextDose.id, true, "")}
                  className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 shadow-sm"
                >
                  <Check className="w-3 h-3 inline mr-1" />
                  Take
                </button>
                <button
                  onClick={() => onReportReaction(nextDose.id)}
                  className="px-2 py-1.5 bg-amber-50 text-amber-700 text-xs font-bold rounded-lg hover:bg-amber-100 border border-amber-200"
                >
                  <AlertCircle className="w-3 h-3 inline mr-1" />
                  Issue
                </button>
              </div>
            ) : (
              <span className="text-xs font-medium text-slate-400">
                Upcoming
              </span>
            )}
          </div>
        )}
        {!isPast && !nextDose && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
            <p className="text-xs font-medium text-emerald-700">
              All scheduled doses completed
            </p>
          </div>
        )}

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-4 md:mt-5 space-y-4 md:space-y-5 overflow-hidden"
            >
              {/* Next 7 Days calendar */}
              <div>
                <h4 className="text-xs font-semibold text-slate-700 mb-2 md:mb-3 flex items-center gap-1.5 uppercase tracking-wider">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Next 7 Days
                </h4>
                <div className="grid grid-cols-7 gap-1">
                  {next7.map((day) => {
                    const dd = medication.doses.filter((d) =>
                      d.scheduledTime.startsWith(day),
                    );
                    const tk = dd.filter((d) => d.takenAt).length;
                    const tt = dd.length;
                    const dayName = new Date(day).toLocaleDateString("en-US", {
                      weekday: "narrow",
                    });
                    const dayNum = new Date(day).getDate();

                    return (
                      <div
                        key={day}
                        className={cn(
                          "aspect-square rounded-lg md:rounded-xl flex flex-col items-center justify-center text-[10px] p-0.5 transition-all",
                          tt > 0
                            ? tk === tt
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : tk > 0
                                ? "bg-amber-50 text-amber-800 border border-amber-200"
                                : "bg-slate-50 text-slate-500 border border-slate-100"
                            : "bg-slate-50 text-slate-300 border border-slate-100",
                        )}
                      >
                        <span className="text-[8px] font-medium opacity-60">
                          {dayName}
                        </span>
                        <span className="font-bold text-xs md:text-sm">
                          {dayNum}
                        </span>
                        {tt > 0 && (
                          <span className="text-[8px] font-semibold">
                            {tk}/{tt}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {!isPast && (
                <button
                  onClick={onStop}
                  className="w-full py-2.5 md:py-3 text-xs md:text-sm bg-slate-50 text-slate-600 rounded-xl md:rounded-2xl hover:bg-red-50 hover:text-red-600 transition-all font-bold flex items-center justify-center gap-2 border border-slate-200 hover:border-red-200"
                >
                  <StopCircle className="w-4 h-4" /> Stop / Finish Medication
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

// ---------- Upcoming Dose Pill ----------
const UpcomingDosePill = ({
  dose,
  index,
  now,
}: {
  dose: UpcomingDose;
  index: number;
  now: number;
}) => {
  const doseTime = new Date(dose.scheduledTime);
  const hour = doseTime.getHours();
  const timeOfDay = getTimeOfDay(hour);
  const TimeIcon =
    timeOfDay === "morning"
      ? Sunrise
      : timeOfDay === "afternoon"
        ? Sun
        : timeOfDay === "evening"
          ? Sunset
          : Moon;
  const colorClass =
    timeOfDay === "morning"
      ? "bg-amber-50 text-amber-700"
      : timeOfDay === "afternoon"
        ? "bg-orange-50 text-orange-700"
        : timeOfDay === "evening"
          ? "bg-indigo-50 text-indigo-700"
          : "bg-slate-100 text-slate-700";

  const diff = doseTime.getTime() - now;
  const isDue = diff <= 0;
  const isSoon = diff > 0 && diff <= 3600000;

  const countdown =
    diff <= 0
      ? "Due now"
      : diff < 3600000
        ? `${Math.floor(diff / 60000)}m`
        : `${Math.floor(diff / 3600000)}h ${Math.floor((diff % 3600000) / 60000)}m`;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className={cn(
        "flex items-center gap-2 md:gap-3 p-2.5 md:p-3 rounded-xl md:rounded-2xl border transition-all",
        isDue
          ? "bg-red-50 border-red-200"
          : isSoon
            ? "bg-amber-50 border-amber-200"
            : "bg-white border-slate-200",
      )}
    >
      <div
        className={cn(
          "w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center",
          colorClass,
        )}
      >
        <TimeIcon className="w-4 h-4 md:w-5 md:h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs md:text-sm font-semibold text-slate-900 truncate">
          {dose.medicationName}
        </p>
        <p className="text-[10px] md:text-xs text-slate-600">
          {doseTime.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}{" "}
          · {dose.dosage} · {dose.assignedToName}
        </p>
      </div>
      <span
        className={cn(
          "text-[10px] font-bold px-2 py-1 rounded-lg",
          isDue
            ? "text-red-600 bg-red-100"
            : isSoon
              ? "text-amber-600 bg-amber-100"
              : "text-slate-500",
        )}
      >
        {countdown}
      </span>
    </motion.div>
  );
};

// ---------- Camera / Snap Modal (unchanged) ----------
const SnapDrugModal = ({ onClose, onSnap }: any) => {
  // ... (keep the full implementation from your existing file)
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"camera" | "result">("camera");

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => {
        track.stop();
        track.enabled = false;
      });
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.pause();
    }
  }, [stream]);

  useEffect(() => {
    if (step === "camera") {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: "environment" } })
        .then((mediaStream) => {
          setStream(mediaStream);
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
            const playPromise = videoRef.current.play();
            if (playPromise !== undefined) {
              playPromise.catch((err) =>
                console.warn("Auto-play prevented:", err),
              );
            }
          }
        })
        .catch((err) => {
          setError("Cannot access camera. Please allow camera access.");
          console.error(err);
        });
    }
    return () => {
      if (step === "camera") stopCamera();
    };
  }, [step, stopCamera]);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const capture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg");
    setCapturedImage(dataUrl);
    setStep("result");
    stopCamera();
    runOCR(dataUrl);
  };

  const runOCR = async (imageData: string) => {
    setIsProcessing(true);
    setError(null);
    try {
      const {
        data: { text },
      } = await Tesseract.recognize(imageData, "eng", {
        logger: (m) => console.log(m),
      });
      setExtractedText(text);
    } catch (err) {
      setError("OCR failed. Please try again or type manually.");
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUseName = () => {
    const name = extractedText.trim();
    if (name) {
      onSnap(name);
      onClose();
    } else {
      setError("No text found. Please try again.");
    }
  };

  const retake = () => {
    setStep("camera");
    setCapturedImage(null);
    setExtractedText("");
    setError(null);
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl md:rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h3 className="text-base md:text-lg font-semibold text-slate-800">
            Snap Drug
          </h3>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-slate-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl text-sm mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}
          {step === "camera" && (
            <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                autoPlay
              />
              <canvas ref={canvasRef} className="hidden" />
              <button
                onClick={capture}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white rounded-full p-3 md:p-4 shadow-lg hover:scale-105 transition-transform"
              >
                <Camera className="w-5 h-5 md:w-6 md:h-6 text-slate-900" />
              </button>
            </div>
          )}
          {step === "result" && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-xl overflow-hidden">
                {capturedImage && (
                  <img
                    src={capturedImage}
                    alt="Captured"
                    className="w-full max-h-48 object-contain"
                  />
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Extracted Text (edit if needed)
                </label>
                <Textarea
                  value={extractedText}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                    setExtractedText(e.target.value)
                  }
                  placeholder="OCR result will appear here..."
                  className="min-h-[80px]"
                />
                {isProcessing && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin" /> Processing
                    image...
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={retake}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition"
                >
                  Retake
                </button>
                <button
                  onClick={handleUseName}
                  disabled={!extractedText.trim() || isProcessing}
                  className="flex-1 py-2.5 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition disabled:opacity-50"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  ) : (
                    "Use this name"
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ---------- Main Component ----------
export default function MedicationPanel() {
  const user = useUserContext();
  const { profile } = useProfile();

  // Live clock
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const [selectedFamilyId, setSelectedFamilyId] = useState("self");
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [showAddMedModal, setShowAddMedModal] = useState(false);
  const [showAddFamilyModal, setShowAddFamilyModal] = useState(false);
  const [showReactionModal, setShowReactionModal] = useState<{
    medicationId: string;
    doseId: string;
  } | null>(null);
  const [expandedMedId, setExpandedMedId] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [helpSlide, setHelpSlide] = useState(0);
  const [stopConfirm, setStopConfirm] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"active" | "past">("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    { name: string; dosage?: string; ailment?: string }[]
  >([]);
  const [searching, setSearching] = useState(false);
  const [showSnapModal, setShowSnapModal] = useState(false);

  // Help guide
  useEffect(() => {
    if (!localStorage.getItem("doza_medication_help_v2")) {
      setShowHelp(true);
      localStorage.setItem("doza_medication_help_v2", "true");
    }
  }, []);

  // Family members
  const { data: familyData, mutate: mutateFamily } = useSWR(
    "/api/family",
    authFetcher,
  );
  useEffect(() => {
    if (familyData?.success) {
      setFamilyMembers([
        { id: "self", name: "Myself", relationship: "self" },
        ...familyData.data.map((m: any) => ({
          id: m.id,
          name: m.name,
          relationship: m.relationship,
          phone: m.phone,
        })),
      ]);
    }
  }, [familyData]);

  // Self-added medications
  const { data, error, isLoading } = useSWR(
    `/api/medications?memberId=${selectedFamilyId}`,
    authFetcher,
  );
  const selfMedications: Medication[] = data?.success ? data.data : [];

  // Prescribed medications
  const { prescriptions: prescribedMeds, loading: prescribedLoading } =
    usePrescribedMedications();

  // Medication Meta
  const [medicationMeta, setMedicationMeta] = useState<
    Record<
      string,
      {
        prescriptionId: string;
        centerId: string;
        sourceType?: "hospital" | "external";
      }
    >
  >(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("medicationMeta");
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {}
      }
    }
    return {};
  });

  useEffect(() => {
    localStorage.setItem("medicationMeta", JSON.stringify(medicationMeta));
  }, [medicationMeta]);

  // Merge self and prescribed
  const allExtended = useMemo<ExtendedMedication[]>(() => {
    const selfExtended = selfMedications.map((m, i) => {
      const meta = medicationMeta[m.id];
      return {
        ...m,
        source: "self" as const,
        color: getMedicationColor(i),
        status: m.status as "active" | "completed" | "paused" | "pending",
        prescriptionId: meta?.prescriptionId,
        centerId: meta?.centerId,
        sourceType: meta?.sourceType,
      };
    });

    const startedIds = new Set(
      Object.values(medicationMeta).map((v) => v.prescriptionId),
    );
    const unstarted = prescribedMeds.filter((p) => !startedIds.has(p.id));

    const prescribedExtended = unstarted.map((p, i) => ({
      id: p.id,
      name: p.medication,
      dosage: p.dosage,
      quantityPerDose: p.quantityPerDose || 1,
      totalQuantity: p.totalQuantity || 0,
      durationDays: p.durationDays,
      frequency: normalizeFrequency(p.frequency),
      times: [],
      instructions: p.instructions,
      startDate: new Date().toISOString().split("T")[0],
      assignedTo: "self",
      status: "pending" as const,
      doses: [],
      createdAt: p.prescribedAt,
      source: "prescribed" as const,
      centerId: p.centerId,
      centerName: p.centerName,
      prescribedBy: p.prescribedBy,
      prescribedAt: p.prescribedAt,
      sourceType: p.source,
      color: getMedicationColor(selfExtended.length + i),
      prescriptionId: p.id,
    }));

    return [...selfExtended, ...prescribedExtended];
  }, [selfMedications, prescribedMeds, medicationMeta]);

  // Filters
  const activeMeds = allExtended.filter(
    (m) => m.status === "active" && m.doses.length > 0,
  );
  const pastMeds = allExtended.filter(
    (m) => m.status !== "active" && m.status !== "pending",
  );
  const unstartedMeds = allExtended.filter(
    (m) => m.status === "pending" && m.source === "prescribed",
  );

  const groupedActive = useMemo(() => {
    const groups: { label: string; items: ExtendedMedication[] }[] = [];
    const selfItems = activeMeds.filter((m) => m.source === "self");
    if (selfItems.length > 0)
      groups.push({ label: "My Medications", items: selfItems });
    const prescribedActive = activeMeds.filter(
      (m) => m.source === "prescribed",
    );
    const centerMap = new Map<string, ExtendedMedication[]>();
    prescribedActive.forEach((m) => {
      const key = m.centerId || "unknown";
      if (!centerMap.has(key)) centerMap.set(key, []);
      centerMap.get(key)!.push(m);
    });
    for (const [centerId, items] of centerMap) {
      const centerName = items[0]?.centerName || "Unknown Center";
      groups.push({ label: centerName, items });
    }
    return groups;
  }, [activeMeds]);

  const groupedPast = useMemo(() => {
    const groups: { label: string; items: ExtendedMedication[] }[] = [];
    const selfItems = pastMeds.filter((m) => m.source === "self");
    if (selfItems.length > 0)
      groups.push({ label: "My Medications", items: selfItems });
    const prescribedPast = pastMeds.filter((m) => m.source === "prescribed");
    const centerMap = new Map<string, ExtendedMedication[]>();
    prescribedPast.forEach((m) => {
      const key = m.centerId || "unknown";
      if (!centerMap.has(key)) centerMap.set(key, []);
      centerMap.get(key)!.push(m);
    });
    for (const [centerId, items] of centerMap) {
      const centerName = items[0]?.centerName || "Unknown Center";
      groups.push({ label: centerName, items });
    }
    return groups;
  }, [pastMeds]);

  // Stats
  const adherenceScore = getAdherenceScore(allExtended);
  const streak = getStreak(allExtended);

  const upcomingDoses = useMemo<UpcomingDose[]>(() => {
    const nowTime = Date.now();
    const all = allExtended.flatMap((med) =>
      med.doses
        .filter(
          (d) => !d.takenAt && new Date(d.scheduledTime).getTime() > nowTime,
        )
        .map((d) => ({
          medicationId: med.id,
          medicationName: med.name,
          scheduledTime: d.scheduledTime,
          dosage: med.dosage,
          assignedToName: med.assignedTo === "self" ? "Me" : "Family",
        })),
    );
    all.sort(
      (a, b) =>
        new Date(a.scheduledTime).getTime() -
        new Date(b.scheduledTime).getTime(),
    );
    return all.slice(0, 5);
  }, [allExtended]);

  const chartData = useMemo(() => {
    const last14Days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }).reverse();
    return last14Days.map((day) => {
      const dayDoses = allExtended.flatMap((m) =>
        m.doses.filter((d) => d.scheduledTime.startsWith(day)),
      );
      return {
        date: new Date(day).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
        taken: dayDoses.filter((d) => d.takenAt).length,
        total: dayDoses.length,
      };
    });
  }, [allExtended]);

  const nextDose = upcomingDoses.length > 0 ? upcomingDoses[0] : null;
  const timeRemaining = useMemo(() => {
    if (!nextDose) return "";
    const diff = new Date(nextDose.scheduledTime).getTime() - now;
    if (diff <= 0) return "Due now";
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}h ${m}m`;
  }, [nextDose, now]);

  const todayDosesRemaining = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return allExtended
      .flatMap((m) => m.doses)
      .filter((d) => d.scheduledTime.startsWith(today) && !d.takenAt).length;
  }, [allExtended]);

  const todayDosesTotal = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return allExtended
      .flatMap((m) => m.doses)
      .filter((d) => d.scheduledTime.startsWith(today)).length;
  }, [allExtended]);

  // ─── Forms ──────────────────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<MedicationForm>({
    resolver: zodResolver(medicationSchema) as any,
    defaultValues: {
      frequency: "once",
      assignedTo: selectedFamilyId,
      quantityPerDose: 1,
      totalQuantity: 0, // 0 means "ongoing"
      startDate: new Date().toISOString().split("T")[0],
    },
  });
  const frequency = watch("frequency");
  useEffect(() => {
    setValue("assignedTo", selectedFamilyId);
  }, [selectedFamilyId, setValue]);

  const reactionForm = useForm<ReactionForm>({
    resolver: zodResolver(reactionSchema),
  });
  const familyForm = useForm<FamilyForm>({
    resolver: zodResolver(familySchema),
  });

  // ─── Handlers ──────────────────────────────────────────────────────

  const handleDrugSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const results = await searchDrug(query);
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const selectDrug = (drug: {
    name: string;
    dosage?: string;
    ailment?: string;
  }) => {
    setValue("name", drug.name);
    if (drug.dosage) setValue("dosage", drug.dosage);
    if (drug.ailment) setValue("ailment", drug.ailment);
    setSearchQuery("");
    setSearchResults([]);
  };

  const onSubmitNewMed = async (formData: MedicationForm) => {
    let totalQty = formData.totalQuantity || 0; // 0 = ongoing
    let durationDays = formData.durationDays;

    // If duration is provided, compute total quantity
    if (durationDays && totalQty === 0) {
      const intakesPerDay = getIntakesPerDay(formData.frequency);
      totalQty = deriveTotalQuantity(
        durationDays,
        formData.quantityPerDose,
        intakesPerDay,
      );
    }

    // If total quantity is provided, compute duration for display
    if (totalQty > 0 && !durationDays) {
      const intakesPerDay = getIntakesPerDay(formData.frequency);
      durationDays = deriveDuration(
        totalQty,
        formData.quantityPerDose,
        intakesPerDay,
      );
    }

    // Generate doses
    let timesArray: string[] = [];
    let doses: Dose[] = [];
    let endDateStr: string | undefined;

    if (formData.frequency === "custom" && formData.times) {
      timesArray = formData.times.split(",").map((t) => t.trim());
      doses = generateCustomDoses(
        formData.startDate,
        timesArray,
        totalQty || DEFAULT_MAX_DOSES,
      );
    } else {
      const normFreq = formData.frequency as "once" | "twice" | "thrice";
      const startDateTime = new Date().toISOString();
      doses = generateDosesFromStart(
        startDateTime,
        normFreq,
        totalQty || DEFAULT_MAX_DOSES,
      );
      endDateStr = computeEndDateFromDoses(doses);
    }

    try {
      const result = await authPost("/api/medications", {
        name: formData.name,
        dosage: formData.dosage,
        quantityPerDose: formData.quantityPerDose,
        totalQuantity: totalQty,
        durationDays: durationDays,
        frequency: formData.frequency,
        times: timesArray,
        instructions: formData.instructions,
        startDate: formData.startDate,
        endDate: endDateStr,
        assignedTo: formData.assignedTo,
        status: "active",
        doses,
      });
      if (result.success) {
        mutate(`/api/medications?memberId=${selectedFamilyId}`);
        setShowAddMedModal(false);
        reset();
      } else alert("Error: " + result.error);
    } catch {
      alert("Failed to add medication");
    }
  };

  const startPrescribedMedication = async (prescribed: ExtendedMedication) => {
    if (!prescribed.prescriptionId) return;

    const normalizedFreq = normalizeFrequency(prescribed.frequency);
    const startDateTime = new Date().toISOString();

    // Use totalQuantity from prescription, or 0 for ongoing
    const totalQty = prescribed.totalQuantity || 0;
    const doses = generateDosesFromStart(
      startDateTime,
      normalizedFreq,
      totalQty || DEFAULT_MAX_DOSES,
    );
    const endDateStr = computeEndDateFromDoses(doses);

    try {
      const result = await authPost("/api/medications", {
        name: prescribed.name,
        dosage: prescribed.dosage,
        quantityPerDose: prescribed.quantityPerDose || 1,
        totalQuantity: totalQty,
        durationDays: prescribed.durationDays,
        frequency: normalizedFreq,
        times: [],
        instructions: prescribed.instructions || "",
        startDate: new Date(startDateTime).toISOString().split("T")[0],
        endDate: endDateStr,
        assignedTo: "self",
        status: "active",
        doses,
        prescriptionId: prescribed.prescriptionId,
        centerId: prescribed.centerId,
        sourceType: prescribed.sourceType,
      });

      if (result.success) {
        const newId = result.data?.id ?? result.id;
        if (!newId) {
          alert("Created but could not retrieve ID.");
          return;
        }
        const newMeta = {
          ...medicationMeta,
          [newId]: {
            prescriptionId: prescribed.prescriptionId!,
            centerId: prescribed.centerId!,
            sourceType: prescribed.sourceType,
          },
        };
        setMedicationMeta(newMeta);
        localStorage.setItem("medicationMeta", JSON.stringify(newMeta));

        mutate(`/api/medications?memberId=${selectedFamilyId}`);
        alert("Medication started! Your doses are now scheduled.");
      } else {
        alert("Error: " + result.error);
      }
    } catch (err: any) {
      console.error(err);
      alert("Failed to start medication: " + (err.message || "Unknown error"));
    }
  };

  // Reschedule doses after a late dose
  const rescheduleDoses = (
    medication: Medication,
    takenDoseIndex: number,
    actualTakenTime: string,
  ): Dose[] => {
    const doses = [...medication.doses];
    const takenDose = doses[takenDoseIndex];
    if (!takenDose) return doses;
    const scheduledTime = new Date(takenDose.scheduledTime).getTime();
    const actualTime = new Date(actualTakenTime).getTime();
    if (actualTime <= scheduledTime + 5 * 60 * 1000) return doses;

    const remainingDoses = doses
      .slice(takenDoseIndex + 1)
      .filter((d) => !d.takenAt);
    if (remainingDoses.length === 0) return doses;

    const intervalMs =
      medication.frequency === "once"
        ? 24 * 60 * 60 * 1000
        : medication.frequency === "twice"
          ? 12 * 60 * 60 * 1000
          : 8 * 60 * 60 * 1000;

    const newDoses = doses.slice(0, takenDoseIndex + 1);
    let nextTime = actualTime + intervalMs;
    for (const dose of remainingDoses) {
      newDoses.push({
        ...dose,
        scheduledTime: new Date(nextTime).toISOString(),
      });
      nextTime += intervalMs;
    }
    return newDoses;
  };

  const logDose = async (
    medicationId: string,
    doseId: string,
    taken: boolean,
    reaction?: string,
  ) => {
    const swrKey = `/api/medications?memberId=${selectedFamilyId}`;
    const actualTakenTime = new Date().toISOString();

    mutate(
      swrKey,
      (currentData: any) => {
        if (!currentData?.success) return currentData;
        const meds = currentData.data;
        const updatedMeds = meds.map((m: Medication) => {
          if (m.id !== medicationId) return m;
          const doseIndex = m.doses.findIndex((d: any) => d.id === doseId);
          if (doseIndex === -1) return m;

          const updatedDoses = [...m.doses];
          updatedDoses[doseIndex] = {
            ...updatedDoses[doseIndex],
            takenAt: taken ? actualTakenTime : undefined,
            reaction: reaction || updatedDoses[doseIndex].reaction,
          };

          const finalDoses =
            taken && m.frequency !== "custom"
              ? rescheduleDoses(
                  { ...m, doses: updatedDoses },
                  doseIndex,
                  actualTakenTime,
                )
              : updatedDoses;

          return { ...m, doses: finalDoses };
        });
        return { ...currentData, data: updatedMeds };
      },
      false,
    );

    try {
      const result = await authPut(
        `/api/medications/${medicationId}/doses/${doseId}`,
        { taken, reaction },
      );
      if (result.success) {
        const currentData = await mutate(swrKey);
        if (currentData?.success) {
          const med = currentData.data.find(
            (m: Medication) => m.id === medicationId,
          );
          if (med && taken && med.frequency !== "custom") {
            const doseIndex = med.doses.findIndex((d: any) => d.id === doseId);
            const newDoses = rescheduleDoses(med, doseIndex, actualTakenTime);
            await authPut(`/api/medications/${medicationId}`, {
              doses: newDoses,
            });
            mutate(swrKey);
          }
        }

        const meta = medicationMeta[medicationId];
        if (meta && meta.centerId && meta.prescriptionId) {
          await syncToCenter(meta.centerId, {
            medication:
              selfMedications.find((m) => m.id === medicationId)?.name ||
              "Unknown",
            dose:
              selfMedications.find((m) => m.id === medicationId)?.dosage || "1",
            administeredAt: actualTakenTime,
            administeredBy: user?.fullName || "Patient",
            administeredById: user?.id,
            reaction: reaction || "",
            note: `Logged from patient app. Dose ID: ${doseId}`,
          });
        }
      } else {
        alert("Error: " + (result.error || "Failed to log dose"));
        mutate(swrKey);
      }
    } catch (err) {
      alert("An error occurred");
      mutate(swrKey);
    }
  };

  const syncToCenter = async (
    centerId: string,
    administration: {
      medication: string;
      dose: string;
      administeredAt: string;
      administeredBy: string;
      administeredById?: string;
      reaction: string;
      note: string;
    },
  ) => {
    if (!user?.id) return;
    try {
      const getRes = await fetch(
        `/api/centers/${centerId}/patients/${user.id}`,
        {
          credentials: "include",
        },
      );
      if (!getRes.ok) {
        console.warn("Could not fetch patient record for sync");
        return;
      }

      const patientData = await getRes.json();
      if (!patientData.success) {
        console.warn("Invalid patient data response");
        return;
      }

      let existingAdmins = patientData.data?.medicationAdministrations || [];
      if (!Array.isArray(existingAdmins)) {
        existingAdmins = Object.values(existingAdmins);
      }

      const putRes = await fetch(
        `/api/centers/${centerId}/patients/${user.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            medicationAdministrations: [...existingAdmins, administration],
          }),
        },
      );
      if (!putRes.ok) {
        const errorBody = await putRes.text();
        console.warn(`Sync failed (${putRes.status}):`, errorBody);
      }
    } catch (err) {
      console.warn("Sync to center error", err);
    }
  };

  const stopMedication = async (medicationId: string) => {
    try {
      const result = await authPut(`/api/medications/${medicationId}`, {
        status: "completed",
        endDate: new Date().toISOString().split("T")[0],
      });
      if (result.success) {
        mutate(`/api/medications?memberId=${selectedFamilyId}`);
        setStopConfirm(null);
      } else alert("Error: " + (result.error || "Failed to stop medication"));
    } catch {
      alert("An error occurred");
    }
  };

  const addFamilyMember = async (formData: FamilyForm) => {
    try {
      const result = await authPost("/api/family", {
        ...formData,
        id: `fam-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      });
      if (result.success) {
        mutateFamily();
        setShowAddFamilyModal(false);
        familyForm.reset();
      } else alert("Error: " + result.error);
    } catch {
      alert("Failed to add family member");
    }
  };

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      alert("Notifications not supported.");
      return;
    }
    if (Notification.permission === "granted") {
      alert("Already enabled.");
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        });
        await authPost("/api/notifications/subscribe", subscription);
        alert("Notifications enabled!");
      } else alert("Permission denied.");
    } catch {
      alert("Failed to enable notifications.");
    }
  };

  const helpSlides = [
    {
      icon: <Users className="w-8 h-8 text-teal-600" />,
      title: "Add Family",
      description:
        "Tap + next to 'Managing for' to add dependents and track their medications.",
    },
    {
      icon: <Pill className="w-8 h-8 text-teal-600" />,
      title: "Add Medications",
      description:
        "Enter dosage, stock & frequency. We'll auto-calculate your schedule.",
    },
    {
      icon: <CheckCircle className="w-8 h-8 text-teal-600" />,
      title: "Log Doses",
      description:
        "Expand a card & mark doses as taken. Report any reactions instantly.",
    },
    {
      icon: <Bell className="w-8 h-8 text-teal-600" />,
      title: "Smart Reminders",
      description: "Enable push notifications to never miss a dose again.",
    },
  ];

  if (error)
    return (
      <div className="p-6 text-red-600 text-center bg-white rounded-2xl md:rounded-3xl border shadow-sm">
        Error loading medications.
      </div>
    );

  const isLoadingCombined = isLoading || prescribedLoading;

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <div
      className={cn(
        "min-h-screen bg-slate-50 pb-24 pt-1 md:pt-6",
        poppins.className,
      )}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6 space-y-5 md:space-y-8">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-8 w-1 rounded-full bg-gradient-to-b from-emerald-500 to-teal-600" />
              <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-[0.25em]">
                Medication Management
              </span>
            </div>
            <h1
              className={cn(
                "text-4xl md:text-5xl text-slate-900 leading-[1.1] tracking-tight",
                bebasNeue.className,
              )}
            >
              Medication <span className="text-emerald-600">Tracker</span>
            </h1>
            <p className="text-sm text-slate-600 mt-2 max-w-md">
              {streak > 0 ? (
                <span className="flex items-center gap-1.5 text-amber-600">
                  <Sparkles className="w-4 h-4" />
                  <span className="font-semibold">
                    {streak}-day streak! Keep it up.
                  </span>
                </span>
              ) : (
                "Stay on top of your health regimen."
              )}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={requestNotificationPermission}
              className="flex items-center gap-2 px-5 py-3 bg-slate-800 text-white rounded-xl font-medium hover:bg-slate-700 transition shadow-sm"
            >
              <Bell size={16} />
              <span className="hidden sm:inline">Reminders</span>
            </button>
            <button
              onClick={() => setShowAddMedModal(true)}
              className="flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition shadow-sm shadow-emerald-200"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Add Med</span>
            </button>
          </div>
        </div>

        {/* STATS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
          {isLoadingCombined ? (
            <>
              <SkeletonStatCard />
              <SkeletonStatCard />
              <SkeletonStatCard />
              <SkeletonStatCard />
            </>
          ) : (
            <>
              <BentoTile className="lg:col-span-1 col-span-1 sm:col-span-2">
                <div className="flex items-center justify-between mb-3">
                  <h3
                    className={cn(
                      "text-sm font-semibold text-slate-800 flex items-center gap-2",
                      bebasNeue.className,
                    )}
                  >
                    <Users className="text-teal-600" size={18} /> Managing For
                  </h3>
                  <button
                    onClick={() => setShowAddFamilyModal(true)}
                    className="p-2 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    <UserPlus size={16} className="text-slate-400" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {familyMembers.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedFamilyId(m.id)}
                      className={cn(
                        "flex-1 min-w-[56px] text-center px-2 py-1.5 rounded-xl text-xs font-medium transition-all",
                        selectedFamilyId === m.id
                          ? "bg-teal-50 text-teal-800 border border-teal-200"
                          : "text-slate-600 hover:bg-slate-50",
                      )}
                    >
                      <div className="truncate text-xs">{m.name}</div>
                      {m.relationship !== "self" && (
                        <div className="text-[8px] text-slate-400">
                          {m.relationship}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </BentoTile>

              <BentoTile
                gradient
                className="bg-gradient-to-br from-teal-600 to-teal-800 text-white relative"
              >
                <div className="absolute top-0 right-0 p-3 opacity-10">
                  <Pill size={48} />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Calendar size={14} className="text-teal-200" />
                    <h3
                      className={cn(
                        "text-xs font-semibold text-teal-100",
                        bebasNeue.className,
                      )}
                    >
                      Today's Doses
                    </h3>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <p className="text-3xl md:text-5xl font-bold text-white">
                      {todayDosesRemaining}
                    </p>
                    <span className="text-sm text-teal-200 font-medium">
                      /{todayDosesTotal}
                    </span>
                  </div>
                  <p className="text-xs text-teal-100 mt-0.5">
                    {todayDosesRemaining === 0
                      ? "All done for today"
                      : "remaining today"}
                  </p>
                  <div className="mt-2 w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${todayDosesTotal > 0 ? ((todayDosesTotal - todayDosesRemaining) / todayDosesTotal) * 100 : 0}%`,
                      }}
                      className="h-full bg-white rounded-full"
                    />
                  </div>
                </div>
              </BentoTile>

              <BentoTile
                gradient
                className="bg-gradient-to-br from-blue-600 to-blue-800 text-white relative"
              >
                <div className="absolute top-0 right-0 p-3 opacity-10">
                  <Clock size={48} />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Clock size={14} className="text-blue-200" />
                    <h3
                      className={cn(
                        "text-xs font-semibold text-blue-100",
                        bebasNeue.className,
                      )}
                    >
                      Next Dose
                    </h3>
                  </div>
                  {nextDose ? (
                    <>
                      <p className="text-sm md:text-lg font-semibold text-white truncate">
                        {nextDose.medicationName}
                      </p>
                      <p className="text-2xl md:text-3xl font-bold text-white mt-0.5">
                        {timeRemaining}
                      </p>
                      <p className="text-[10px] text-blue-100 mt-0.5">
                        {new Date(nextDose.scheduledTime).toLocaleTimeString(
                          [],
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}{" "}
                        · {nextDose.assignedToName}
                      </p>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 text-white">
                      <CheckCircle size={20} />
                      <span className="font-medium">All done for now</span>
                    </div>
                  )}
                </div>
              </BentoTile>

              <BentoTile
                gradient
                className="bg-gradient-to-br from-violet-600 to-violet-800 text-white relative"
              >
                <div className="absolute top-0 right-0 p-3 opacity-10">
                  <Shield size={48} />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingUp size={14} className="text-violet-200" />
                    <h3
                      className={cn(
                        "text-xs font-semibold text-violet-100",
                        bebasNeue.className,
                      )}
                    >
                      Adherence Score
                    </h3>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl md:text-5xl font-bold text-white">
                      {adherenceScore}%
                    </p>
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-lg text-[10px] font-bold",
                        adherenceScore >= 90
                          ? "bg-emerald-400/30 text-emerald-100"
                          : adherenceScore >= 70
                            ? "bg-amber-400/30 text-amber-100"
                            : "bg-red-400/30 text-red-100",
                      )}
                    >
                      {adherenceScore >= 90
                        ? "Excellent"
                        : adherenceScore >= 70
                          ? "Good"
                          : "Needs Work"}
                    </span>
                  </div>
                  <p className="text-[10px] text-violet-100 mt-0.5">
                    {adherenceScore >= 90
                      ? "Outstanding consistency"
                      : adherenceScore >= 70
                        ? "You're doing well"
                        : "Let's get back on track"}
                  </p>
                </div>
              </BentoTile>
            </>
          )}
        </div>

        {/* UPCOMING DOSES + CHART */}
        {!isLoadingCombined && allExtended.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">
            <BentoTile className="lg:col-span-1">
              <div className="flex items-center justify-between mb-3">
                <h3
                  className={cn(
                    "text-sm font-semibold text-slate-800 flex items-center gap-2",
                    bebasNeue.className,
                  )}
                >
                  <Clock className="text-teal-600" size={18} /> Upcoming
                </h3>
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                  {upcomingDoses.length} doses
                </span>
              </div>
              <div className="space-y-2">
                {upcomingDoses.length === 0 ? (
                  <div className="text-center py-6">
                    <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-slate-500">
                      No upcoming doses
                    </p>
                  </div>
                ) : (
                  upcomingDoses.map((dose, i) => (
                    <UpcomingDosePill
                      key={`${dose.medicationId}-${dose.scheduledTime}`}
                      dose={dose}
                      index={i}
                      now={now}
                    />
                  ))
                )}
              </div>
            </BentoTile>

            <BentoTile className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="text-teal-600" size={18} />
                  <h3
                    className={cn(
                      "text-sm font-semibold text-slate-800",
                      bebasNeue.className,
                    )}
                  >
                    Adherence (14 Days)
                  </h3>
                </div>
                <div className="flex gap-3">
                  <div className="flex items-center gap-1 text-xs text-slate-600">
                    <div className="w-2 h-2 rounded-full bg-teal-500" /> Taken
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-600">
                    <div className="w-2 h-2 rounded-full bg-slate-300" />{" "}
                    Scheduled
                  </div>
                </div>
              </div>
              <div className="h-[200px] md:h-[260px] w-full">
                <ResponsiveContainer>
                  <AreaChart
                    data={chartData}
                    margin={{ top: 5, right: 5, left: -10, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient
                        id="takenGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#0d9488"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#0d9488"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#e2e8f0"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: "#64748b" }}
                      axisLine={{ stroke: "#cbd5e1" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                      width={30}
                      allowDecimals={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="taken"
                      stroke="#0d9488"
                      strokeWidth={2.5}
                      fill="url(#takenGradient)"
                      dot={{
                        r: 3,
                        fill: "white",
                        stroke: "#0d9488",
                        strokeWidth: 2,
                      }}
                      activeDot={{ r: 5, strokeWidth: 0 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="#94a3b8"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </BentoTile>
          </div>
        )}

        {/* MEDICATION LIST – GROUPED */}
        {isLoadingCombined ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
            {[...Array(4)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : allExtended.length === 0 ? (
          <div className="bg-white rounded-2xl md:rounded-3xl p-8 md:p-12 text-center border border-slate-200 shadow-sm">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-teal-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <Pill className="w-8 h-8 md:w-10 md:h-10 text-teal-600" />
            </div>
            <p className="text-lg md:text-xl font-semibold text-slate-800 mb-2">
              No medications yet
            </p>
            <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
              Add your first medication to start tracking, or visit a linked
              center to get a prescription.
            </p>
            <button
              onClick={() => setShowAddMedModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-2xl font-semibold text-xs uppercase tracking-wider hover:bg-teal-700 transition shadow-md"
            >
              <Plus className="w-4 h-4" /> Add Medication
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center gap-1 bg-white rounded-2xl p-1 border border-slate-200 w-fit shadow-sm">
              <button
                onClick={() => setActiveTab("active")}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-semibold transition-all",
                  activeTab === "active"
                    ? "bg-teal-600 text-white"
                    : "text-slate-600 hover:text-slate-800",
                )}
              >
                Active ({activeMeds.length})
              </button>
              <button
                onClick={() => setActiveTab("past")}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-semibold transition-all",
                  activeTab === "past"
                    ? "bg-slate-800 text-white"
                    : "text-slate-600 hover:text-slate-800",
                )}
              >
                Past ({pastMeds.length})
              </button>
            </div>

            <AnimatePresence mode="wait">
              {activeTab === "active" && (
                <motion.div
                  key="active"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  {groupedActive.map((group) => (
                    <div key={group.label}>
                      <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                        {group.label === "My Medications" ? (
                          <Pill className="w-4 h-4 text-teal-600" />
                        ) : (
                          <Building className="w-4 h-4 text-blue-600" />
                        )}
                        {group.label}
                        <span className="text-xs font-normal text-slate-400">
                          ({group.items.length})
                        </span>
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                        {group.items.map((med, i) => (
                          <MedicationCard
                            key={med.id}
                            medication={med}
                            colorIndex={i}
                            expanded={expandedMedId === med.id}
                            onToggleExpand={() =>
                              setExpandedMedId(
                                expandedMedId === med.id ? null : med.id,
                              )
                            }
                            onLogDose={(doseId, taken, reaction) =>
                              logDose(med.id, doseId, taken, reaction)
                            }
                            onReportReaction={(doseId) =>
                              setShowReactionModal({
                                medicationId: med.id,
                                doseId,
                              })
                            }
                            onStop={() => setStopConfirm(med.id)}
                            isPast={false}
                            now={now}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}

              {activeTab === "past" && (
                <motion.div
                  key="past"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6 opacity-75"
                >
                  {groupedPast.map((group) => (
                    <div key={group.label}>
                      <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                        {group.label === "My Medications" ? (
                          <Pill className="w-4 h-4 text-teal-600" />
                        ) : (
                          <Building className="w-4 h-4 text-blue-600" />
                        )}
                        {group.label}
                        <span className="text-xs font-normal text-slate-400">
                          ({group.items.length})
                        </span>
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                        {group.items.map((med, i) => (
                          <MedicationCard
                            key={med.id}
                            medication={med}
                            colorIndex={i}
                            expanded={expandedMedId === med.id}
                            onToggleExpand={() =>
                              setExpandedMedId(
                                expandedMedId === med.id ? null : med.id,
                              )
                            }
                            onLogDose={() => {}}
                            onReportReaction={() => {}}
                            onStop={() => {}}
                            isPast={true}
                            now={now}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Unstarted prescribed medications */}
            {unstartedMeds.length > 0 && activeTab === "active" && (
              <div className="mt-8 border-t border-slate-200 pt-6">
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <Building className="w-4 h-4 text-blue-600" />
                  Prescriptions from Centers (not started)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                  {unstartedMeds.map((p) => (
                    <div
                      key={p.id}
                      className="bg-white border border-slate-200 rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Pill className="w-4 h-4 text-emerald-600" />
                            <h4 className="font-semibold text-slate-900">
                              {p.name}
                            </h4>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                              {p.sourceType === "hospital"
                                ? "Hospital"
                                : "External"}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 mt-1">
                            {p.dosage} · {p.frequency}
                          </p>
                          <p className="text-xs text-slate-500">
                            from {p.centerName} · by {p.prescribedBy}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            {p.totalQuantity || "Ongoing"} doses total
                          </p>
                        </div>
                        <button
                          onClick={() => startPrescribedMedication(p)}
                          className="px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700 transition-colors shadow-sm flex items-center gap-2"
                        >
                          <Play className="w-4 h-4" /> Start
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODALS */}
      <AnimatePresence>
        {showHelp && (
          <Modal
            onClose={() => setShowHelp(false)}
            title="Quick Guide"
            icon={HelpCircle}
          >
            <div className="relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={helpSlide}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  className="flex flex-col items-center text-center p-4"
                >
                  <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mb-4">
                    {helpSlides[helpSlide].icon}
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">
                    {helpSlides[helpSlide].title}
                  </h3>
                  <p className="text-sm text-slate-600">
                    {helpSlides[helpSlide].description}
                  </p>
                </motion.div>
              </AnimatePresence>
              <div className="flex justify-center gap-2 mt-4">
                {helpSlides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setHelpSlide(i)}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all",
                      i === helpSlide ? "bg-teal-600 w-4" : "bg-slate-300",
                    )}
                  />
                ))}
              </div>
              <button
                onClick={() =>
                  setHelpSlide((p) => (p === 0 ? helpSlides.length - 1 : p - 1))
                }
                className="absolute left-0 top-1/2 -translate-y-1/2 p-2 bg-white rounded-full shadow-md border"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() =>
                  setHelpSlide((p) => (p === helpSlides.length - 1 ? 0 : p + 1))
                }
                className="absolute right-0 top-1/2 -translate-y-1/2 p-2 bg-white rounded-full shadow-md border"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <button
              onClick={() => setShowHelp(false)}
              className="mt-6 w-full py-3 bg-teal-600 text-white rounded-2xl font-semibold hover:bg-teal-700 transition"
            >
              Got it
            </button>
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddMedModal && (
          <Modal
            onClose={() => setShowAddMedModal(false)}
            title="New Medication"
            icon={Plus}
          >
            <form
              onSubmit={handleSubmit(onSubmitNewMed)}
              className="space-y-4 mt-2"
            >
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search for drug..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      handleDrugSearch(e.target.value);
                    }}
                    className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800 placeholder:text-slate-400"
                  />
                  {searching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-teal-500" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowSnapModal(true)}
                  className="px-4 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-700 transition-colors flex items-center gap-1.5"
                >
                  <Camera className="w-4 h-4" /> Snap
                </button>
              </div>

              {searchResults.length > 0 && (
                <div className="bg-slate-50 rounded-xl border border-slate-200 divide-y divide-slate-100 max-h-48 overflow-y-auto">
                  {searchResults.map((drug, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => selectDrug(drug)}
                      className="w-full text-left px-4 py-2.5 hover:bg-slate-100 transition-colors flex justify-between items-start"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {drug.name}
                        </p>
                        {drug.dosage && (
                          <span className="text-xs text-slate-500">
                            {drug.dosage}
                          </span>
                        )}
                        {drug.ailment && (
                          <p className="text-xs text-slate-400 truncate max-w-xs">
                            {drug.ailment}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-teal-600 font-medium">
                        Select
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  {...register("name")}
                  label="Name *"
                  placeholder="Amoxicillin"
                  error={errors.name?.message}
                />
                <Input
                  {...register("dosage")}
                  label="Dosage *"
                  placeholder="500mg"
                  error={errors.dosage?.message}
                />
                <Input
                  type="number"
                  step="0.1"
                  {...register("quantityPerDose")}
                  label="Qty per dose *"
                  error={errors.quantityPerDose?.message}
                />
                <Input
                  type="number"
                  {...register("totalQuantity")}
                  label="Total quantity (0 = ongoing)"
                  error={errors.totalQuantity?.message}
                />
                <Input
                  type="number"
                  step="1"
                  {...register("durationDays")}
                  label="Duration (days) – optional"
                  placeholder="e.g., 7"
                  error={errors.durationDays?.message}
                />
                <div className="text-xs text-slate-400 -mt-2 col-span-2">
                  * Leave both blank for "ongoing" (no fixed end date)
                </div>
                <Input
                  {...register("ailment")}
                  label="Ailment"
                  placeholder="Infection"
                />
                <Select
                  {...register("frequency")}
                  label="Frequency *"
                  error={errors.frequency?.message}
                >
                  <option value="once">Once daily</option>
                  <option value="twice">Twice daily</option>
                  <option value="thrice">Thrice daily</option>
                  <option value="custom">Custom</option>
                </Select>
                <Select
                  {...register("assignedTo")}
                  label="Assigned to *"
                  error={errors.assignedTo?.message}
                >
                  {familyMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                      {m.relationship !== "self" ? ` (${m.relationship})` : ""}
                    </option>
                  ))}
                </Select>
                {watch("frequency") === "custom" && (
                  <Input
                    {...register("times")}
                    label="Times (comma separated) *"
                    placeholder="08:00, 14:00, 20:00"
                    error={errors.times?.message}
                    className="sm:col-span-2"
                  />
                )}
                <Input
                  type="date"
                  {...register("startDate")}
                  label="Start Date *"
                  error={errors.startDate?.message}
                />
                <Input
                  {...register("instructions")}
                  label="Instructions"
                  placeholder="Take with food"
                  className="sm:col-span-2"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMedModal(false)}
                  className="px-5 py-2 text-sm bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2 text-sm bg-teal-600 text-white rounded-xl hover:bg-teal-700 disabled:opacity-50 shadow-sm"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}{" "}
                  Save
                </button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddFamilyModal && (
          <Modal
            onClose={() => setShowAddFamilyModal(false)}
            title="Add Family Member"
            icon={UserPlus}
          >
            <form
              onSubmit={familyForm.handleSubmit(addFamilyMember)}
              className="space-y-4 mt-2"
            >
              <Input
                {...familyForm.register("name")}
                label="Name *"
                placeholder="Full name"
                error={familyForm.formState.errors.name?.message}
              />
              <Input
                {...familyForm.register("phone")}
                label="Phone *"
                placeholder="+1234567890"
                error={familyForm.formState.errors.phone?.message}
              />
              <Input
                {...familyForm.register("relationship")}
                label="Relationship *"
                placeholder="Spouse, Child"
                error={familyForm.formState.errors.relationship?.message}
              />
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddFamilyModal(false)}
                  className="px-5 py-2 text-sm bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={familyForm.formState.isSubmitting}
                  className="flex items-center gap-2 px-5 py-2 text-sm bg-teal-600 text-white rounded-xl hover:bg-teal-700 disabled:opacity-50 shadow-sm"
                >
                  {familyForm.formState.isSubmitting && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}{" "}
                  Add
                </button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showReactionModal && (
          <Modal
            onClose={() => setShowReactionModal(null)}
            title="Report Reaction"
            icon={AlertCircle}
          >
            <form
              onSubmit={reactionForm.handleSubmit(async (data) => {
                if (showReactionModal) {
                  await logDose(
                    showReactionModal.medicationId,
                    showReactionModal.doseId,
                    true,
                    data.reaction,
                  );
                }
                setShowReactionModal(null);
                reactionForm.reset();
              })}
              className="space-y-4 mt-2"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  How did you feel? *
                </label>
                <Textarea
                  {...reactionForm.register("reaction")}
                  placeholder="Describe any side effects..."
                  className="min-h-[80px]"
                />
                {reactionForm.formState.errors.reaction && (
                  <p className="text-red-500 text-xs mt-1">
                    {reactionForm.formState.errors.reaction.message}
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowReactionModal(null)}
                  className="px-5 py-2 text-sm bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reactionForm.formState.isSubmitting}
                  className="flex items-center gap-2 px-5 py-2 text-sm bg-teal-600 text-white rounded-xl hover:bg-teal-700 disabled:opacity-50 shadow-sm"
                >
                  {reactionForm.formState.isSubmitting && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}{" "}
                  Submit
                </button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {stopConfirm && (
          <Modal
            onClose={() => setStopConfirm(null)}
            title="Stop Medication?"
            icon={StopCircle}
          >
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
                <StopCircle className="w-8 h-8 text-amber-600" />
              </div>
              <p className="text-sm text-slate-600">
                This will mark it as finished and move it to Past.
              </p>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={() => setStopConfirm(null)}
                  className="px-5 py-2 text-sm bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => stopConfirm && stopMedication(stopConfirm)}
                  className="px-5 py-2 text-sm bg-amber-600 text-white rounded-xl hover:bg-amber-700 shadow-sm"
                >
                  Finish
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSnapModal && (
          <SnapDrugModal
            onClose={() => setShowSnapModal(false)}
            onSnap={(name: string) => {
              setValue("name", name);
              setShowSnapModal(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
