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

// ---------- Spring transition (matches Dashboard) ----------
const spring: Transition = {
  type: "spring",
  stiffness: 200,
  damping: 20,
};

// ---------- Types ----------
type FamilyMember = {
  id: string;
  name: string;
  relationship: string;
  phone?: string;
  avatar?: string;
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
    name: z.string().min(1, "Medication name required"),
    dosage: z.string().min(1, "Dosage required"),
    quantityPerDose: z.coerce
      .number()
      .min(0.1, "Quantity per dose must be at least 0.1"),
    totalQuantity: z.coerce
      .number()
      .min(1, "Total quantity must be at least 1"),
    ailment: z.string().optional(),
    frequency: z.enum(["once", "twice", "thrice", "custom"]),
    times: z.string().optional(),
    instructions: z.string().optional(),
    startDate: z.string().min(1, "Start date required"),
    assignedTo: z.string().min(1, "Assigned to required"),
  })
  .refine(
    (data) => {
      if (data.frequency === "custom" && !data.times) return false;
      return true;
    },
    { message: "Times are required for custom frequency", path: ["times"] },
  );

type MedicationForm = z.infer<typeof medicationSchema>;

const reactionSchema = z.object({
  reaction: z.string().min(1, "Please describe your reaction"),
});

type ReactionForm = z.infer<typeof reactionSchema>;

const familySchema = z.object({
  name: z.string().min(1, "Name required"),
  phone: z.string().min(1, "Phone required"),
  relationship: z.string().min(1, "Relationship required"),
});

type FamilyForm = z.infer<typeof familySchema>;

// ---------- Helper: generate doses using local dates ----------
function generateDoses(
  startDate: string,
  times: string[],
  quantityPerDose: number,
  totalQuantity: number,
  existingDoses: Dose[] = [],
): Dose[] {
  const doses: Dose[] = [];
  const [year, month, day] = startDate.split("-").map(Number);
  const start = new Date(year, month - 1, day);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dosesPerDay = times.length;
  const maxDoses = Math.min(totalQuantity, dosesPerDay * 30);
  let dosesGenerated = existingDoses.length;

  for (let i = 0; i < maxDoses; i++) {
    const doseIndex = dosesGenerated + i;
    const dayOffset = Math.floor(doseIndex / dosesPerDay);
    const timeIndex = doseIndex % dosesPerDay;

    const date = new Date(start);
    date.setDate(start.getDate() + dayOffset);
    if (date < today) continue;

    const [hours, minutes] = times[timeIndex].split(":").map(Number);
    date.setHours(hours, minutes, 0, 0);

    doses.push({
      id: `${date.toISOString()}-${timeIndex}-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 5)}`,
      scheduledTime: date.toISOString(),
    });
  }
  return doses;
}

// ---------- Custom Tooltip for Chart (matches Dashboard style) ----------
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/90 backdrop-blur-sm p-3 rounded-2xl shadow-xl border border-slate-100">
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

// ---------- Subcomponent: BentoTile (reused from Dashboard) ----------
const BentoTile = ({ children, className, onClick }: any) => (
  <motion.div
    whileHover={{ y: -4 }}
    transition={spring}
    onClick={onClick}
    className={cn(
      "p-7 rounded-[32px] border border-slate-100 transition-all cursor-pointer bg-white",
      className,
    )}
  >
    {children}
  </motion.div>
);

