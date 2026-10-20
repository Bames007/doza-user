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
  TrendingUp,
  Sunrise,
  Sun,
  Sunset,
  Moon,
  Check,
  BarChart3,
  Camera,
  Search,
  Building,
  Store,
  Play,
  Flame,
} from "lucide-react";
import { useForm, Controller } from "react-hook-form";
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
import { poppins } from "@/app/constants";
import { usePrescribedMedications } from "@/app/dashboard/hooks/usePrescribedMedications";
import { useUserContext } from "../../UserContext";
import Tesseract from "tesseract.js";
import DatePicker from "@/app/components/CustomDatePicker";

// ---------- Constants ----------
const DEFAULT_MAX_DOSES = 90;
const EMERALD = "#059669";

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2";

// Shared SWR config — no refetch on focus, warm cache, no skeleton flash
const SWR_PANEL_CONFIG = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 60_000,
  keepPreviousData: true,
  revalidateIfStale: false,
} as const;

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

// ---------- sessionStorage helpers ----------
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

// ---------- Helpers ----------
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
      <div className="bg-white p-3 rounded-xl shadow-lg border border-slate-200">
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

// ---------- Skeletons ----------
const SkeletonPulse = ({ className }: { className?: string }) => (
  <div className={cn("animate-pulse bg-slate-200 rounded-xl", className)} />
);

const SkeletonCard = () => (
  <div className="bg-white border border-slate-200 rounded-2xl p-5">
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
  <div className="bg-white border border-slate-200 rounded-2xl p-5">
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
  hero,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hero?: boolean;
}) => (
  <motion.div
    whileTap={{ scale: 0.995 }}
    transition={{ type: "spring", stiffness: 300, damping: 25 }}
    onClick={onClick}
    className={cn(
      "rounded-2xl border transition-all duration-300 h-full",
      hero
        ? "bg-emerald-600 text-white border-transparent shadow-lg"
        : "bg-white border-slate-200 shadow-sm md:hover:shadow-md",
      className,
    )}
  >
    {children}
  </motion.div>
);

