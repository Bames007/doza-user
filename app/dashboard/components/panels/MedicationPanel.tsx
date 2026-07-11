"use client";

import { useState, useEffect, useMemo } from "react";
import useSWR, { mutate } from "swr";
import { motion, AnimatePresence, Transition } from "framer-motion";
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
  BarChart3,
  ChevronLeft,
  ChevronRight,
  StopCircle,
  Activity,
  TrendingUp,
  Shield,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/app/utils/utils";
import { authFetcher, authPost, authPut } from "@/app/utils/client-auth";
import { useProfile } from "@/app/dashboard/hooks/useUserData";
import { poppins, bebasNeue } from "@/app/constants";

// ---------- Spring transition ----------
const spring: Transition = { type: "spring", stiffness: 200, damping: 20 };

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
};
type UpcomingDose = {
  medicationId: string;
  medicationName: string;
  scheduledTime: string;
  dosage: string;
  assignedToName: string;
};

// ---------- Schemas ----------
const medicationSchema = z
  .object({
    name: z.string().min(1),
    dosage: z.string().min(1),
    quantityPerDose: z.coerce.number().min(0.1),
    totalQuantity: z.coerce.number().min(1),
    ailment: z.string().optional(),
    frequency: z.enum(["once", "twice", "thrice", "custom"]),
    times: z.string().optional(),
    instructions: z.string().optional(),
    startDate: z.string().min(1),
    assignedTo: z.string().min(1),
  })
  .refine((d) => d.frequency !== "custom" || d.times, {
    message: "Times required",
    path: ["times"],
  });
type MedicationForm = z.infer<typeof medicationSchema>;

const reactionSchema = z.object({ reaction: z.string().min(1) });
type ReactionForm = z.infer<typeof reactionSchema>;

const familySchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  relationship: z.string().min(1),
});
type FamilyForm = z.infer<typeof familySchema>;

// ---------- Helpers ----------
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

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white/95 backdrop-blur-sm p-3 rounded-2xl shadow-xl border border-slate-100">
        <p className="text-xs font-semibold text-slate-800 mb-1">{label}</p>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-emerald-500 rounded-full" />
            <span className="text-xs text-slate-600">
              Taken: {payload[0].value}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-slate-400 rounded-full" />
            <span className="text-xs text-slate-600">
              Scheduled: {payload[1].value}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

// ---------- Skeleton Loaders ----------
function SkeletonCard() {
  return (
    <div className="bg-white border border-slate-100 rounded-[32px] p-6 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-3">
          <div className="flex gap-2">
            <div className="h-6 w-32 bg-slate-200 rounded-full" />
            <div className="h-4 w-16 bg-slate-100 rounded-full" />
          </div>
          <div className="h-3 w-40 bg-slate-100 rounded-lg" />
          <div className="space-y-2 mt-4">
            <div className="h-1.5 w-full bg-slate-100 rounded-full" />
            <div className="h-1.5 w-full bg-slate-100 rounded-full" />
          </div>
        </div>
        <div className="w-8 h-8 bg-slate-100 rounded-full" />
      </div>
    </div>
  );
}

