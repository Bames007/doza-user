// app/dashboard/panels/MedicationPanel.tsx

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
  ChevronUp,
  Calendar,
  AlertCircle,
  UserPlus,
  Clock,
  Package,
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
  ailment?: string;
  frequency: "once" | "twice" | "thrice" | "custom";
  times: string[];
  instructions?: string;
  startDate: string;
  endDate?: string;
  assignedTo: string;
  status: "active" | "completed" | "paused";
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

type MedicationSource = "self" | "prescribed";

interface ExtendedMedication extends Medication {
  source?: MedicationSource;
  centerId?: string;
  centerName?: string;
  prescribedBy?: string;
  prescribedAt?: string;
}

// ---------- Schemas ----------
const medicationSchema = z
  .object({
    name: z.string().min(1, "Medication name is required"),
    dosage: z.string().min(1, "Dosage is required"),
    quantityPerDose: z.coerce.number().min(0.1, "Must be at least 0.1"),
    totalQuantity: z.coerce.number().min(1, "Must be at least 1"),
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

function generateDoses(
  startDate: string,
  times: string[],
  qtyPerDose: number,
  totalQty: number,
  existing: Dose[] = [],
): Dose[] {
  const doses: Dose[] = [];
  const [y, m, d] = startDate.split("-").map(Number);
  const start = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const perDay = times.length;
  const maxDoses = Math.min(totalQty, perDay * 30);
  for (let i = existing.length; i < maxDoses; i++) {
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

function generatePrescribedDoses(startDate: string, frequency: string): Dose[] {
  let times: string[] = [];
  if (frequency === "once") times = ["08:00"];
  else if (frequency === "twice") times = ["08:00", "20:00"];
  else if (frequency === "thrice") times = ["08:00", "14:00", "20:00"];
  else return [];
  return generateDoses(startDate, times, 1, 30, []);
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
  <div className="bg-white border border-slate-200 rounded-3xl p-6">
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
  <div className="bg-white border border-slate-200 rounded-3xl p-7">
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
      "p-6 rounded-3xl border transition-all duration-300",
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
      className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200"
      onClick={(e) => e.stopPropagation()}
    >
      {(title || Icon) && (
        <div className="flex items-center gap-3 px-6 pt-6 pb-2">
          {Icon && (
            <div className="w-10 h-10 rounded-2xl bg-teal-50 flex items-center justify-center">
              <Icon className="w-5 h-5 text-teal-600" />
            </div>
          )}
          {title && (
            <h2 className="text-xl font-bold text-slate-800">{title}</h2>
          )}
        </div>
      )}
      <div className="p-6 pt-2">{children}</div>
    </motion.div>
  </motion.div>
);

// ---------- Input Component with good contrast ----------
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

// ---------- Select Input ----------
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

// ---------- Textarea ----------
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

// ---------- Drug Search Function ----------
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

// ---------- Medication Card ----------
const MedicationCard = ({
  medication,
  expanded,
  onToggleExpand,
  onLogDose,
  onReportReaction,
  onStop,
  isPast,
  onLogPrescribedDose,
  colorIndex,
}: {
  medication: ExtendedMedication;
  expanded: boolean;
  onToggleExpand: () => void;
  onLogDose: (doseId: string, taken: boolean) => void;
  onReportReaction: (doseId: string) => void;
  onStop: () => void;
  isPast?: boolean;
  onLogPrescribedDose?: (
    medicationId: string,
    centerId: string,
    doseId: string,
    taken: boolean,
    reaction?: string,
  ) => Promise<void>;
  colorIndex: number;
}) => {
  const medColor = medication.color || getMedicationColor(colorIndex);
  const isPrescribed = medication.source === "prescribed";
  const qty = Number(medication.quantityPerDose) || 1;
  const total = Number(medication.totalQuantity) || 0;
  const takenCount = medication.doses.filter((d) => d.takenAt).length;
  const totalNeeded = total / qty;
  const remaining = Math.max(0, totalNeeded - takenCount) * qty;
  const completion = totalNeeded > 0 ? (takenCount / totalNeeded) * 100 : 0;

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

  const next7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .split("T")[0];
  });

  const handleLog = async (
    doseId: string,
    taken: boolean,
    reaction?: string,
  ) => {
    if (isPrescribed && medication.centerId) {
      await onLogPrescribedDose?.(
        medication.id,
        medication.centerId,
        doseId,
        taken,
        reaction,
      );
    } else {
      onLogDose(doseId, taken);
    }
  };

  const stockStatus =
    remaining <= qty * 3 ? "critical" : remaining <= qty * 7 ? "low" : "good";

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
        "bg-white rounded-3xl border overflow-hidden transition-shadow duration-300",
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

      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 cursor-pointer" onClick={onToggleExpand}>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${medColor}15` }}
              >
                <Pill className="w-4 h-4" style={{ color: medColor }} />
              </div>
              <h3 className="font-semibold text-slate-900 text-lg">
                {medication.name}
              </h3>
              <span
                className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                style={{
                  backgroundColor: `${medColor}15`,
                  color: medColor,
                }}
              >
                {medication.dosage}
              </span>
              {isPrescribed && (
                <span className="text-[10px] bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-bold flex items-center gap-1 border border-blue-100">
                  <Stethoscope className="w-3 h-3" />
                  Prescribed
                </span>
              )}
              {medication.ailment && (
                <span className="text-[10px] bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full font-medium border border-slate-200">
                  {medication.ailment}
                </span>
              )}
            </div>

            {isPrescribed && (
              <p className="text-xs text-slate-600 ml-10">
                by{" "}
                <span className="font-medium text-slate-800">
                  {medication.prescribedBy}
                </span>{" "}
                · {medication.centerName}
              </p>
            )}

            <div className="flex items-center gap-2 mt-2 ml-10">
              <div
                className={cn(
                  "w-2 h-2 rounded-full",
                  stockStatus === "critical" && "bg-red-500 animate-pulse",
                  stockStatus === "low" && "bg-amber-500",
                  stockStatus === "good" && "bg-emerald-500",
                )}
              />
              <span className="text-xs text-slate-600">
                <span className="font-semibold text-slate-800">
                  {isNaN(remaining) ? "?" : Math.round(remaining)}
                </span>{" "}
                / {total} remaining
                {stockStatus === "critical" && (
                  <span className="text-red-600 font-bold ml-1">
                    · Refill needed
                  </span>
                )}
                {stockStatus === "low" && (
                  <span className="text-amber-600 font-medium ml-1">
                    · Running low
                  </span>
                )}
              </span>
            </div>
          </div>

          <button
            onClick={onToggleExpand}
            className="p-2 hover:bg-slate-50 rounded-xl transition-colors"
          >
            <motion.div
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-5 h-5 text-slate-400" />
            </motion.div>
          </button>
        </div>

        <div className="mt-5 space-y-3">
          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1.5">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> Today
              </span>
              <span>
                {takenToday}/{todaysDoses.length} doses
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
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

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-5 space-y-5 overflow-hidden"
            >
              <div>
                <h4 className="text-xs font-semibold text-slate-700 mb-3 flex items-center gap-1.5 uppercase tracking-wider">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Next 7 Days
                </h4>
                <div className="grid grid-cols-7 gap-1.5">
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
                          "aspect-square rounded-xl flex flex-col items-center justify-center text-[10px] p-1 transition-all",
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
                        <span className="font-bold text-sm">{dayNum}</span>
                        {tt > 0 && (
                          <span className="text-[8px] font-semibold">
                            {tk}/{tt}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                {medication.endDate && (
                  <p className="text-[10px] text-slate-500 mt-2 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Est. finish:{" "}
                    {new Date(medication.endDate).toLocaleDateString()}
                  </p>
                )}
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-700 mb-3 flex items-center gap-1.5 uppercase tracking-wider">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Today's Schedule
                </h4>
                {todaysDoses.length === 0 ? (
                  <div className="bg-slate-50 rounded-2xl p-4 text-center">
                    <p className="text-xs text-slate-500">
                      No doses scheduled for today.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {todaysDoses.map((dose) => {
                      const taken = !!dose.takenAt;
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

                      return (
                        <motion.div
                          key={dose.id}
                          layout
                          className={cn(
                            "flex items-center justify-between p-3.5 rounded-2xl border transition-all",
                            taken
                              ? "bg-emerald-50 border-emerald-100"
                              : "bg-slate-50 border-slate-100",
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "w-9 h-9 rounded-xl flex items-center justify-center",
                                colorClass,
                              )}
                            >
                              <TimeIcon className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-900">
                                {doseTime.toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                              {dose.reaction && (
                                <p className="text-xs text-amber-600 mt-0.5 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" />
                                  {dose.reaction}
                                </p>
                              )}
                            </div>
                          </div>

                          {!isPast && !taken ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleLog(dose.id, true)}
                                className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-200"
                              >
                                <Check className="w-3.5 h-3.5 inline mr-1" />
                                Take
                              </button>
                              <button
                                onClick={() => onReportReaction(dose.id)}
                                className="px-3 py-2 bg-amber-50 text-amber-700 text-xs font-bold rounded-xl hover:bg-amber-100 transition-colors border border-amber-200"
                              >
                                <AlertCircle className="w-3.5 h-3.5 inline mr-1" />
                                Issue
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-xl">
                              <CheckCircle className="w-4 h-4" />
                              Taken
                            </span>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>

              {!isPast && (
                <button
                  onClick={onStop}
                  className="w-full py-3 text-sm bg-slate-50 text-slate-600 rounded-2xl hover:bg-red-50 hover:text-red-600 transition-all font-bold flex items-center justify-center gap-2 border border-slate-200 hover:border-red-200"
                >
                  <StopCircle className="w-4 h-4" />
                  Stop Medication
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
}: {
  dose: UpcomingDose;
  index: number;
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
  const now = Date.now();
  const diff = doseTime.getTime() - now;
  const isDue = diff <= 0;
  const isSoon = diff > 0 && diff <= 3600000;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className={cn(
        "flex items-center gap-3 p-3 rounded-2xl border transition-all",
        isDue
          ? "bg-red-50 border-red-200"
          : isSoon
            ? "bg-amber-50 border-amber-200"
            : "bg-white border-slate-200",
      )}
    >
      <div
        className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center",
          colorClass,
        )}
      >
        <TimeIcon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900 truncate">
          {dose.medicationName}
        </p>
        <p className="text-xs text-slate-600">
          {doseTime.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}{" "}
          · {dose.dosage} · {dose.assignedToName}
        </p>
      </div>
      {isDue ? (
        <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded-lg">
          Due Now
        </span>
      ) : isSoon ? (
        <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2 py-1 rounded-lg">
          Soon
        </span>
      ) : (
        <span className="text-xs font-medium text-slate-500">
          {Math.floor(diff / 3600000)}h {Math.floor((diff % 3600000) / 60000)}m
        </span>
      )}
    </motion.div>
  );
};

// ---------- Camera / Snap Modal ----------
const SnapDrugModal = ({
  onClose,
  onSnap,
}: {
  onClose: () => void;
  onSnap: (name: string) => void;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"camera" | "result">("camera");

  // Function to stop the camera stream
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

  // Start camera when step is "camera"
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
              playPromise.catch((err) => {
                console.warn("Auto-play prevented:", err);
              });
            }
          }
        })
        .catch((err) => {
          setError("Cannot access camera. Please allow camera access.");
          console.error(err);
        });
    }
    // Cleanup when step changes away from camera or component unmounts
    return () => {
      if (step === "camera") {
        stopCamera();
      }
    };
  }, [step, stopCamera]);

  // Cleanup on unmount – always stop the camera
  useEffect(() => {
    return () => {
      stopCamera();
    };
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
    // Stop camera immediately after capture
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
    // Camera will restart via the useEffect when step changes to "camera"
  };

  // Handle manual close – stop camera before closing
  const handleClose = () => {
    stopCamera();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800">Snap Drug</h3>
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
              <AlertCircle className="w-4 h-4" />
              {error}
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
                className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white rounded-full p-4 shadow-lg hover:scale-105 transition-transform"
              >
                <Camera className="w-6 h-6 text-slate-900" />
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
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setExtractedText(e.target.value)}
                  placeholder="OCR result will appear here..."
                  className="min-h-[80px]"
                />
                {isProcessing && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing image...
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

  // Merge
  const allMedications = useMemo<ExtendedMedication[]>(() => {
    const self = selfMedications.map((m, i) => ({
      ...m,
      source: "self" as const,
      color: getMedicationColor(i),
    }));

    const prescribed = prescribedMeds.map((p, i) => {
      const doses = generatePrescribedDoses(
        p.prescribedAt.split("T")[0],
        p.frequency,
      );
      return {
        id: p.id,
        name: p.medication,
        dosage: p.dosage,
        quantityPerDose: 1,
        totalQuantity: 30,
        frequency: p.frequency as "once" | "twice" | "thrice" | "custom",
        times: [],
        instructions: p.instructions,
        startDate: p.prescribedAt.split("T")[0],
        assignedTo: selectedFamilyId,
        status: p.status,
        doses,
        createdAt: p.prescribedAt,
        source: "prescribed" as const,
        centerId: p.centerId,
        centerName: p.centerName,
        prescribedBy: p.prescribedBy,
        prescribedAt: p.prescribedAt,
        color: getMedicationColor(self.length + i),
      };
    });

    return [...self, ...prescribed];
  }, [selfMedications, prescribedMeds, selectedFamilyId]);

  const activeMeds = allMedications.filter((m) => m.status === "active");
  const pastMeds = allMedications.filter((m) => m.status !== "active");
  const adherenceScore = getAdherenceScore(allMedications);
  const streak = getStreak(allMedications);

  const upcomingDoses = useMemo<UpcomingDose[]>(() => {
    const now = Date.now();
    const all = allMedications.flatMap((med) =>
      med.doses
        .filter((d) => !d.takenAt && new Date(d.scheduledTime).getTime() > now)
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
  }, [allMedications]);

  const chartData = useMemo(() => {
    const last14Days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }).reverse();
    return last14Days.map((day) => {
      const dayDoses = allMedications.flatMap((m) =>
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
  }, [allMedications]);

  const [timeRemaining, setTimeRemaining] = useState("");
  const nextDose = upcomingDoses.length > 0 ? upcomingDoses[0] : null;
  useEffect(() => {
    if (!nextDose) return;
    const update = () => {
      const diff = new Date(nextDose.scheduledTime).getTime() - Date.now();
      if (diff <= 0) {
        setTimeRemaining("Due now");
      } else {
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        setTimeRemaining(`${h}h ${m}m`);
      }
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [nextDose]);

  const todayDosesRemaining = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return allMedications
      .flatMap((m) => m.doses)
      .filter((d) => d.scheduledTime.startsWith(today) && !d.takenAt).length;
  }, [allMedications]);

  const todayDosesTotal = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return allMedications
      .flatMap((m) => m.doses)
      .filter((d) => d.scheduledTime.startsWith(today)).length;
  }, [allMedications]);

  // Forms
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
      totalQuantity: 30,
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
    let times: string[] = [];
    if (formData.frequency === "once") times = ["08:00"];
    else if (formData.frequency === "twice") times = ["08:00", "20:00"];
    else if (formData.frequency === "thrice")
      times = ["08:00", "14:00", "20:00"];
    else if (formData.frequency === "custom" && formData.times)
      times = formData.times.split(",").map((t) => t.trim());
    const doses = generateDoses(
      formData.startDate,
      times,
      formData.quantityPerDose,
      formData.totalQuantity,
    );
    try {
      const result = await authPost("/api/medications", {
        ...formData,
        times,
        doses,
        status: "active",
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

  const logDose = async (
    medicationId: string,
    doseId: string,
    taken: boolean,
    reaction?: string,
  ) => {
    try {
      const result = await authPut(
        `/api/medications/${medicationId}/doses/${doseId}`,
        {
          taken,
          reaction,
        },
      );
      if (result.success) {
        mutate(`/api/medications?memberId=${selectedFamilyId}`);
      } else alert("Error: " + (result.error || "Failed to log dose"));
    } catch {
      alert("An error occurred");
    }
  };

  const logPrescribedDose = async (
    medicationId: string,
    centerId: string,
    doseId: string,
    taken: boolean,
    reaction?: string,
  ) => {
    try {
      const getRes = await fetch(
        `/api/centers/${centerId}/patients/${user?.id}`,
        {
          credentials: "include",
        },
      );
      if (!getRes.ok) throw new Error("Failed to fetch patient record");
      const patientData = await getRes.json();
      if (!patientData.success) throw new Error("Failed to fetch patient data");

      const existingAdmins = patientData.data?.medicationAdministrations || [];
      const newAdmin = {
        medication:
          patientData.data?.prescriptions?.find(
            (rx: any) =>
              rx.medication ===
              allMedications.find((m) => m.id === medicationId)?.name,
          )?.medication || "Unknown",
        dose: "1",
        administeredAt: new Date().toISOString(),
        administeredBy: "Patient (self)",
        administeredById: user?.id,
        reaction: reaction || "",
        note: `Logged from patient app. Dose ID: ${doseId}`,
      };

      const updatedAdmins = [...existingAdmins, newAdmin];

      const putRes = await fetch(
        `/api/centers/${centerId}/patients/${user?.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ medicationAdministrations: updatedAdmins }),
        },
      );
      if (!putRes.ok) throw new Error("Failed to update patient record");

      alert(
        "Dose logged successfully. It will be visible to your healthcare provider.",
      );
    } catch (err) {
      console.error("Failed to log prescribed dose", err);
      alert("Failed to log dose for prescribed medication.");
    }
  };

  const stopMedication = async (medicationId: string) => {
    try {
      const result = await authPut(`/api/medications/${medicationId}`, {
        status: "completed",
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
      <div className="p-6 text-red-600 text-center bg-white rounded-3xl border shadow-sm">
        Error loading medications.
      </div>
    );

  const isLoadingCombined = isLoading || prescribedLoading;

  return (
    <div
      className={cn("min-h-screen bg-slate-50 pb-32 pt-6", poppins.className)}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6 space-y-8">
        {/* ─── HEADER ─────────────────────────────────────────────── */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm"
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-teal-600" />
                </div>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.25em]">
                  Adherence Protocol
                </p>
              </div>
              <h1
                className={cn(
                  "text-4xl md:text-5xl text-slate-800 leading-none",
                  bebasNeue.className,
                )}
              >
                Medication <span className="text-teal-600">Tracker</span>
              </h1>
              <p className="text-sm text-slate-600 mt-2">
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
            <div className="flex gap-3">
              <button
                onClick={requestNotificationPermission}
                className="flex items-center gap-2 px-5 py-3 bg-slate-800 text-white rounded-2xl text-xs font-semibold uppercase tracking-wider hover:bg-slate-700 transition-all"
              >
                <Bell size={14} /> Reminders
              </button>
              <button
                onClick={() => setShowAddMedModal(true)}
                className="flex items-center gap-2 px-5 py-3 bg-teal-600 text-white rounded-2xl text-xs font-semibold uppercase tracking-wider hover:bg-teal-700 transition-all shadow-md"
              >
                <Plus size={14} /> Add Med
              </button>
            </div>
          </div>
        </motion.header>

        {/* ─── STATS GRID ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {isLoadingCombined ? (
            <>
              <SkeletonStatCard />
              <SkeletonStatCard />
              <SkeletonStatCard />
              <SkeletonStatCard />
            </>
          ) : (
            <>
              <BentoTile className="lg:col-span-1">
                <div className="flex items-center justify-between mb-4">
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
                <div className="space-y-1.5">
                  {familyMembers.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedFamilyId(m.id)}
                      className={cn(
                        "w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-between",
                        selectedFamilyId === m.id
                          ? "bg-teal-50 text-teal-800 border border-teal-200"
                          : "text-slate-600 hover:bg-slate-50",
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={cn(
                            "w-2 h-2 rounded-full transition-all",
                            selectedFamilyId === m.id
                              ? "bg-teal-500 scale-125"
                              : "bg-slate-300",
                          )}
                        />
                        <span className="font-semibold">{m.name}</span>
                      </div>
                      {m.relationship !== "self" && (
                        <span className="text-[10px] text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-lg">
                          {m.relationship}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </BentoTile>

              <BentoTile
                gradient
                className="bg-gradient-to-br from-teal-600 to-teal-800 text-white"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Pill size={64} />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar size={16} className="text-teal-200" />
                    <h3
                      className={cn(
                        "text-sm font-semibold text-teal-100",
                        bebasNeue.className,
                      )}
                    >
                      Today's Doses
                    </h3>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <p className="text-5xl font-bold text-white">
                      {todayDosesRemaining}
                    </p>
                    <span className="text-sm text-teal-200 font-medium">
                      /{todayDosesTotal}
                    </span>
                  </div>
                  <p className="text-xs text-teal-100 mt-1">
                    {todayDosesRemaining === 0
                      ? "All done for today"
                      : "remaining today"}
                  </p>
                  <div className="mt-3 w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
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
                className="bg-gradient-to-br from-blue-600 to-blue-800 text-white"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Clock size={64} />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock size={16} className="text-blue-200" />
                    <h3
                      className={cn(
                        "text-sm font-semibold text-blue-100",
                        bebasNeue.className,
                      )}
                    >
                      Next Dose
                    </h3>
                  </div>
                  {nextDose ? (
                    <>
                      <p className="text-lg font-semibold text-white truncate">
                        {nextDose.medicationName}
                      </p>
                      <p className="text-3xl font-bold text-white mt-0.5">
                        {timeRemaining}
                      </p>
                      <p className="text-xs text-blue-100 mt-1">
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
                className="bg-gradient-to-br from-violet-600 to-violet-800 text-white"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Shield size={64} />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp size={16} className="text-violet-200" />
                    <h3
                      className={cn(
                        "text-sm font-semibold text-violet-100",
                        bebasNeue.className,
                      )}
                    >
                      Adherence Score
                    </h3>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <p className="text-5xl font-bold text-white">
                      {adherenceScore}%
                    </p>
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-lg text-xs font-bold",
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
                  <p className="text-xs text-violet-100 mt-1">
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

        {/* ─── UPCOMING DOSES + CHART ────────────────────────────── */}
        {!isLoadingCombined && allMedications.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <BentoTile className="lg:col-span-1">
              <div className="flex items-center justify-between mb-4">
                <h3
                  className={cn(
                    "text-sm font-semibold text-slate-800 flex items-center gap-2",
                    bebasNeue.className,
                  )}
                >
                  <Clock className="text-teal-600" size={18} />
                  Upcoming
                </h3>
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                  {upcomingDoses.length} doses
                </span>
              </div>
              <div className="space-y-2">
                {upcomingDoses.length === 0 ? (
                  <div className="text-center py-8">
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
                    />
                  ))
                )}
              </div>
            </BentoTile>

            <BentoTile className="lg:col-span-2">
              <div className="flex items-center justify-between mb-6">
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
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <div className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                    Taken
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                    Scheduled
                  </div>
                </div>
              </div>
              <div className="h-[260px] w-full">
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

        {/* ─── MEDICATION LIST ──────────────────────────────────────── */}
        {isLoadingCombined ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[...Array(4)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : allMedications.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
            <div className="w-20 h-20 bg-teal-50 rounded-3xl flex items-center justify-center mx-auto mb-5">
              <Pill className="w-10 h-10 text-teal-600" />
            </div>
            <p className="text-xl font-semibold text-slate-800 mb-2">
              No medications yet
            </p>
            <p className="text-sm text-slate-500 mb-8 max-w-md mx-auto">
              Add your first medication to start tracking, or visit a linked
              center to get a prescription.
            </p>
            <button
              onClick={() => setShowAddMedModal(true)}
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-teal-600 text-white rounded-2xl font-semibold text-xs uppercase tracking-wider hover:bg-teal-700 transition shadow-md"
            >
              <Plus className="w-4 h-4" /> Add Medication
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-1 bg-white rounded-2xl p-1 border border-slate-200 w-fit shadow-sm">
              <button
                onClick={() => setActiveTab("active")}
                className={cn(
                  "px-5 py-2.5 rounded-xl text-xs font-semibold transition-all",
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
                  "px-5 py-2.5 rounded-xl text-xs font-semibold transition-all",
                  activeTab === "past"
                    ? "bg-slate-800 text-white"
                    : "text-slate-600 hover:text-slate-800",
                )}
              >
                Past ({pastMeds.length})
              </button>
            </div>

            <AnimatePresence mode="wait">
              {activeTab === "active" && activeMeds.length > 0 && (
                <motion.div
                  key="active"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-5"
                >
                  {activeMeds.map((med, i) => (
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
                      onLogDose={(doseId, taken) =>
                        logDose(med.id, doseId, taken)
                      }
                      onReportReaction={(doseId) =>
                        setShowReactionModal({ medicationId: med.id, doseId })
                      }
                      onStop={() => setStopConfirm(med.id)}
                      isPast={false}
                      onLogPrescribedDose={logPrescribedDose}
                    />
                  ))}
                </motion.div>
              )}

              {activeTab === "past" && pastMeds.length > 0 && (
                <motion.div
                  key="past"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-5 opacity-75"
                >
                  {pastMeds.map((med, i) => (
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
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ─── MODALS ──────────────────────────────────────────────────── */}

      {/* Help Modal */}
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

      {/* ─── ADD MEDICATION MODAL ──────────────────────────────── */}
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
              {/* Drug search / snap row */}
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
                  label="Total stock *"
                  error={errors.totalQuantity?.message}
                />
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

      {/* ─── ADD FAMILY MODAL ────────────────────────────────────── */}
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

      {/* ─── REACTION MODAL ──────────────────────────────────────── */}
      <AnimatePresence>
        {showReactionModal && (
          <Modal
            onClose={() => setShowReactionModal(null)}
            title="Report Reaction"
            icon={AlertCircle}
          >
            <form
              onSubmit={reactionForm.handleSubmit(async (data) => {
                const med = allMedications.find(
                  (m) => m.id === showReactionModal.medicationId,
                );
                if (med?.source === "prescribed" && med.centerId) {
                  await logPrescribedDose(
                    med.id,
                    med.centerId,
                    showReactionModal.doseId,
                    true,
                    data.reaction,
                  );
                } else {
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

      {/* ─── STOP CONFIRMATION ──────────────────────────────────── */}
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
                This will move it to Past and stop reminders.
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
                  Stop
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* ─── SNAP DRUG MODAL ──────────────────────────────────────── */}
      <AnimatePresence>
        {showSnapModal && (
          <SnapDrugModal
            onClose={() => setShowSnapModal(false)}
            onSnap={(name) => {
              setValue("name", name);
              setShowSnapModal(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
