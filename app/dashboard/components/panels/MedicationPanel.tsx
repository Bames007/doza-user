"use client";

import { useState, useEffect } from "react";
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
  BarChart3,
  ChevronLeft,
  ChevronRight,
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

// ---------- Custom Tooltip for Chart ----------
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/90 backdrop-blur-sm p-2 rounded-xl shadow-xl border border-gray-100">
        <p className="text-xs font-semibold text-gray-800 mb-1">{label}</p>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-emerald-500 rounded-full" />
            <span className="text-xs text-gray-600">
              Taken: {payload[0].value}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full" />
            <span className="text-xs text-gray-600">
              Scheduled: {payload[1].value}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

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

  const chartData = (() => {
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
  })();

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
      <div className="max-w-6xl mx-auto px-3 pb-24  min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-3 pb-24  min-h-screen pt-4">
        <div className="p-4 text-red-600 text-center bg-white rounded-2xl border border-gray-100">
          Error loading medications.
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
            Medication Tracker
          </h1>
          <p className="text-xs sm:text-sm text-emerald-600 mt-0.5">
            Stay on top of your doses
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

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-end gap-2 mb-4">
        <button
          onClick={requestNotificationPermission}
          className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition shadow-sm text-xs sm:text-sm"
        >
          <Bell className="w-4 h-4" />
          <span className="hidden xs:inline">Enable Reminders</span>
        </button>
        <button
          onClick={() => setShowAddMedModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition shadow-sm text-xs sm:text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Medication
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        {/* Family Picker */}
        <div className="bg-white border border-gray-100 rounded-2xl p-3 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h2
              className={cn(
                "text-sm font-semibold text-gray-800 flex items-center gap-1",
                bebasNeue.className,
              )}
            >
              <Users className="w-4 h-4 text-emerald-600" />
              Managing for
            </h2>
            <button
              onClick={() => setShowAddFamilyModal(true)}
              className="p-1 hover:bg-gray-100 rounded-full"
              title="Add family member"
            >
              <UserPlus className="w-4 h-4 text-gray-500" />
            </button>
          </div>
          <div className="space-y-1">
            {familyMembers.map((member) => (
              <button
                key={member.id}
                onClick={() => setSelectedFamilyId(member.id)}
                className={cn(
                  "w-full text-left px-2 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2",
                  selectedFamilyId === member.id
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-gray-600 hover:bg-gray-50",
                )}
              >
                <div
                  className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    selectedFamilyId === member.id
                      ? "bg-emerald-500"
                      : "bg-gray-300",
                  )}
                />
                {member.name}
                {member.relationship !== "self" && (
                  <span className="text-[10px] text-gray-400 ml-auto">
                    {member.relationship}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Today's Doses */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-3 text-white shadow-sm">
          <div className="flex items-center gap-1 mb-1">
            <Calendar className="w-4 h-4 text-blue-100" />
            <h2
              className={cn(
                "text-sm font-semibold text-blue-100",
                bebasNeue.className,
              )}
            >
              Today's Doses
            </h2>
          </div>
          <p className="text-3xl font-bold">{upcomingDoses.length}</p>
          <p className="text-[10px] text-blue-100 mt-1">remaining</p>
        </div>

        {/* Next Dose Countdown */}
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl p-3 text-white shadow-sm">
          <div className="flex items-center gap-1 mb-1">
            <Clock className="w-4 h-4 text-emerald-100" />
            <h2
              className={cn(
                "text-sm font-semibold text-emerald-100",
                bebasNeue.className,
              )}
            >
              Next Dose
            </h2>
          </div>
          {nextDose ? (
            <>
              <p className="text-sm font-semibold truncate">
                {nextDose.medicationName}
              </p>
              <p className="text-2xl font-bold mt-1">{timeRemaining}</p>
              <p className="text-[10px] text-emerald-100 mt-1">
                {new Date(nextDose.scheduledTime).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                for {nextDose.assignedToName}
              </p>
            </>
          ) : (
            <p className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> All caught up!
            </p>
          )}
        </div>
      </div>

      {/* Chart Section */}
      {medications.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-3 shadow-sm mb-5">
          <h2
            className={cn(
              "text-base font-semibold text-gray-800 mb-2 flex items-center gap-2",
              bebasNeue.className,
            )}
          >
            <BarChart3 className="w-4 h-4 text-emerald-600" />
            Doses taken (last 7 days)
          </h2>
          <div className="h-48 sm:h-56 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 5, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="gradientTaken"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient
                    id="gradientTotal"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#94a3b8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f0f0f0"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 8, fill: "#6b7280" }}
                  axisLine={{ stroke: "#e5e7eb" }}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 8, fill: "#6b7280" }}
                  axisLine={{ stroke: "#e5e7eb" }}
                  tickLine={false}
                  width={20}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="taken"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{
                    r: 2,
                    fill: "white",
                    stroke: "#10b981",
                    strokeWidth: 2,
                  }}
                  activeDot={{ r: 4, stroke: "white", strokeWidth: 2 }}
                  fill="url(#gradientTaken)"
                  name="Taken"
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  dot={{
                    r: 2,
                    fill: "white",
                    stroke: "#94a3b8",
                    strokeWidth: 2,
                  }}
                  activeDot={{ r: 4, stroke: "white", strokeWidth: 2 }}
                  fill="url(#gradientTotal)"
                  name="Scheduled"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Medication List */}
      {medications.length === 0 ? (
        <div className="bg-white/60 backdrop-blur-sm p-8 text-center text-gray-500 rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <Pill className="w-7 h-7 text-emerald-600" />
          </div>
          <p className="text-base font-medium text-gray-700 mb-1">
            No medications yet
          </p>
          <p className="text-xs mb-3 max-w-md mx-auto">
            Add your first medication to start tracking.
          </p>
          <button
            onClick={() => setShowAddMedModal(true)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition inline-flex items-center gap-2 text-sm shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Medication
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Active Medications */}
          <div>
            <h2
              className={cn(
                "text-base font-semibold text-gray-800 mb-2 flex items-center gap-2",
                bebasNeue.className,
              )}
            >
              <span className="w-1 h-4 bg-emerald-500 rounded-full" />
              Active
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {medications
                .filter((m) => m.status === "active")
                .map((med) => (
                  <MedicationCard
                    key={med.id}
                    medication={med}
                    expanded={expandedMedId === med.id}
                    onToggleExpand={() =>
                      setExpandedMedId(expandedMedId === med.id ? null : med.id)
                    }
                    onLogDose={(doseId, taken) =>
                      logDose(med.id, doseId, taken)
                    }
                    onReportReaction={(doseId) =>
                      setShowReactionModal({ medicationId: med.id, doseId })
                    }
                  />
                ))}
            </div>
          </div>

          {/* Past Medications */}
          {medications.filter((m) => m.status !== "active").length > 0 && (
            <div>
              <h2
                className={cn(
                  "text-base font-semibold text-gray-800 mb-2 flex items-center gap-2",
                  bebasNeue.className,
                )}
              >
                <span className="w-1 h-4 bg-gray-400 rounded-full" />
                Past Medications
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 opacity-75">
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
                    />
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Help Carousel Modal */}
      <AnimatePresence>
        {showHelp && (
          <Modal onClose={() => setShowHelp(false)}>
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
        )}
      </AnimatePresence>

      {/* Add Medication Modal */}
      <AnimatePresence>
        {showAddMedModal && (
          <Modal onClose={() => setShowAddMedModal(false)}>
            <h2
              className={cn(
                "text-lg font-bold text-gray-900 mb-3",
                bebasNeue.className,
              )}
            >
              Add New Medication
            </h2>
            <form onSubmit={handleSubmit(onSubmitNewMed)} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    {...register("name")}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g. Amoxicillin"
                  />
                  {errors.name && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.name.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Dosage *
                  </label>
                  <input
                    {...register("dosage")}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g. 500mg"
                  />
                  {errors.dosage && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.dosage.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Qty per dose *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    {...register("quantityPerDose")}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g. 1"
                  />
                  {errors.quantityPerDose && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.quantityPerDose.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Total stock *
                  </label>
                  <input
                    type="number"
                    {...register("totalQuantity")}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g. 100"
                  />
                  {errors.totalQuantity && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.totalQuantity.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Ailment (opt)
                  </label>
                  <input
                    {...register("ailment")}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl"
                    placeholder="e.g. Infection"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Frequency *
                  </label>
                  <select
                    {...register("frequency")}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="once">Once daily</option>
                    <option value="twice">Twice daily</option>
                    <option value="thrice">Thrice daily</option>
                    <option value="custom">Custom times</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Assigned to *
                  </label>
                  <select
                    {...register("assignedTo")}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
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
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Times (comma separated 24h) *
                    </label>
                    <input
                      {...register("times")}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
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
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    {...register("startDate")}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                  {errors.startDate && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.startDate.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Instructions (opt)
                  </label>
                  <input
                    {...register("instructions")}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl"
                    placeholder="e.g. Take with food"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMedModal(false)}
                  className="px-4 py-2 text-sm bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
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
                "text-lg font-bold text-gray-900 mb-3",
                bebasNeue.className,
              )}
            >
              Add Family Member
            </h2>
            <form
              onSubmit={familyForm.handleSubmit(addFamilyMember)}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  {...familyForm.register("name")}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl"
                  placeholder="Full name"
                />
                {familyForm.formState.errors.name && (
                  <p className="text-red-500 text-xs mt-1">
                    {familyForm.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Phone *
                </label>
                <input
                  {...familyForm.register("phone")}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl"
                  placeholder="+1234567890"
                />
                {familyForm.formState.errors.phone && (
                  <p className="text-red-500 text-xs mt-1">
                    {familyForm.formState.errors.phone.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Relationship *
                </label>
                <input
                  {...familyForm.register("relationship")}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl"
                  placeholder="e.g. Spouse, Child, Parent"
                />
                {familyForm.formState.errors.relationship && (
                  <p className="text-red-500 text-xs mt-1">
                    {familyForm.formState.errors.relationship.message}
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddFamilyModal(false)}
                  className="px-4 py-2 text-sm bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={familyForm.formState.isSubmitting}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50"
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

      {/* Reaction Modal */}
      <AnimatePresence>
        {showReactionModal && (
          <Modal onClose={() => setShowReactionModal(null)}>
            <h2
              className={cn(
                "text-lg font-bold text-gray-900 mb-3",
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
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  How did you feel? *
                </label>
                <textarea
                  {...reactionForm.register("reaction")}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl"
                  placeholder="Describe any side effects..."
                />
                {reactionForm.formState.errors.reaction && (
                  <p className="text-red-500 text-xs mt-1">
                    {reactionForm.formState.errors.reaction.message}
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowReactionModal(null)}
                  className="px-4 py-2 text-sm bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reactionForm.formState.isSubmitting}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50"
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
    </motion.div>
  );
}

// ---------- Medication Card ----------
const MedicationCard = ({
  medication,
  expanded,
  onToggleExpand,
  onLogDose,
  onReportReaction,
}: {
  medication: Medication;
  expanded: boolean;
  onToggleExpand: () => void;
  onLogDose: (doseId: string, taken: boolean) => void;
  onReportReaction: (doseId: string) => void;
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
      className="bg-white border border-gray-100 rounded-2xl p-3 shadow-sm hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 cursor-pointer" onClick={onToggleExpand}>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 text-base">
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
          <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
            <Package className="w-3 h-3 text-gray-400" />
            Stock: {isNaN(remainingStock)
              ? "?"
              : remainingStock.toFixed(1)} / {totalQuantity} left
          </p>
          {medication.instructions && (
            <p className="text-[10px] text-gray-500 mt-1 italic">
              {medication.instructions}
            </p>
          )}
        </div>
        <button
          onClick={onToggleExpand}
          className="p-2 hover:bg-gray-100 rounded-full transition min-w-[36px] min-h-[36px] flex items-center justify-center"
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
      </div>

      <div className="mt-3 space-y-2">
        <div>
          <div className="flex justify-between text-[10px] text-gray-500 mb-1">
            <span>Today's progress</span>
            <span>
              {takenCount}/{totalToday}
            </span>
          </div>
          <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="bg-emerald-500 h-1.5 rounded-full"
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-[10px] text-gray-500 mb-1">
            <span>Overall completion</span>
            <span>
              {isNaN(completionPercent) ? 0 : Math.round(completionPercent)}%
            </span>
          </div>
          <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
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
            className="mt-3 space-y-3 overflow-hidden"
          >
            <div>
              <h4 className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-1">
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
                              : "bg-gray-100 text-gray-600"
                          : "bg-gray-50 text-gray-300",
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
              <p className="text-[10px] text-gray-500 mt-2">
                Est. finish:{" "}
                {medication.endDate
                  ? new Date(medication.endDate).toLocaleDateString()
                  : "N/A"}
              </p>
            </div>

            <div>
              <h4 className="text-xs font-medium text-gray-700 mb-2">
                Today's Doses
              </h4>
              {todaysDoses.length === 0 ? (
                <p className="text-xs text-gray-500">No doses today.</p>
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
                        className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {timeStr}
                          </p>
                          {dose.reaction && (
                            <p className="text-xs text-gray-500 mt-1">
                              Reaction: {dose.reaction}
                            </p>
                          )}
                        </div>
                        {!taken ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => onLogDose(dose.id, true)}
                              className="px-3 py-1 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700 min-w-[50px]"
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
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ---------- Modal Component ----------
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
      className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-4 shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </motion.div>
  </motion.div>
);