function SkeletonStatCard() {
  return (
    <div className="bg-white border border-slate-100 rounded-[32px] p-7 animate-pulse">
      <div className="h-4 w-24 bg-slate-100 rounded-lg mb-4" />
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-10 w-full bg-slate-50 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

// ---------- Subcomponents ----------
const BentoTile = ({ children, className, onClick }: any) => (
  <motion.div
    whileHover={{ y: -4 }}
    transition={spring}
    onClick={onClick}
    className={cn(
      "p-7 rounded-[32px] border border-slate-100 transition-all bg-white",
      className,
    )}
  >
    {children}
  </motion.div>
);

const Modal = ({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) => (
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
      className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-100"
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </motion.div>
  </motion.div>
);

// ---------- Main Component ----------
export default function MedicationPanel() {
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

  useEffect(() => {
    if (!localStorage.getItem("doza_medication_help")) {
      setShowHelp(true);
      localStorage.setItem("doza_medication_help", "true");
    }
  }, []);

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

  const { data, error, isLoading } = useSWR(
    `/api/medications?memberId=${selectedFamilyId}`,
    authFetcher,
  );
  const medications: Medication[] = data?.success ? data.data : [];

  const { data: upcomingData } = useSWR(
    `/api/medications/upcoming?memberId=${selectedFamilyId}`,
    authFetcher,
  );
  const upcomingDoses: UpcomingDose[] = upcomingData?.success
    ? upcomingData.data
    : [];

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
        mutate(`/api/medications/upcoming?memberId=${selectedFamilyId}`);
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
        { taken, reaction },
      );
      if (result.success) {
        mutate(`/api/medications?memberId=${selectedFamilyId}`);
        mutate(`/api/medications/upcoming?memberId=${selectedFamilyId}`);
      } else alert("Error: " + (result.error || "Failed to log dose"));
    } catch {
      alert("An error occurred");
    }
  };

  const stopMedication = async (medicationId: string) => {
    try {
      const result = await authPut(`/api/medications/${medicationId}`, {
        status: "completed",
      });
      if (result.success) {
        mutate(`/api/medications?memberId=${selectedFamilyId}`);
        mutate(`/api/medications/upcoming?memberId=${selectedFamilyId}`);
        setStopConfirm(null);
      } else alert("Error: " + (result.error || "Failed to stop medication"));
    } catch {
      alert("An error occurred");
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

  const nextDose = upcomingDoses.length > 0 ? upcomingDoses[0] : null;
  const [timeRemaining, setTimeRemaining] = useState("");
  useEffect(() => {
    if (!nextDose) return;
    const interval = setInterval(() => {
      const diff = new Date(nextDose.scheduledTime).getTime() - Date.now();
      if (diff <= 0) {
        setTimeRemaining("Due now!");
        clearInterval(interval);
      } else {
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        setTimeRemaining(`${h}h ${m}m`);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [nextDose]);

  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }).reverse();
    return last7Days.map((day) => {
      const dayDoses = medications.flatMap((m) =>
        m.doses.filter((d) => d.scheduledTime.startsWith(day)),
      );
      return {
        date: new Date(day).toLocaleDateString(undefined, {
          month: "numeric",
          day: "numeric",
        }),
        taken: dayDoses.filter((d) => d.takenAt).length,
        total: dayDoses.length,
      };
    });
  }, [medications]);

  const helpSlides = [
    {
      icon: <UserPlus className="w-10 h-10 text-emerald-600" />,
      title: "Add Family",
      description: "Tap + next to 'Managing for' to add dependents.",
    },
    {
      icon: <Pill className="w-10 h-10 text-emerald-600" />,
      title: "Add Medications",
      description:
        "Enter dosage, stock & frequency. We calculate the schedule.",
    },
    {
      icon: <CheckCircle className="w-10 h-10 text-emerald-600" />,
      title: "Log Doses",
      description: "Expand a card & mark doses as taken. Report reactions too.",
    },
    {
      icon: <Bell className="w-10 h-10 text-emerald-600" />,
      title: "Reminders",
      description: "Tap the bell for push notifications before doses are due.",
    },
  ];

  if (error)
    return (
      <div className="p-6 text-red-600 text-center bg-white rounded-3xl border shadow-sm">
        Error loading medications.
      </div>
    );

  return (
    <div
      className={cn("min-h-screen bg-[#F8FAFC] pb-32 pt-6", poppins.className)}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6 space-y-8">
        {/* Header */}
        <header className="bg-white rounded-[32px] p-6 md:p-8 border border-slate-200/60 shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Activity size={14} className="text-emerald-500" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  Adherence Protocol
                </p>
              </div>
              <h1
                className={cn(
                  "text-4xl md:text-5xl text-slate-900 leading-none",
                  bebasNeue.className,
                )}
              >
                Medication <span className="text-emerald-500">Tracker</span>
              </h1>
            </div>
            <div className="flex gap-3">
              <button
                onClick={requestNotificationPermission}
                className="flex items-center gap-2 px-5 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all"
              >
                <Bell size={14} /> Reminders
              </button>
              <button
                onClick={() => setShowAddMedModal(true)}
                className="flex items-center gap-2 px-5 py-3 bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
              >
                <Plus size={14} /> Add Med
              </button>
            </div>
          </div>
        </header>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {isLoading ? (
            <>
              <SkeletonStatCard />
              <SkeletonStatCard />
              <SkeletonStatCard />
            </>
          ) : (
            <>
              <BentoTile>
                <div className="flex items-center justify-between mb-4">
                  <h3
                    className={cn(
                      "text-lg font-bold text-slate-900 flex items-center gap-2",
                      bebasNeue.className,
                    )}
                  >
                    <Users className="text-emerald-500" size={20} /> Managing
                    for
                  </h3>
                  <button
                    onClick={() => setShowAddFamilyModal(true)}
                    className="p-2 rounded-full hover:bg-slate-100"
                  >
                    <UserPlus size={16} className="text-slate-400" />
                  </button>
                </div>
                <div className="space-y-2">
                  {familyMembers.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedFamilyId(m.id)}
                      className={cn(
                        "w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition flex items-center justify-between",
                        selectedFamilyId === m.id
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                          : "text-slate-600 hover:bg-slate-50",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            selectedFamilyId === m.id
                              ? "bg-emerald-500"
                              : "bg-slate-300",
                          )}
                        />
                        {m.name}
                      </div>
                      {m.relationship !== "self" && (
                        <span className="text-[10px] text-slate-400">
                          {m.relationship}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </BentoTile>

              <BentoTile className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white border-none relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-20">
                  <Pill size={60} />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar size={16} className="text-emerald-100" />
                    <h3
                      className={cn(
                        "text-sm font-bold text-emerald-100",
                        bebasNeue.className,
                      )}
                    >
                      Today's Doses
                    </h3>
                  </div>
                  <p className="text-4xl font-black">{upcomingDoses.length}</p>
                  <p className="text-xs text-emerald-100 mt-1">remaining</p>
                </div>
              </BentoTile>

              <BentoTile className="bg-gradient-to-br from-blue-600 to-blue-700 text-white border-none relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-20">
                  <Clock size={60} />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock size={16} className="text-blue-100" />
                    <h3
                      className={cn(
                        "text-sm font-bold text-blue-100",
                        bebasNeue.className,
                      )}
                    >
                      Next Dose
                    </h3>
                  </div>
                  {nextDose ? (
                    <>
                      <p className="text-sm font-semibold truncate">
                        {nextDose.medicationName}
                      </p>
                      <p className="text-3xl font-bold mt-1">{timeRemaining}</p>
                      <p className="text-[10px] text-blue-100 mt-1">
                        {new Date(nextDose.scheduledTime).toLocaleTimeString(
                          [],
                          { hour: "2-digit", minute: "2-digit" },
                        )}{" "}
                        for {nextDose.assignedToName}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm font-medium flex items-center gap-2">
                      <CheckCircle size={16} /> All caught up!
                    </p>
                  )}
                </div>
              </BentoTile>
            </>
          )}
        </div>

        {/* Chart */}
        {!isLoading && medications.length > 0 && (
          <BentoTile>
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="text-emerald-500" size={20} />
              <h3
                className={cn(
                  "text-lg font-bold text-slate-900",
                  bebasNeue.className,
                )}
              >
                Adherence (7 Days)
              </h3>
            </div>
            <div className="h-[280px] w-full">
              <ResponsiveContainer>
                <LineChart
                  data={chartData}
                  margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#eef2ff"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    axisLine={{ stroke: "#e2e8f0" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    axisLine={{ stroke: "#e2e8f0" }}
                    tickLine={false}
                    width={30}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="taken"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{
                      r: 3,
                      fill: "white",
                      stroke: "#10b981",
                      strokeWidth: 2,
                    }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#94a3b8"
                    strokeWidth={2}
                    dot={{
                      r: 3,
                      fill: "white",
                      stroke: "#94a3b8",
                      strokeWidth: 2,
                    }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </BentoTile>
        )}

        {/* Medication List */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : medications.length === 0 ? (
          <div className="bg-white rounded-[32px] p-12 text-center border border-slate-100 shadow-sm">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Pill className="w-8 h-8 text-emerald-600" />
            </div>
            <p className="text-lg font-bold text-slate-700 mb-1">
              No medications yet
            </p>
            <p className="text-sm text-slate-400 mb-6">
              Add your first medication to start tracking.
            </p>
            <button
              onClick={() => setShowAddMedModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition shadow-lg shadow-emerald-500/20"
            >
              <Plus className="w-4 h-4" /> Add Medication
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {medications.filter((m) => m.status === "active").length > 0 && (
              <div>
                <h2
                  className={cn(
                    "text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2",
                    bebasNeue.className,
                  )}
                >
                  <span className="w-1 h-4 bg-emerald-500 rounded-full" />{" "}
                  Active
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {medications
                    .filter((m) => m.status === "active")
                    .map((med) => (
                      <MedicationCard
                        key={med.id}
                        medication={med}
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
                      />
                    ))}
                </div>
              </div>
            )}
            {medications.filter((m) => m.status !== "active").length > 0 && (
              <div>
                <h2
                  className={cn(
                    "text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2",
                    bebasNeue.className,
                  )}
                >
                  <span className="w-1 h-4 bg-slate-400 rounded-full" /> Past
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-75">
                  {medications
                    .filter((m) => m.status !== "active")
                    .map((med) => (
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
                        isPast
                      />
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showHelp && (
          <Modal onClose={() => setShowHelp(false)}>
            <div className="flex items-center justify-between mb-6">
              <h2
                className={cn(
                  "text-2xl font-bold text-slate-900 flex items-center gap-2",
                  bebasNeue.className,
                )}
              >
                <HelpCircle className="text-emerald-600" size={24} /> Quick
                Guide
              </h2>
              <button
                onClick={() => setShowHelp(false)}
                className="p-2 hover:bg-slate-100 rounded-full"
              >
                <X size={18} />
              </button>
            </div>
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
                  <h3 className="text-lg font-bold text-slate-800 mb-2">
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
                      i === helpSlide ? "bg-emerald-600 w-4" : "bg-slate-300",
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
              className="mt-6 w-full py-3 bg-emerald-500 text-white rounded-2xl font-bold hover:bg-emerald-600 transition"
            >
              Got it
            </button>
          </Modal>
        )}
      </AnimatePresence>

      {/* Add Medication Modal */}
      <AnimatePresence>
        {showAddMedModal && (
          <Modal onClose={() => setShowAddMedModal(false)}>
            <h2
              className={cn(
                "text-2xl font-bold text-slate-900 mb-4",
                bebasNeue.className,
              )}
            >
              New Medication
            </h2>
            <form onSubmit={handleSubmit(onSubmitNewMed)} className="space-y-4">
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
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Frequency *
                  </label>
                  <select
                    {...register("frequency")}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="once">Once daily</option>
                    <option value="twice">Twice daily</option>
                    <option value="thrice">Thrice daily</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Assigned to *
                  </label>
                  <select
                    {...register("assignedTo")}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    {familyMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                        {m.relationship !== "self"
                          ? ` (${m.relationship})`
                          : ""}
                      </option>
                    ))}
                  </select>
                </div>
                {frequency === "custom" && (
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
                  className="flex items-center gap-2 px-5 py-2 text-sm bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 disabled:opacity-50 shadow-md"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}{" "}
                  Save
                </button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>

      {/* Add Family Modal */}
      <AnimatePresence>
        {showAddFamilyModal && (
          <Modal onClose={() => setShowAddFamilyModal(false)}>
            <h2
              className={cn(
                "text-2xl font-bold text-slate-900 mb-4",
                bebasNeue.className,
              )}
            >
              Add Family Member
            </h2>
            <form
              onSubmit={familyForm.handleSubmit(addFamilyMember)}
              className="space-y-4"
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
                  className="flex items-center gap-2 px-5 py-2 text-sm bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 disabled:opacity-50 shadow-md"
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

      {/* Reaction Modal */}
      <AnimatePresence>
        {showReactionModal && (
          <Modal onClose={() => setShowReactionModal(null)}>
            <h2
              className={cn(
                "text-2xl font-bold text-slate-900 mb-4",
                bebasNeue.className,
              )}
            >
              Report Reaction
            </h2>
            <form
              onSubmit={reactionForm.handleSubmit(async (data) => {
                await logDose(
                  showReactionModal.medicationId,
                  showReactionModal.doseId,
                  true,
                  data.reaction,
                );
                setShowReactionModal(null);
                reactionForm.reset();
              })}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  How did you feel? *
                </label>
                <textarea
                  {...reactionForm.register("reaction")}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Describe any side effects..."
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
                  className="flex items-center gap-2 px-5 py-2 text-sm bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 disabled:opacity-50 shadow-md"
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

      {/* Stop Confirmation */}
      <AnimatePresence>
        {stopConfirm && (
          <Modal onClose={() => setStopConfirm(null)}>
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
                <StopCircle className="w-8 h-8 text-amber-600" />
              </div>
              <h2
                className={cn(
                  "text-xl font-bold text-slate-900",
                  bebasNeue.className,
                )}
              >
                Stop Medication?
              </h2>
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
                  className="px-5 py-2 text-sm bg-amber-600 text-white rounded-xl hover:bg-amber-700 shadow-md"
                >
                  Stop
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------- Reusable Input ----------
function Input({ label, error, className, ...props }: any) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-xs font-medium text-slate-600 mb-1">
          {label}
        </label>
      )}
      <input
        {...props}
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

// ---------- MedicationCard ----------
const MedicationCard = ({
  medication,
  expanded,
  onToggleExpand,
  onLogDose,
  onReportReaction,
  onStop,
  isPast,
}: {
  medication: Medication;
  expanded: boolean;
  onToggleExpand: () => void;
  onLogDose: (doseId: string, taken: boolean) => void;
  onReportReaction: (doseId: string) => void;
  onStop: () => void;
  isPast?: boolean;
}) => {
  const qty = Number(medication.quantityPerDose) || 1,
    total = Number(medication.totalQuantity) || 0;
  const takenCount = medication.doses.filter((d) => d.takenAt).length;
  const totalNeeded = total / qty,
    remaining = Math.max(0, totalNeeded - takenCount) * qty;
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

  return (
    <motion.div
      layout
      whileHover={{ y: -4 }}
      transition={spring}
      className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-sm hover:shadow-lg transition-all"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 cursor-pointer" onClick={onToggleExpand}>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-slate-900 text-lg">
              {medication.name}
            </h3>
            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
              {medication.dosage}
            </span>
            {medication.ailment && (
              <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {medication.ailment}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
            <Package className="w-3 h-3" />
            Stock: {isNaN(remaining) ? "?" : remaining.toFixed(1)} / {total}{" "}
            left
          </p>
        </div>
        <button
          onClick={onToggleExpand}
          className="p-2 hover:bg-slate-100 rounded-full"
        >
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          )}
        </button>
      </div>
      <div className="mt-4 space-y-3">
        <div>
          <div className="flex justify-between text-[10px] text-slate-500 mb-1">
            <span>Today</span>
            <span>
              {takenToday}/{todaysDoses.length}
            </span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="bg-emerald-500 h-1.5 rounded-full"
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-[10px] text-slate-500 mb-1">
            <span>Overall</span>
            <span>{Math.round(completion)}%</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${isNaN(completion) ? 0 : completion}%` }}
              className="bg-blue-500 h-1.5 rounded-full"
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
            className="mt-4 space-y-4 overflow-hidden"
          >
            <div>
              <h4 className="text-xs font-medium text-slate-700 mb-3 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Next 7 days
              </h4>
              <div className="grid grid-cols-7 gap-1">
                {next7.map((day) => {
                  const dd = medication.doses.filter((d) =>
                    d.scheduledTime.startsWith(day),
                  );
                  const tk = dd.filter((d) => d.takenAt).length;
                  const tt = dd.length;
                  return (
                    <div
                      key={day}
                      className={cn(
                        "aspect-square rounded-md flex flex-col items-center justify-center text-[10px] p-0.5",
                        tt > 0
                          ? tk === tt
                            ? "bg-emerald-100 text-emerald-700"
                            : tk > 0
                              ? "bg-amber-100 text-amber-700"
                              : "bg-slate-100 text-slate-600"
                          : "bg-slate-50 text-slate-300",
                      )}
                    >
                      <span className="font-medium">
                        {new Date(day).getDate()}
                      </span>
                      {tt > 0 && (
                        <span className="text-[8px]">
                          {tk}/{tt}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-500 mt-2">
                Est. finish:{" "}
                {medication.endDate
                  ? new Date(medication.endDate).toLocaleDateString()
                  : "N/A"}
              </p>
            </div>
            <div>
              <h4 className="text-xs font-medium text-slate-700 mb-2">
                Today's Doses
              </h4>
              {todaysDoses.length === 0 ? (
                <p className="text-xs text-slate-500">No doses today.</p>
              ) : (
                <div className="space-y-2">
                  {todaysDoses.map((dose) => {
                    const taken = !!dose.takenAt;
                    return (
                      <div
                        key={dose.id}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-xl"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {new Date(dose.scheduledTime).toLocaleTimeString(
                              [],
                              { hour: "2-digit", minute: "2-digit" },
                            )}
                          </p>
                          {dose.reaction && (
                            <p className="text-xs text-slate-500 mt-1">
                              Reaction: {dose.reaction}
                            </p>
                          )}
                        </div>
                        {!isPast && !taken ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => onLogDose(dose.id, true)}
                              className="px-3 py-1 bg-emerald-500 text-white text-xs rounded-lg font-bold hover:bg-emerald-600"
                            >
                              Taken
                            </button>
                            <button
                              onClick={() => onReportReaction(dose.id)}
                              className="px-3 py-1 bg-amber-100 text-amber-700 text-xs rounded-lg font-bold hover:bg-amber-200"
                            >
                              Reaction
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Taken
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {!isPast && (
              <button
                onClick={onStop}
                className="w-full py-2 text-sm bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-100 font-bold flex items-center justify-center gap-2"
              >
                <StopCircle className="w-4 h-4" />
                Stop Medication
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