const SectionHeader = ({
  icon: Icon,
  label,
  right,
  light,
}: {
  icon: any;
  label: string;
  right?: React.ReactNode;
  light?: boolean;
}) => (
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-2.5 min-w-0">
      <div
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
          light ? "bg-white/15" : "bg-emerald-50",
        )}
      >
        <Icon
          className={cn("w-4 h-4", light ? "text-white" : "text-emerald-700")}
        />
      </div>
      <h3
        className={cn(
          "text-xs font-bold uppercase tracking-wider truncate",
          light ? "text-emerald-50" : "text-slate-500",
        )}
      >
        {label}
      </h3>
    </div>
    {right}
  </div>
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
    className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4"
    onClick={onClose}
  >
    <motion.div
      initial={{ y: "30%", scale: 0.98 }}
      animate={{ y: 0, scale: 1 }}
      exit={{ y: "30%", scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className="bg-white rounded-t-3xl sm:rounded-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-0"
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
    >
      <div className="sm:hidden flex justify-center pt-3" aria-hidden>
        <div className="w-10 h-1 rounded-full bg-slate-300" />
      </div>
      {(title || Icon) && (
        <div className="flex items-center justify-between gap-3 px-4 md:px-6 pt-4 md:pt-6 pb-2">
          <div className="flex items-center gap-3 min-w-0">
            {Icon && (
              <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 md:w-5 md:h-5 text-emerald-700" />
              </div>
            )}
            {title && (
              <h2 className="text-lg md:text-xl font-bold text-slate-900 truncate">
                {title}
              </h2>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={cn(
              "shrink-0 min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors",
              FOCUS,
            )}
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>
      )}
      <div className="p-4 md:p-6 pt-2">{children}</div>
    </motion.div>
  </motion.div>
);

const Input = ({ label, error, className, id, ...props }: any) => {
  const autoId =
    id || `input-${label?.toString().toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label
          htmlFor={autoId}
          className="block text-xs font-bold text-slate-600 uppercase tracking-wider"
        >
          {label}
        </label>
      )}
      <input
        id={autoId}
        {...props}
        className={cn(
          "w-full min-h-12 px-4 text-sm bg-slate-50 border rounded-xl transition-all outline-none placeholder:text-slate-500 text-slate-900 font-medium",
          error
            ? "border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
            : "border-slate-200 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20",
        )}
      />
      {error && <p className="text-xs text-rose-700 font-semibold">{error}</p>}
    </div>
  );
};

const Textarea = ({ label, error, className, ...props }: any) => (
  <div className={cn("space-y-1.5", className)}>
    {label && (
      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
        {label}
      </label>
    )}
    <textarea
      {...props}
      className={cn(
        "w-full px-4 py-3 text-sm bg-slate-50 border rounded-xl transition-all outline-none placeholder:text-slate-500 text-slate-900 font-medium resize-y min-h-[80px]",
        error
          ? "border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
          : "border-slate-200 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20",
      )}
    />
    {error && <p className="text-xs text-rose-700 font-semibold">{error}</p>}
  </div>
);

const SelectDropdown = ({
  value,
  onChange,
  options,
  label,
  error,
  placeholder = "Select…",
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  label?: string;
  error?: string;
  placeholder?: string;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="space-y-1.5" ref={ref}>
      {label && (
        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={cn(
            "w-full min-h-12 flex items-center justify-between gap-2 text-left",
            "bg-slate-50 border rounded-xl px-4 py-2.5",
            "text-sm font-semibold text-slate-900 transition-colors",
            error
              ? "border-rose-300"
              : "border-slate-200 hover:border-slate-300",
            open &&
              !error &&
              "bg-white border-emerald-600 ring-2 ring-emerald-600/20",
            "focus:outline-none focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20",
          )}
        >
          <span
            className={cn(
              "truncate",
              !selected && "text-slate-500 font-normal",
            )}
          >
            {selected?.label || placeholder}
          </span>
          <ChevronDown
            size={16}
            className={cn(
              "text-slate-500 transition-transform shrink-0",
              open && "rotate-180 text-emerald-700",
            )}
          />
        </button>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              role="listbox"
              className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-64 overflow-y-auto p-1.5 space-y-0.5"
            >
              {options.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={cn(
                      "w-full min-h-11 flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-left transition-colors",
                      isSelected
                        ? "bg-emerald-50 text-emerald-900"
                        : "text-slate-700 hover:bg-slate-50",
                      FOCUS,
                    )}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && (
                      <Check
                        size={16}
                        className="text-emerald-700 shrink-0"
                        strokeWidth={3}
                      />
                    )}
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {error && <p className="text-xs text-rose-700 font-semibold">{error}</p>}
    </div>
  );
};

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
  now,
}: {
  medication: ExtendedMedication;
  expanded: boolean;
  onToggleExpand: () => void;
  onLogDose: (doseId: string, taken: boolean, reaction?: string) => void;
  onReportReaction: (doseId: string) => void;
  onStop: () => void;
  isPast?: boolean;
  now: number;
}) => {
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
      whileTap={{ scale: 0.995 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={cn(
        "bg-white rounded-2xl border overflow-hidden transition-shadow duration-300",
        isPast ? "border-slate-200 opacity-60" : "border-slate-200 shadow-sm",
      )}
    >
      <div className="h-1 w-full bg-emerald-600" />

      <div className="p-4 md:p-5">
        <div className="flex items-start justify-between gap-2">
          <div
            className="flex-1 cursor-pointer min-w-0"
            onClick={onToggleExpand}
          >
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                <Pill className="w-4 h-4 text-emerald-700" />
              </div>
              <h3 className="font-semibold text-slate-900 text-base md:text-lg truncate">
                {medication.name}
              </h3>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-100">
                {medication.dosage}
              </span>
              {isPrescribed && medication.sourceType && (
                <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 border border-slate-200">
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
                <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-medium border border-slate-200">
                  {medication.ailment}
                </span>
              )}
            </div>

            {isPrescribed && (
              <p className="text-xs text-slate-600 ml-10 mb-1">
                from{" "}
                <span className="font-medium text-slate-800">
                  {medication.centerName}
                </span>
                {medication.prescribedBy && ` · by ${medication.prescribedBy}`}
              </p>
            )}

            <div className="flex items-center gap-2 mt-1.5 ml-10">
              {isOngoing ? (
                <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
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
            <div className="ml-10 mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
              <span className="text-xs text-slate-500">
                Start: {new Date(medication.startDate).toLocaleDateString()}
              </span>
              {medication.endDate && (
                <span className="text-xs text-slate-500">
                  Finished: {new Date(medication.endDate).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={onToggleExpand}
            className={cn(
              "min-h-10 min-w-10 inline-flex items-center justify-center hover:bg-slate-50 rounded-xl transition-colors shrink-0",
              FOCUS,
            )}
            aria-label={expanded ? "Collapse" : "Expand"}
            aria-expanded={expanded}
          >
            <motion.div
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-4 h-4 md:w-5 md:h-5 text-slate-500" />
            </motion.div>
          </button>
        </div>

        <div className="mt-4 space-y-3">
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
                className="h-full rounded-full bg-emerald-600"
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

        {!isPast && nextDose && (
          <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-slate-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-600">
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
                  "text-xs font-bold px-2 py-1 rounded-lg shrink-0",
                  isNextDoseDue
                    ? "text-rose-700 bg-rose-100"
                    : nextDoseCountdown.includes("h")
                      ? "text-slate-600 bg-slate-100"
                      : "text-amber-700 bg-amber-100",
                )}
              >
                {nextDoseCountdown}
              </span>
            </div>
            {isNextDoseDue ? (
              <div className="flex gap-2">
                <button
                  onClick={() => onLogDose(nextDose.id, true, "")}
                  className={cn(
                    "inline-flex items-center gap-1 min-h-10 px-3 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 shadow-sm transition-colors",
                    FOCUS,
                  )}
                >
                  <Check className="w-3 h-3" />
                  Take
                </button>
                <button
                  onClick={() => onReportReaction(nextDose.id)}
                  className={cn(
                    "inline-flex items-center gap-1 min-h-10 px-3 bg-amber-50 text-amber-700 text-xs font-bold rounded-lg hover:bg-amber-100 border border-amber-200 transition-colors",
                    FOCUS,
                  )}
                >
                  <AlertCircle className="w-3 h-3" />
                  Issue
                </button>
              </div>
            ) : (
              <span className="text-xs font-medium text-slate-500">
                Upcoming
              </span>
            )}
          </div>
        )}
        {!isPast && !nextDose && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
            <p className="text-xs font-medium text-emerald-800">
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
              className="mt-4 space-y-4 overflow-hidden"
            >
              <div>
                <h4 className="text-xs font-bold text-slate-600 mb-2.5 flex items-center gap-1.5 uppercase tracking-wider">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
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
                          "aspect-square rounded-lg flex flex-col items-center justify-center text-xs p-0.5 transition-all",
                          tt > 0
                            ? tk === tt
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : tk > 0
                                ? "bg-amber-50 text-amber-800 border border-amber-200"
                                : "bg-slate-50 text-slate-600 border border-slate-100"
                            : "bg-slate-50 text-slate-400 border border-slate-100",
                        )}
                      >
                        <span className="text-[10px] font-medium opacity-70">
                          {dayName}
                        </span>
                        <span className="font-bold text-xs">{dayNum}</span>
                        {tt > 0 && (
                          <span className="text-[10px] font-semibold">
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
                  className={cn(
                    "w-full min-h-11 inline-flex items-center justify-center gap-2 text-sm bg-slate-50 text-slate-700 rounded-xl hover:bg-rose-50 hover:text-rose-700 transition-all font-semibold border border-slate-200 hover:border-rose-200",
                    FOCUS,
                  )}
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
      transition={{ delay: index * 0.05 }}
      className={cn(
        "flex items-center gap-2.5 p-3 rounded-xl border transition-all",
        isDue
          ? "bg-rose-50 border-rose-200"
          : isSoon
            ? "bg-amber-50 border-amber-200"
            : "bg-slate-50 border-slate-200",
      )}
    >
      <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
        <TimeIcon className="w-4 h-4 text-emerald-700" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900 truncate">
          {dose.medicationName}
        </p>
        <p className="text-xs text-slate-600 truncate">
          {doseTime.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}{" "}
          · {dose.dosage} · {dose.assignedToName}
        </p>
      </div>
      <span
        className={cn(
          "text-xs font-bold px-2 py-1 rounded-lg shrink-0",
          isDue
            ? "text-rose-700 bg-rose-100"
            : isSoon
              ? "text-amber-700 bg-amber-100"
              : "text-slate-600 bg-slate-100",
        )}
      >
        {countdown}
      </span>
    </motion.div>
  );
};

// ---------- Snap Drug Modal ----------
const SnapDrugModal = ({ onClose, onSnap }: any) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"camera" | "result">("camera");

  useEffect(() => {
    if (step !== "camera") return;
    let mounted = true;
    let localStream: MediaStream | null = null;

    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })
      .then((mediaStream) => {
        if (!mounted) {
          mediaStream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStream = mediaStream;
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          const playPromise = videoRef.current.play();
          if (playPromise !== undefined) {
            playPromise.catch((err) => {
              if (err?.name !== "AbortError") {
                console.warn("Video play failed:", err);
              }
            });
          }
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(
            "Cannot access camera. Please allow camera access and try again.",
          );
        }
        console.error("Camera error:", err);
      });

    return () => {
      mounted = false;
      if (localStream) localStream.getTracks().forEach((t) => t.stop());
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        try {
          videoRef.current.pause();
        } catch {}
      }
    };
  }, [step]);

  const capture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;

    if (
      video.videoWidth === 0 ||
      video.videoHeight === 0 ||
      video.readyState < 2
    ) {
      setError("Camera is still starting. Please wait a moment and try again.");
      return;
    }

    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setError("Could not capture image.");
      return;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setCapturedImage(dataUrl);
    setError(null);
    setStep("result");
    runOCR(dataUrl);
  };

  const runOCR = async (imageData: string) => {
    setIsProcessing(true);
    setError(null);
    try {
      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Invalid image data"));
        img.src = imageData;
      });

      const {
        data: { text },
      } = await Tesseract.recognize(imageData, "eng");
      const cleaned = text.trim().split("\n")[0]?.trim() || "";
      setExtractedText(cleaned);
      if (!cleaned) {
        setError(
          "No text detected. Retake in better lighting or type the name manually.",
        );
      }
    } catch (err) {
      console.error("OCR error:", err);
      setError(
        "Could not read text from this image. Please type the medication name manually.",
      );
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
      setError("No text found. Please type a name or retake.");
    }
  };

  const retake = () => {
    setStep("camera");
    setCapturedImage(null);
    setExtractedText("");
    setError(null);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-[100] sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl max-h-[92vh] overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-0">
        <div className="sm:hidden flex justify-center pt-3" aria-hidden>
          <div className="w-10 h-1 rounded-full bg-slate-300" />
        </div>
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h3 className="text-base md:text-lg font-bold text-slate-900">
            Snap Drug
          </h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className={cn(
              "min-h-10 min-w-10 inline-flex items-center justify-center hover:bg-slate-100 rounded-xl text-slate-600 transition-colors",
              FOCUS,
            )}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4">
          {error && (
            <div
              role="alert"
              className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs font-medium mb-3 flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {step === "camera" && (
            <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
                autoPlay
              />
              <canvas ref={canvasRef} className="hidden" />
              <button
                onClick={capture}
                aria-label="Capture photo"
                className={cn(
                  "absolute bottom-4 left-1/2 -translate-x-1/2 bg-white rounded-full p-3.5 shadow-lg hover:scale-105 active:scale-95 transition-transform",
                  FOCUS,
                )}
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
                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
                  Extracted name
                </label>
                <Textarea
                  value={extractedText}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                    setExtractedText(e.target.value)
                  }
                  placeholder="OCR result will appear here…"
                  className="min-h-[80px]"
                />
                {isProcessing && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-slate-600 font-medium">
                    <Loader2 className="w-4 h-4 animate-spin" /> Reading image…
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={retake}
                  className={cn(
                    "flex-1 min-h-12 bg-slate-100 text-slate-800 rounded-xl font-semibold hover:bg-slate-200 transition",
                    FOCUS,
                  )}
                >
                  Retake
                </button>
                <button
                  onClick={handleUseName}
                  disabled={!extractedText.trim() || isProcessing}
                  className={cn(
                    "flex-1 min-h-12 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed",
                    FOCUS,
                  )}
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

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Persisted: selected family member
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>(() => {
    return ssGet("med:selectedFamilyId") || "self";
  });
  useEffect(() => {
    ssSet("med:selectedFamilyId", selectedFamilyId);
  }, [selectedFamilyId]);

  // Persisted: active tab
  const [activeTab, setActiveTab] = useState<"active" | "past">(() => {
    const v = ssGet("med:activeTab");
    return v === "past" ? "past" : "active";
  });
  useEffect(() => {
    ssSet("med:activeTab", activeTab);
  }, [activeTab]);

  // Persisted: expanded medication
  const [expandedMedId, setExpandedMedId] = useState<string | null>(() =>
    ssGet("med:expandedMedId"),
  );
  useEffect(() => {
    if (expandedMedId) ssSet("med:expandedMedId", expandedMedId);
    else ssRemove("med:expandedMedId");
  }, [expandedMedId]);

  // Ephemeral state
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([
    { id: "self", name: "Myself", relationship: "self" },
  ]);
  const [showAddMedModal, setShowAddMedModal] = useState(false);
  const [showAddFamilyModal, setShowAddFamilyModal] = useState(false);
  const [showReactionModal, setShowReactionModal] = useState<{
    medicationId: string;
    doseId: string;
  } | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [helpSlide, setHelpSlide] = useState(0);
  const [stopConfirm, setStopConfirm] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    { name: string; dosage?: string; ailment?: string }[]
  >([]);
  const [searching, setSearching] = useState(false);
  const [showSnapModal, setShowSnapModal] = useState(false);

  // Scroll restoration — always scroll (to saved or 0) so panel
  // never inherits the previous panel's scroll position
  const scrollerRef = useRef<HTMLElement | null>(null);
  const scrollRestoredRef = useRef(false);
  useEffect(() => {
    const el =
      (document.getElementById("dashboard-scroll") as HTMLElement | null) ||
      (document.querySelector("main") as HTMLElement | null);
    scrollerRef.current = el;
    if (!el) return;

    if (!scrollRestoredRef.current) {
      const saved = ssGet("med:scroll");
      el.scrollTo({ top: saved ? Number(saved) : 0, behavior: "instant" });
      scrollRestoredRef.current = true;
    }

    const onScroll = () => ssSet("med:scroll", String(el.scrollTop));
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!localStorage.getItem("doza_medication_help_v2")) {
      setShowHelp(true);
      localStorage.setItem("doza_medication_help_v2", "true");
    }
  }, []);

  // ─── Family fetch (with SWR config) ─────────────────────────
  const { data: familyData, mutate: mutateFamily } = useSWR(
    "/api/family",
    authFetcher,
    SWR_PANEL_CONFIG,
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

  // ─── Medications fetch (with SWR config) ───────────────────
  const { data, error, isLoading } = useSWR(
    `/api/medications?memberId=${selectedFamilyId}`,
    authFetcher,
    SWR_PANEL_CONFIG,
  );
  const selfMedications: Medication[] = data?.success ? data.data : [];

  const { prescriptions: prescribedMeds, loading: prescribedLoading } =
    usePrescribedMedications();

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

  const allExtended = useMemo<ExtendedMedication[]>(() => {
    const selfExtended = selfMedications.map((m) => ({
      ...m,
      source: "self" as const,
      status: m.status as "active" | "completed" | "paused" | "pending",
      prescriptionId: medicationMeta[m.id]?.prescriptionId,
      centerId: medicationMeta[m.id]?.centerId,
      sourceType: medicationMeta[m.id]?.sourceType,
    }));

    const startedIds = new Set(
      Object.values(medicationMeta).map((v) => v.prescriptionId),
    );
    const unstarted = prescribedMeds.filter((p) => !startedIds.has(p.id));

    const prescribedExtended = unstarted.map((p) => ({
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
      prescriptionId: p.id,
    }));

    return [...selfExtended, ...prescribedExtended];
  }, [selfMedications, prescribedMeds, medicationMeta]);

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
    for (const [, items] of centerMap) {
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
    for (const [, items] of centerMap) {
      const centerName = items[0]?.centerName || "Unknown Center";
      groups.push({ label: centerName, items });
    }
    return groups;
  }, [pastMeds]);

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

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<MedicationForm>({
    resolver: zodResolver(medicationSchema) as any,
    defaultValues: {
      frequency: "once",
      assignedTo: selectedFamilyId,
      quantityPerDose: 1,
      totalQuantity: 0,
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
    let totalQty = formData.totalQuantity || 0;
    let durationDays = formData.durationDays;

    if (durationDays && totalQty === 0) {
      const intakesPerDay = getIntakesPerDay(formData.frequency);
      totalQty = deriveTotalQuantity(
        durationDays,
        formData.quantityPerDose,
        intakesPerDay,
      );
    }

    if (totalQty > 0 && !durationDays) {
      const intakesPerDay = getIntakesPerDay(formData.frequency);
      durationDays = deriveDuration(
        totalQty,
        formData.quantityPerDose,
        intakesPerDay,
      );
    }

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
        if (!newId) return;
        const newMeta = {
          ...medicationMeta,
          [newId]: {
            prescriptionId: prescribed.prescriptionId!,
            centerId: prescribed.centerId!,
            sourceType: prescribed.sourceType,
          },
        };
        setMedicationMeta(newMeta);
        mutate(`/api/medications?memberId=${selectedFamilyId}`);
        alert("Medication started. Your doses are now scheduled.");
      } else {
        alert("Error: " + result.error);
      }
    } catch (err: any) {
      alert("Failed to start medication: " + (err.message || "Unknown error"));
    }
  };

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
    } catch {
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
        { credentials: "include" },
      );
      if (!getRes.ok) return;
      const patientData = await getRes.json();
      if (!patientData.success) return;

      let existingAdmins = patientData.data?.medicationAdministrations || [];
      if (!Array.isArray(existingAdmins)) {
        existingAdmins = Object.values(existingAdmins);
      }

      await fetch(`/api/centers/${centerId}/patients/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          medicationAdministrations: [...existingAdmins, administration],
        }),
      });
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
        alert("Notifications enabled.");
      } else alert("Permission denied.");
    } catch {
      alert("Failed to enable notifications.");
    }
  };

  const helpSlides = [
    {
      icon: <Users className="w-8 h-8 text-emerald-700" />,
      title: "Add Family",
      description:
        "Tap + next to 'Managing for' to add dependents and track their medications.",
    },
    {
      icon: <Pill className="w-8 h-8 text-emerald-700" />,
      title: "Add Medications",
      description:
        "Enter dosage, stock & frequency. We'll auto-calculate your schedule.",
    },
    {
      icon: <CheckCircle className="w-8 h-8 text-emerald-700" />,
      title: "Log Doses",
      description:
        "Expand a card & mark doses as taken. Report any reactions instantly.",
    },
    {
      icon: <Bell className="w-8 h-8 text-emerald-700" />,
      title: "Smart Reminders",
      description: "Enable push notifications to never miss a dose again.",
    },
  ];

  if (error)
    return (
      <div className="p-6 text-rose-700 text-center bg-white rounded-2xl border shadow-sm">
        Error loading medications.
      </div>
    );

  // Cold start = loading AND no data. Warm cache = no skeleton.
  const isLoadingCombined = isLoading || prescribedLoading;
  const isColdStart = isLoadingCombined && allExtended.length === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "min-h-screen bg-slate-50 pb-24 pt-2 md:pt-6",
        poppins.className,
      )}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6 space-y-5 md:space-y-7">
        {/* ─── HEADER ──────────────────────────────────────────── */}
        <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-2 md:mb-4">
          <div className="min-w-0">
            <h1 className="text-3xl sm:text-4xl md:text-5xl text-slate-900 leading-[1.1] tracking-tight font-bold">
              Medication <span className="text-emerald-600">Tracker</span>
            </h1>
            <p className="text-sm text-slate-600 mt-1.5">
              {streak > 0 ? (
                <span className="inline-flex items-center gap-1.5 flex-wrap">
                  <Flame className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="font-semibold text-amber-700">
                    {streak}-day streak
                  </span>
                  <span className="text-slate-400">·</span>
                  <span>Keep it up</span>
                </span>
              ) : (
                "Stay on top of your daily doses."
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={requestNotificationPermission}
              className={cn(
                "inline-flex items-center gap-2 min-h-12 px-4 bg-white text-slate-800 border border-slate-200 rounded-xl font-semibold hover:bg-slate-50 transition shadow-sm",
                FOCUS,
              )}
            >
              <Bell size={16} />
              <span className="hidden sm:inline">Reminders</span>
            </button>
            <button
              onClick={() => setShowAddMedModal(true)}
              className={cn(
                "inline-flex items-center gap-2 min-h-12 px-4 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition shadow-sm",
                FOCUS,
              )}
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Add Med</span>
            </button>
          </div>
        </header>

        {/* ─── STATS ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {isColdStart ? (
            <>
              <SkeletonStatCard />
              <SkeletonStatCard />
              <SkeletonStatCard />
              <SkeletonStatCard />
            </>
          ) : (
            <>
              <BentoTile className="p-5">
                <SectionHeader
                  icon={Users}
                  label="Managing For"
                  right={
                    <button
                      onClick={() => setShowAddFamilyModal(true)}
                      aria-label="Add family member"
                      className={cn(
                        "min-h-9 min-w-9 inline-flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors shrink-0",
                        FOCUS,
                      )}
                    >
                      <UserPlus size={16} className="text-slate-500" />
                    </button>
                  }
                />
                <div className="flex flex-wrap gap-1.5">
                  {familyMembers.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedFamilyId(m.id)}
                      className={cn(
                        "min-w-[64px] px-2.5 py-2 rounded-xl text-xs font-semibold transition-all",
                        selectedFamilyId === m.id
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "bg-slate-50 text-slate-700 hover:bg-slate-100",
                      )}
                    >
                      <div className="truncate">{m.name}</div>
                      {m.relationship !== "self" && (
                        <div
                          className={cn(
                            "text-[10px] font-medium",
                            selectedFamilyId === m.id
                              ? "text-emerald-100"
                              : "text-slate-500",
                          )}
                        >
                          {m.relationship}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </BentoTile>

              <BentoTile hero className="p-5">
                <SectionHeader icon={Calendar} label="Today's Doses" light />
                <div className="flex items-baseline gap-1.5 mb-1">
                  <span className="text-4xl font-bold text-white leading-none">
                    {todayDosesRemaining}
                  </span>
                  <span className="text-base text-emerald-100 font-medium">
                    / {todayDosesTotal}
                  </span>
                </div>
                <p className="text-xs text-emerald-100">
                  {todayDosesRemaining === 0
                    ? "All done for today"
                    : "remaining today"}
                </p>
                <div className="mt-3 w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${
                        todayDosesTotal > 0
                          ? ((todayDosesTotal - todayDosesRemaining) /
                              todayDosesTotal) *
                            100
                          : 0
                      }%`,
                    }}
                    className="h-full bg-white rounded-full"
                  />
                </div>
              </BentoTile>

              <BentoTile className="p-5">
                <SectionHeader icon={Clock} label="Next Dose" />
                {nextDose ? (
                  <>
                    <p className="text-sm font-semibold text-slate-900 truncate mb-1">
                      {nextDose.medicationName}
                    </p>
                    <p className="text-3xl font-bold text-slate-900 leading-none mb-1">
                      {timeRemaining}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(nextDose.scheduledTime).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      · {nextDose.assignedToName}
                    </p>
                  </>
                ) : (
                  <div className="flex items-center gap-2 py-6">
                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span className="text-sm font-medium text-slate-700">
                      All done for now
                    </span>
                  </div>
                )}
              </BentoTile>

              <BentoTile className="p-5">
                <SectionHeader icon={TrendingUp} label="Adherence" />
                <div className="flex items-baseline gap-2 flex-wrap mb-1">
                  <span className="text-3xl font-bold text-slate-900 leading-none">
                    {adherenceScore}%
                  </span>
                  <span
                    className={cn(
                      "text-xs font-bold px-2 py-0.5 rounded-md",
                      adherenceScore >= 90
                        ? "bg-emerald-50 text-emerald-700"
                        : adherenceScore >= 70
                          ? "bg-amber-50 text-amber-700"
                          : "bg-rose-50 text-rose-700",
                    )}
                  >
                    {adherenceScore >= 90
                      ? "Excellent"
                      : adherenceScore >= 70
                        ? "Good"
                        : "Needs work"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {adherenceScore >= 90
                    ? "Outstanding consistency"
                    : adherenceScore >= 70
                      ? "You're doing well"
                      : "Let's get back on track"}
                </p>
              </BentoTile>
            </>
          )}
        </div>

        {/* ─── UPCOMING + CHART ────────────────────────────── */}
        {!isColdStart && allExtended.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">
            <BentoTile className="lg:col-span-1 p-5">
              <SectionHeader
                icon={Clock}
                label="Upcoming"
                right={
                  <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg shrink-0">
                    {upcomingDoses.length} doses
                  </span>
                }
              />
              <div className="space-y-2">
                {upcomingDoses.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                    <p className="text-sm font-medium text-slate-600">
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

            <BentoTile className="lg:col-span-2 p-5">
              <SectionHeader
                icon={BarChart3}
                label="Adherence (14 Days)"
                right={
                  <div className="flex gap-3 shrink-0">
                    <div className="flex items-center gap-1 text-xs text-slate-600">
                      <div className="w-2 h-2 rounded-full bg-emerald-600" />{" "}
                      Taken
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-600">
                      <div className="w-2 h-2 rounded-full bg-slate-300" />{" "}
                      Scheduled
                    </div>
                  </div>
                }
              />
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
                          stopColor={EMERALD}
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor={EMERALD}
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
                      tick={{
                        fontSize: 11,
                        fill: "#64748b",
                        fontFamily: "Poppins",
                      }}
                      axisLine={{ stroke: "#cbd5e1" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{
                        fontSize: 11,
                        fill: "#64748b",
                        fontFamily: "Poppins",
                      }}
                      axisLine={false}
                      tickLine={false}
                      width={30}
                      allowDecimals={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="taken"
                      stroke={EMERALD}
                      strokeWidth={2.5}
                      fill="url(#takenGradient)"
                      dot={{
                        r: 3,
                        fill: "white",
                        stroke: EMERALD,
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

        {/* ─── MEDICATION LIST ──────────────────────────────── */}
        {isColdStart ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
            {[...Array(4)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : allExtended.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 md:p-12 text-center border border-slate-200 shadow-sm">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <Pill className="w-8 h-8 md:w-10 md:h-10 text-emerald-700" />
            </div>
            <p className="text-lg md:text-xl font-semibold text-slate-800 mb-2">
              No medications yet
            </p>
            <p className="text-sm text-slate-600 mb-6 max-w-md mx-auto">
              Add your first medication to start tracking, or visit a linked
              center to get a prescription.
            </p>
            <button
              onClick={() => setShowAddMedModal(true)}
              className={cn(
                "inline-flex items-center gap-2 min-h-12 px-6 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 transition shadow-md",
                FOCUS,
              )}
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
                  "min-h-10 px-4 rounded-xl text-xs font-semibold transition-all",
                  activeTab === "active"
                    ? "bg-emerald-600 text-white"
                    : "text-slate-600 hover:text-slate-800",
                )}
              >
                Active ({activeMeds.length})
              </button>
              <button
                onClick={() => setActiveTab("past")}
                className={cn(
                  "min-h-10 px-4 rounded-xl text-xs font-semibold transition-all",
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
                          <Pill className="w-4 h-4 text-emerald-700" />
                        ) : (
                          <Building className="w-4 h-4 text-emerald-700" />
                        )}
                        {group.label}
                        <span className="text-xs font-normal text-slate-500">
                          ({group.items.length})
                        </span>
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                        {group.items.map((med) => (
                          <MedicationCard
                            key={med.id}
                            medication={med}
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
                          <Pill className="w-4 h-4 text-emerald-700" />
                        ) : (
                          <Building className="w-4 h-4 text-emerald-700" />
                        )}
                        {group.label}
                        <span className="text-xs font-normal text-slate-500">
                          ({group.items.length})
                        </span>
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                        {group.items.map((med) => (
                          <MedicationCard
                            key={med.id}
                            medication={med}
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

            {unstartedMeds.length > 0 && activeTab === "active" && (
              <div className="mt-8 border-t border-slate-200 pt-6">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                    <Building className="w-4 h-4 text-emerald-700" />
                  </div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Prescriptions from Centers
                  </h3>
                  <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                    {unstartedMeds.length} pending
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                  {unstartedMeds.map((p) => (
                    <div
                      key={p.id}
                      className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm"
                    >
                      <div className="h-1 w-full bg-emerald-600" />
                      <div className="p-5">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                            <Pill className="w-5 h-5 text-emerald-700" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h4 className="font-semibold text-slate-900 text-base truncate">
                                {p.name}
                              </h4>
                              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 shrink-0">
                                {p.sourceType === "hospital"
                                  ? "Hospital"
                                  : "External"}
                              </span>
                            </div>
                            <p className="text-sm text-slate-600 font-medium">
                              {p.dosage} · {p.frequency}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5 truncate">
                              From {p.centerName}
                              {p.prescribedBy && ` · ${p.prescribedBy}`}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap mb-4">
                          <span className="inline-flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md text-xs text-slate-700 font-medium">
                            <Pill className="w-3 h-3 text-slate-500" />
                            {p.totalQuantity || "Ongoing"} doses
                          </span>
                          {p.durationDays && (
                            <span className="inline-flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md text-xs text-slate-700 font-medium">
                              <Calendar className="w-3 h-3 text-slate-500" />
                              {p.durationDays} days
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => startPrescribedMedication(p)}
                          className={cn(
                            "w-full min-h-11 inline-flex items-center justify-center gap-2 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-colors shadow-sm",
                            FOCUS,
                          )}
                        >
                          <Play className="w-4 h-4" />
                          Start this medication
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

      {/* HELP MODAL */}
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
                  <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
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
                    aria-label={`Go to slide ${i + 1}`}
                    className={cn(
                      "h-2 rounded-full transition-all",
                      i === helpSlide
                        ? "bg-emerald-600 w-4"
                        : "bg-slate-300 w-2",
                    )}
                  />
                ))}
              </div>
              <button
                onClick={() =>
                  setHelpSlide((p) => (p === 0 ? helpSlides.length - 1 : p - 1))
                }
                aria-label="Previous slide"
                className={cn(
                  "absolute left-0 top-1/2 -translate-y-1/2 min-h-10 min-w-10 inline-flex items-center justify-center bg-white rounded-full shadow-md border border-slate-200",
                  FOCUS,
                )}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() =>
                  setHelpSlide((p) => (p === helpSlides.length - 1 ? 0 : p + 1))
                }
                aria-label="Next slide"
                className={cn(
                  "absolute right-0 top-1/2 -translate-y-1/2 min-h-10 min-w-10 inline-flex items-center justify-center bg-white rounded-full shadow-md border border-slate-200",
                  FOCUS,
                )}
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <button
              onClick={() => setShowHelp(false)}
              className={cn(
                "mt-6 w-full min-h-12 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition",
                FOCUS,
              )}
            >
              Got it
            </button>
          </Modal>
        )}
      </AnimatePresence>

      {/* ADD MED MODAL */}
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
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search for drug…"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      handleDrugSearch(e.target.value);
                    }}
                    className={cn(
                      "w-full min-h-12 pl-9 pr-4 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 text-slate-900 placeholder:text-slate-500",
                      FOCUS,
                    )}
                  />
                  {searching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-emerald-600" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowSnapModal(true)}
                  className={cn(
                    "inline-flex items-center gap-1.5 min-h-12 px-4 bg-slate-800 text-white rounded-xl text-sm font-semibold hover:bg-slate-700 transition-colors",
                    FOCUS,
                  )}
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
                      className="w-full text-left px-4 py-2.5 hover:bg-slate-100 transition-colors flex justify-between items-start gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {drug.name}
                        </p>
                        {drug.dosage && (
                          <span className="text-xs text-slate-600">
                            {drug.dosage}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-emerald-700 font-semibold shrink-0">
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
                  inputMode="decimal"
                  {...register("quantityPerDose")}
                  label="Qty per dose *"
                  error={errors.quantityPerDose?.message}
                />
                <Input
                  type="number"
                  inputMode="numeric"
                  {...register("totalQuantity")}
                  label="Total quantity (0 = ongoing)"
                  error={errors.totalQuantity?.message}
                />
                <Input
                  type="number"
                  step="1"
                  inputMode="numeric"
                  {...register("durationDays")}
                  label="Duration (days) — optional"
                  placeholder="e.g., 7"
                  error={errors.durationDays?.message}
                />
                <div className="text-xs text-slate-500 -mt-2 col-span-2">
                  * Leave both blank for "ongoing" (no fixed end date)
                </div>
                <Input
                  {...register("ailment")}
                  label="Ailment"
                  placeholder="Infection"
                />

                <Controller
                  control={control}
                  name="frequency"
                  render={({ field }) => (
                    <SelectDropdown
                      label="Frequency *"
                      value={field.value}
                      onChange={(v) =>
                        field.onChange(v as MedicationForm["frequency"])
                      }
                      options={[
                        { value: "once", label: "Once daily" },
                        { value: "twice", label: "Twice daily" },
                        { value: "thrice", label: "Thrice daily" },
                        { value: "custom", label: "Custom" },
                      ]}
                      error={errors.frequency?.message}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="assignedTo"
                  render={({ field }) => (
                    <SelectDropdown
                      label="Assigned to *"
                      value={field.value}
                      onChange={field.onChange}
                      options={familyMembers.map((m) => ({
                        value: m.id,
                        label:
                          m.relationship !== "self"
                            ? `${m.name} (${m.relationship})`
                            : m.name,
                      }))}
                      error={errors.assignedTo?.message}
                    />
                  )}
                />

                {frequency === "custom" && (
                  <Input
                    {...register("times")}
                    label="Times (comma separated) *"
                    placeholder="08:00, 14:00, 20:00"
                    error={errors.times?.message}
                    className="sm:col-span-2"
                  />
                )}

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Start Date *
                  </label>
                  <Controller
                    control={control}
                    name="startDate"
                    render={({ field }) => (
                      <DatePicker
                        value={field.value ?? ""}
                        onChange={(iso: string) => field.onChange(iso)}
                        placeholder="Select start date"
                        maxDate={new Date()}
                      />
                    )}
                  />
                  {errors.startDate?.message && (
                    <p className="text-xs text-rose-700 font-semibold">
                      {errors.startDate.message}
                    </p>
                  )}
                </div>

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
                  className={cn(
                    "min-h-11 px-5 text-sm bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-semibold",
                    FOCUS,
                  )}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={cn(
                    "inline-flex items-center gap-2 min-h-11 px-5 text-sm bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 shadow-sm font-semibold",
                    FOCUS,
                  )}
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save
                </button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>

      {/* ADD FAMILY MODAL */}
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
                  className={cn(
                    "min-h-11 px-5 text-sm bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-semibold",
                    FOCUS,
                  )}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={familyForm.formState.isSubmitting}
                  className={cn(
                    "inline-flex items-center gap-2 min-h-11 px-5 text-sm bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 shadow-sm font-semibold",
                    FOCUS,
                  )}
                >
                  {familyForm.formState.isSubmitting && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  Add
                </button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>

      {/* REACTION MODAL */}
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
              <Textarea
                {...reactionForm.register("reaction")}
                label="How did you feel? *"
                placeholder="Describe any side effects…"
                className="min-h-[80px]"
                error={reactionForm.formState.errors.reaction?.message}
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowReactionModal(null)}
                  className={cn(
                    "min-h-11 px-5 text-sm bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-semibold",
                    FOCUS,
                  )}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reactionForm.formState.isSubmitting}
                  className={cn(
                    "inline-flex items-center gap-2 min-h-11 px-5 text-sm bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 shadow-sm font-semibold",
                    FOCUS,
                  )}
                >
                  {reactionForm.formState.isSubmitting && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  Submit
                </button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>

      {/* STOP CONFIRM */}
      <AnimatePresence>
        {stopConfirm && (
          <Modal
            onClose={() => setStopConfirm(null)}
            title="Stop Medication?"
            icon={StopCircle}
          >
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
                <StopCircle className="w-8 h-8 text-amber-700" />
              </div>
              <p className="text-sm text-slate-600">
                This will mark it as finished and move it to Past.
              </p>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={() => setStopConfirm(null)}
                  className={cn(
                    "min-h-11 px-5 text-sm bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-semibold",
                    FOCUS,
                  )}
                >
                  Cancel
                </button>
                <button
                  onClick={() => stopConfirm && stopMedication(stopConfirm)}
                  className={cn(
                    "min-h-11 px-5 text-sm bg-amber-600 text-white rounded-xl hover:bg-amber-700 shadow-sm font-semibold",
                    FOCUS,
                  )}
                >
                  Finish
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* SNAP MODAL */}
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
    </motion.div>
  );
}