// ---------- Main Component ----------
export default function MedicationPanel() {
  const { profile } = useProfile();
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>("self");
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
    const hasSeenHelp = localStorage.getItem("doza_medication_help");
    if (!hasSeenHelp) {
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
      const apiFamily = familyData.data.map((m: any) => ({
        id: m.id,
        name: m.name,
        relationship: m.relationship,
        phone: m.phone,
      }));
      setFamilyMembers([
        { id: "self", name: "Myself", relationship: "self" },
        ...apiFamily,
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
    else if (formData.frequency === "custom" && formData.times) {
      times = formData.times.split(",").map((t) => t.trim());
    }

    const doses = generateDoses(
      formData.startDate,
      times,
      formData.quantityPerDose,
      formData.totalQuantity,
    );

    const dosesPerDay = times.length;
    const totalDays = Math.ceil(
      formData.totalQuantity / (formData.quantityPerDose * dosesPerDay),
    );
    const endDate = new Date(formData.startDate);
    endDate.setDate(endDate.getDate() + totalDays);

    try {
      const result = await authPost("/api/medications", {
        ...formData,
        times,
        doses,
        endDate: endDate.toISOString().split("T")[0],
        status: "active",
      });
      if (result.success) {
        mutate(`/api/medications?memberId=${selectedFamilyId}`);
        mutate(`/api/medications/upcoming?memberId=${selectedFamilyId}`);
        setShowAddMedModal(false);
        reset();
      } else {
        alert("Error: " + result.error);
      }
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
        mutate(`/api/medications/upcoming?memberId=${selectedFamilyId}`);
      } else {
        alert("Error: " + (result.error || "Failed to log dose"));
      }
    } catch (error) {
      console.error("Failed to log dose", error);
      alert("An error occurred while logging the dose. Please try again.");
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
      } else {
        alert("Error: " + (result.error || "Failed to stop medication"));
      }
    } catch (error) {
      console.error("Failed to stop medication", error);
      alert("An error occurred while stopping the medication.");
    }
  };

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      alert("This browser does not support notifications.");
      return;
    }
    if (Notification.permission === "granted") {
      alert("Notifications already enabled.");
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
          alert("VAPID key missing. Please contact support.");
          return;
        }
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        });
        await authPost("/api/notifications/subscribe", subscription);
        alert("Notifications enabled successfully!");
      } else {
        alert("Notification permission denied.");
      }
    } catch (err) {
      console.error("Failed to subscribe:", err);
      alert(
        "Failed to enable notifications. Make sure you're using HTTPS and your service worker is registered.",
      );
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
      } else {
        alert("Error: " + result.error);
      }
    } catch {
      alert("Failed to add family member");
    }
  };

  const nextDose = upcomingDoses.length > 0 ? upcomingDoses[0] : null;
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  useEffect(() => {
    if (!nextDose) return;
    const interval = setInterval(() => {
      const now = new Date();
      const doseTime = new Date(nextDose.scheduledTime);
      const diff = doseTime.getTime() - now.getTime();
      if (diff <= 0) {
        setTimeRemaining("Due now!");
        clearInterval(interval);
      } else {
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        setTimeRemaining(`${hours}h ${minutes}m`);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [nextDose]);

  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }).reverse();

    return last7Days.map((day) => {
      const dayDoses = medications.flatMap((m) =>
        m.doses.filter((d) => d.scheduledTime.startsWith(day)),
      );
      const taken = dayDoses.filter((d) => d.takenAt).length;
      const total = dayDoses.length;
      return {
        date: new Date(day).toLocaleDateString(undefined, {
          month: "numeric",
          day: "numeric",
        }),
        taken,
        total,
      };
    });
  }, [medications]);

  const helpSlides = [
    {
      icon: <UserPlus className="w-12 h-12 text-emerald-600" />,
      title: "Add Family Members",
      description:
        "Click the + icon next to 'Managing for' to add people you care for.",
    },
    {
      icon: <Pill className="w-12 h-12 text-emerald-600" />,
      title: "Add Medications",
      description:
        "Fill in details like dosage, stock, and frequency. We'll calculate the end date.",
    },
    {
      icon: <CheckCircle className="w-12 h-12 text-emerald-600" />,
      title: "Log Doses",
      description:
        "Expand a medication card and mark doses as taken. You can also report reactions.",
    },
    {
      icon: <Bell className="w-12 h-12 text-emerald-600" />,
      title: "Enable Reminders",
      description:
        "Click the bell to get push notifications before doses are due.",
    },
    {
      icon: <BarChart3 className="w-12 h-12 text-emerald-600" />,
      title: "Track Progress",
      description:
        "The graph shows your adherence. Each card has a mini calendar for the next 7 days.",
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-red-600 text-center bg-white rounded-3xl border border-slate-100 shadow-sm">
        Error loading medications.
      </div>
    );
  }

  return (
    <div
      className={cn("min-h-screen bg-[#F8FAFC] pb-32 pt-6", poppins.className)}
    >
      <div className="max-w-7xl mx-auto px-6 space-y-8">
        {/* --- HEADER --- */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-8 rounded-[32px] border border-slate-200/60 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                Adherence Protocol
              </p>
            </div>
            <h1
              className={cn(
                "text-4xl md:text-5xl text-slate-900 leading-none",
                bebasNeue.className,
              )}
            >
              Medication <span className="text-emerald-600">Tracker</span>
            </h1>
          </div>
          <div className="flex gap-3">
            <button
              onClick={requestNotificationPermission}
              className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-md"
            >
              <Bell size={14} /> Enable Reminders
            </button>
            <button
              onClick={() => setShowAddMedModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-md"
            >
              <Plus size={14} /> Add Med
            </button>
          </div>
        </header>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Family Picker */}
          <BentoTile className="bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3
                className={cn(
                  "text-lg font-bold text-slate-900 flex items-center gap-2",
                  bebasNeue.className,
                )}
              >
                <Users className="text-emerald-500" size={20} /> Managing for
              </h3>
              <button
                onClick={() => setShowAddFamilyModal(true)}
                className="p-2 rounded-full hover:bg-slate-100 transition-all"
              >
                <UserPlus size={16} className="text-slate-400" />
              </button>
            </div>
            <div className="space-y-2">
              {familyMembers.map((member) => (
                <button
                  key={member.id}
                  onClick={() => setSelectedFamilyId(member.id)}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition flex items-center justify-between",
                    selectedFamilyId === member.id
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                      : "text-slate-600 hover:bg-slate-50",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        selectedFamilyId === member.id
                          ? "bg-emerald-500"
                          : "bg-slate-300",
                      )}
                    />
                    {member.name}
                  </div>
                  {member.relationship !== "self" && (
                    <span className="text-[10px] text-slate-400">
                      {member.relationship}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </BentoTile>

          {/* Today's Doses */}
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

          {/* Next Dose Countdown */}
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
                    {new Date(nextDose.scheduledTime).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
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
        </div>

        {/* Chart */}
        {medications.length > 0 && (
          <BentoTile className="bg-white">
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="text-emerald-500" size={20} />
              <h3
                className={cn(
                  "text-lg font-bold text-slate-900",
                  bebasNeue.className,
                )}
              >
                Adherence (Last 7 Days)
              </h3>
            </div>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
                >
                  <defs>
                    <linearGradient
                      id="gradientTaken"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#10b981"
                        stopOpacity={0.15}
                      />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient
                      id="gradientTotal"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#94a3b8"
                        stopOpacity={0.15}
                      />
                      <stop offset="100%" stopColor="#94a3b8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
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
                    activeDot={{ r: 5, stroke: "white", strokeWidth: 2 }}
                    fill="url(#gradientTaken)"
                    name="Taken"
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
                    activeDot={{ r: 5, stroke: "white", strokeWidth: 2 }}
                    fill="url(#gradientTotal)"
                    name="Scheduled"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </BentoTile>
        )}

        {/* Medication List */}
        {medications.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-sm p-12 text-center text-slate-500 rounded-3xl border border-slate-100 shadow-xl">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Pill className="w-8 h-8 text-emerald-600" />
            </div>
            <p className="text-lg font-medium text-slate-700 mb-1">
              No medications yet
            </p>
            <p className="text-sm mb-6 max-w-md mx-auto">
              Add your first medication to start tracking.
            </p>
            <button
              onClick={() => setShowAddMedModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition shadow-md"
            >
              <Plus className="w-4 h-4" /> Add Medication
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Active Medications */}
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

            {/* Past Medications */}
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

      {/* --- MODALS (same as before but with premium styling) --- */}
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
                <HelpCircle className="text-emerald-600" size={24} /> How to use
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
                  transition={{ duration: 0.3 }}
                  className="flex flex-col items-center text-center p-4"
                >
                  <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
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
                {helpSlides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setHelpSlide(idx)}
                    className={cn(
                      "w-1.5 h-1.5 rounded-full transition-all",
                      idx === helpSlide ? "bg-emerald-600 w-3" : "bg-slate-300",
                    )}
                  />
                ))}
              </div>
              <button
                onClick={() =>
                  setHelpSlide((prev) =>
                    prev === 0 ? helpSlides.length - 1 : prev - 1,
                  )
                }
                className="absolute left-0 top-1/2 -translate-y-1/2 p-2 bg-white rounded-full shadow-md hover:shadow-lg active:scale-95 border border-slate-100"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() =>
                  setHelpSlide((prev) =>
                    prev === helpSlides.length - 1 ? 0 : prev + 1,
                  )
                }
                className="absolute right-0 top-1/2 -translate-y-1/2 p-2 bg-white rounded-full shadow-md hover:shadow-lg active:scale-95 border border-slate-100"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <button
              onClick={() => setShowHelp(false)}
              className="mt-6 w-full py-3 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition font-medium"
            >
              Get Started
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
              Add New Medication
            </h2>
            <form onSubmit={handleSubmit(onSubmitNewMed)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Name *
                  </label>
                  <input
                    {...register("name")}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="e.g. Amoxicillin"
                  />
                  {errors.name && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.name.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Dosage *
                  </label>
                  <input
                    {...register("dosage")}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="e.g. 500mg"
                  />
                  {errors.dosage && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.dosage.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Qty per dose *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    {...register("quantityPerDose")}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="e.g. 1"
                  />
                  {errors.quantityPerDose && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.quantityPerDose.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Total stock *
                  </label>
                  <input
                    type="number"
                    {...register("totalQuantity")}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="e.g. 100"
                  />
                  {errors.totalQuantity && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.totalQuantity.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Ailment (opt)
                  </label>
                  <input
                    {...register("ailment")}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="e.g. Infection"
                  />
                </div>
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
                    <option value="custom">Custom times</option>
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
                        {m.name}{" "}
                        {m.relationship !== "self" ? `(${m.relationship})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                {frequency === "custom" && (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Times (comma separated 24h) *
                    </label>
                    <input
                      {...register("times")}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="e.g. 08:00, 14:00, 20:00"
                    />
                    {errors.times && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.times.message}
                      </p>
                    )}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    {...register("startDate")}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  {errors.startDate && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.startDate.message}
                    </p>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Instructions (opt)
                  </label>
                  <input
                    {...register("instructions")}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="e.g. Take with food"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMedModal(false)}
                  className="px-5 py-2 text-sm bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2 text-sm bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition shadow-md"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}{" "}
                  Save
                </button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>

      {/* Add Family Member Modal */}
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
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Name *
                </label>
                <input
                  {...familyForm.register("name")}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Full name"
                />
                {familyForm.formState.errors.name && (
                  <p className="text-red-500 text-xs mt-1">
                    {familyForm.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Phone *
                </label>
                <input
                  {...familyForm.register("phone")}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="+1234567890"
                />
                {familyForm.formState.errors.phone && (
                  <p className="text-red-500 text-xs mt-1">
                    {familyForm.formState.errors.phone.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Relationship *
                </label>
                <input
                  {...familyForm.register("relationship")}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="e.g. Spouse, Child, Parent"
                />
                {familyForm.formState.errors.relationship && (
                  <p className="text-red-500 text-xs mt-1">
                    {familyForm.formState.errors.relationship.message}
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddFamilyModal(false)}
                  className="px-5 py-2 text-sm bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={familyForm.formState.isSubmitting}
                  className="flex items-center gap-2 px-5 py-2 text-sm bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition shadow-md"
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
                  className="px-5 py-2 text-sm bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reactionForm.formState.isSubmitting}
                  className="flex items-center gap-2 px-5 py-2 text-sm bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition shadow-md"
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

      {/* Stop Confirmation Modal */}
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
                Are you sure you want to stop this medication? It will be moved
                to "Past Medications" and you will no longer receive reminders.
              </p>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={() => setStopConfirm(null)}
                  className="px-5 py-2 text-sm bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => stopConfirm && stopMedication(stopConfirm)}
                  className="px-5 py-2 text-sm bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition shadow-md"
                >
                  Stop Medication
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
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
  isPast = false,
}: {
  medication: Medication;
  expanded: boolean;
  onToggleExpand: () => void;
  onLogDose: (doseId: string, taken: boolean) => void;
  onReportReaction: (doseId: string) => void;
  onStop: () => void;
  isPast?: boolean;
}) => {
  const quantityPerDose = Number(medication.quantityPerDose) || 1;
  const totalQuantity = Number(medication.totalQuantity) || 0;

  const dosesTaken = medication.doses.filter((d) => d.takenAt).length;
  const totalDosesNeeded = totalQuantity / quantityPerDose;
  const remainingDoses = Math.max(0, totalDosesNeeded - dosesTaken);
  const remainingStock = remainingDoses * quantityPerDose;
  const completionPercent =
    totalDosesNeeded > 0 ? (dosesTaken / totalDosesNeeded) * 100 : 0;

  const today = new Date();
  const localTodayStr = new Date(
    today.getTime() - today.getTimezoneOffset() * 60000,
  )
    .toISOString()
    .split("T")[0];

  const todaysDoses = medication.doses.filter((d) =>
    d.scheduledTime.startsWith(localTodayStr),
  );
  const takenCount = todaysDoses.filter((d) => d.takenAt).length;
  const totalToday = todaysDoses.length;
  const progress = totalToday > 0 ? (takenCount / totalToday) * 100 : 0;

  const next7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .split("T")[0];
  });

  return (
    <motion.div
      layout
      whileHover={{ y: -4 }}
      transition={spring}
      className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-sm hover:shadow-xl transition-all"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 cursor-pointer" onClick={onToggleExpand}>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-slate-900 text-lg">
              {medication.name}
            </h3>
            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
              {medication.dosage}
            </span>
            {medication.ailment && (
              <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {medication.ailment}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
            <Package className="w-3 h-3 text-slate-400" />
            Stock: {isNaN(remainingStock)
              ? "?"
              : remainingStock.toFixed(1)} / {totalQuantity} left
          </p>
          {medication.instructions && (
            <p className="text-[10px] text-slate-500 mt-1 italic">
              {medication.instructions}
            </p>
          )}
        </div>
        <button
          onClick={onToggleExpand}
          className="p-2 hover:bg-slate-100 rounded-full transition"
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
            <span>Today's progress</span>
            <span>
              {takenCount}/{totalToday}
            </span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="bg-emerald-500 h-1.5 rounded-full"
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-[10px] text-slate-500 mb-1">
            <span>Overall completion</span>
            <span>
              {isNaN(completionPercent) ? 0 : Math.round(completionPercent)}%
            </span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{
                width: `${isNaN(completionPercent) ? 0 : completionPercent}%`,
              }}
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
                <Calendar className="w-3 h-3" /> Next 7 days
              </h4>
              <div className="grid grid-cols-7 gap-1">
                {next7Days.map((day) => {
                  const dayDoses = medication.doses.filter((d) =>
                    d.scheduledTime.startsWith(day),
                  );
                  const taken = dayDoses.filter((d) => d.takenAt).length;
                  const total = dayDoses.length;
                  const hasDoses = total > 0;
                  const allTaken = taken === total && total > 0;
                  const someTaken = taken > 0 && taken < total;
                  return (
                    <div
                      key={day}
                      className={cn(
                        "aspect-square rounded-md flex flex-col items-center justify-center text-[10px] p-0.5",
                        hasDoses
                          ? allTaken
                            ? "bg-emerald-100 text-emerald-700"
                            : someTaken
                              ? "bg-amber-100 text-amber-700"
                              : "bg-slate-100 text-slate-600"
                          : "bg-slate-50 text-slate-300",
                      )}
                    >
                      <span className="font-medium">
                        {new Date(day).getDate()}
                      </span>
                      {hasDoses && (
                        <span className="text-[8px]">
                          {taken}/{total}
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
                    const scheduled = new Date(dose.scheduledTime);
                    const timeStr = scheduled.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    const taken = !!dose.takenAt;
                    return (
                      <div
                        key={dose.id}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-xl"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {timeStr}
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
                              className="px-3 py-1 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700"
                            >
                              Taken
                            </button>
                            <button
                              onClick={() => onReportReaction(dose.id)}
                              className="px-3 py-1 bg-amber-100 text-amber-700 text-xs rounded-lg hover:bg-amber-200"
                            >
                              Reaction
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Taken
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
                className="w-full py-2 text-sm bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-100 transition font-medium flex items-center justify-center gap-2"
              >
                <StopCircle className="w-4 h-4" /> Stop Medication
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ---------- Modal Component (matches Dashboard) ----------
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
