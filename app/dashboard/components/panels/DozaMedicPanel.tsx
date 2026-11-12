// app/dashboard/components/panels/DozaMedicsPanel.tsx
"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import useSWR, { mutate } from "swr";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  X,
  Loader2,
  MapPin,
  Clock,
  Languages,
  Scale,
  ChevronRight,
  Video,
  Users,
  Stethoscope,
  Eye,
  Pill,
  Syringe,
  Home,
  SmilePlus,
  Calendar as CalendarIcon,
  ShieldCheck,
  AlertCircle,
  Star,
  Zap,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/app/utils/utils";
import { authFetcher, authPost } from "@/app/utils/client-auth";
import { poppins } from "@/app/constants";
import { useDashboard } from "../../DashboardContext";

// ─── Types ────────────────────────────────────────────
type BookingMode = "scheduled" | "instant" | "emergency";

// ─── sessionStorage helpers ────────────────────────────
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

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2";

// ─── Duration + pricing ────────────────────────────────
const DURATIONS = ["15 min", "30 min", "45 min", "60 min", "90+ min"] as const;
type DurationLabel = (typeof DURATIONS)[number];

const DURATION_HOURS: Record<DurationLabel, number> = {
  "15 min": 0.25,
  "30 min": 0.5,
  "45 min": 0.75,
  "60 min": 1,
  "90+ min": 1.5,
};

const MIN_LEAD_MINUTES = 30;

// ─── Time slot types ───────────────────────────────────
interface TimeSlot {
  time: string;
  disabled: boolean;
}

const generateTimeSlots = (start: string, end: string) => {
  const slots: string[] = [];
  let current = parseInt(start?.split(":")[0] || "9");
  const stop = parseInt(end?.split(":")[0] || "17");
  while (current < stop) {
    slots.push(`${current.toString().padStart(2, "0")}:00`);
    current++;
  }
  return slots;
};

const CATEGORIES = [
  { id: "nurse", label: "Nurses", icon: <Syringe size={15} /> },
  { id: "doctor", label: "Doctors", icon: <Stethoscope size={15} /> },
  { id: "dentist", label: "Dentists", icon: <SmilePlus size={15} /> },
  { id: "eye", label: "Eye Care", icon: <Eye size={15} /> },
  { id: "pharmacist", label: "Pharmacists", icon: <Pill size={15} /> },
  { id: "other", label: "Others", icon: <Users size={15} /> },
];

const VALID_CATEGORY_IDS = new Set(CATEGORIES.map((c) => c.id));

// ─── Formatting ────────────────────────────────────────
function formatNaira(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return "₦0";
  return `₦${Math.round(amount).toLocaleString()}`;
}

function formatRatingValue(avg: number, count: number): string {
  if (!count) return "New";
  return `${Number(avg).toFixed(1)} / 5 (${count})`;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function toTimeStr(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function getInitials(name?: string | null): string {
  const n = (name || "").trim();
  if (!n) return "?";
  const parts = n.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// ─── Avatar ───────────────────────────────────────────
function MedicAvatar({
  src,
  name,
  className,
  textClassName,
}: {
  src?: string | null;
  name?: string | null;
  className?: string;
  textClassName?: string;
}) {
  if (src) {
    return (
      <img
        src={src}
        alt={name || "Medic"}
        loading="lazy"
        className={cn("object-cover", className)}
      />
    );
  }
  return (
    <div
      role="img"
      aria-label={name || "Medic"}
      className={cn(
        "flex items-center justify-center select-none",
        "bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 text-white font-bold",
        className,
      )}
    >
      <span className={cn("tracking-tight", textClassName)}>
        {getInitials(name)}
      </span>
    </div>
  );
}

// ─── Skeleton (matches new compact card shape) ────────
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl border border-emerald-100 p-2.5 sm:p-4 lg:p-5 shadow-xs animate-pulse flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-start mb-2.5 sm:mb-4">
          <div className="w-9 h-9 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-emerald-100" />
          <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-emerald-50" />
        </div>
        <div className="h-3 sm:h-4 w-3/4 bg-emerald-200 rounded-md mb-1.5 sm:mb-2" />
        <div className="h-2 sm:h-3 w-1/3 bg-emerald-100 rounded-md mb-2.5 sm:mb-4" />
        <div className="space-y-1.5 sm:space-y-2 mb-2.5 sm:mb-5">
          <div className="h-2 sm:h-3 w-1/2 bg-emerald-100 rounded-md" />
          <div className="h-2 sm:h-3 w-2/3 bg-emerald-100 rounded-md" />
        </div>
      </div>
      <div className="flex justify-between items-center pt-2 sm:pt-3 border-t border-emerald-100">
        <div>
          <div className="h-2 sm:h-2.5 w-8 sm:w-10 bg-emerald-100 rounded mb-1 sm:mb-1.5" />
          <div className="h-4 sm:h-5 w-14 sm:w-20 bg-emerald-200 rounded-md sm:rounded-lg" />
        </div>
        <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-emerald-100" />
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════
export default function DozaMedicsPanel({ user }: any) {
  const { setActivePanel } = useDashboard();

  // ─── Persisted state ─────────────────────────────────
  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
    const v = ssGet("medics:selectedCategory");
    if (v && VALID_CATEGORY_IDS.has(v)) return v;
    return "nurse";
  });
  useEffect(() => {
    ssSet("medics:selectedCategory", selectedCategory);
  }, [selectedCategory]);

  const [compareList, setCompareList] = useState<any[]>(() => {
    const v = ssGet("medics:compareList");
    if (v) {
      try {
        const parsed = JSON.parse(v);
        if (Array.isArray(parsed)) return parsed.slice(0, 3);
      } catch {}
    }
    return [];
  });
  useEffect(() => {
    if (compareList.length > 0) {
      ssSet("medics:compareList", JSON.stringify(compareList));
    } else {
      ssRemove("medics:compareList");
    }
  }, [compareList]);

  const [consultType, setConsultType] = useState<"online" | "inPerson">(() => {
    const v = ssGet("medics:consultType");
    return v === "online" ? "online" : "inPerson";
  });
  useEffect(() => {
    ssSet("medics:consultType", consultType);
  }, [consultType]);

  const [patientAddress, setPatientAddress] = useState<string>(
    () => ssGet("medics:patientAddress") || "",
  );
  useEffect(() => {
    if (patientAddress) ssSet("medics:patientAddress", patientAddress);
    else ssRemove("medics:patientAddress");
  }, [patientAddress]);

  // ─── Ephemeral state ─────────────────────────────────
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [viewingMedic, setViewingMedic] = useState<any | null>(null);
  const [bookingMode, setBookingMode] = useState<BookingMode>("scheduled");
  const [bookingStep, setBookingStep] = useState<
    "details" | "schedule" | "payment"
  >("details");
  const [selectedDuration, setSelectedDuration] = useState<DurationLabel | "">(
    "",
  );
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(
    null,
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [notification, setNotification] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  // ─── Scroll restoration ──────────────────────────────
  const scrollRestoredRef = useRef(false);
  useEffect(() => {
    const el =
      (document.getElementById("dashboard-scroll") as HTMLElement | null) ||
      (document.querySelector("main") as HTMLElement | null);
    if (!el) return;

    if (!scrollRestoredRef.current) {
      const saved = ssGet("medics:scroll");
      el.scrollTo({ top: saved ? Number(saved) : 0, behavior: "instant" });
      scrollRestoredRef.current = true;
    }

    const onScroll = () => ssSet("medics:scroll", String(el.scrollTop));
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // ─── Data ────────────────────────────────────────────
  const { data: apiResponse, isLoading } = useSWR(
    `/api/medics?category=${selectedCategory}`,
    authFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5_000,
      revalidateIfStale: true,
      revalidateOnMount: true,
      keepPreviousData: true,
    },
  );

  const medics = useMemo(
    () => (apiResponse?.success ? apiResponse.data : []),
    [apiResponse],
  );

  const isColdStart = isLoading && medics.length === 0;

  const triggerNotify = (
    msg: string,
    type: "success" | "error" = "success",
  ) => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // ─── Derived medic config ────────────────────────────
  const baseRate = Number(viewingMedic?.price) || 0;
  const instantWindowMinutes =
    Number(viewingMedic?.instantTalkWindowMinutes) || 15;
  const instantHours = instantWindowMinutes / 60;
  const instantPremium = Number(viewingMedic?.instantTalkPremium) || 0;
  const emergencyPremium = Number(viewingMedic?.emergencyPremium) || 0;
  const urgentFee = Number(viewingMedic?.urgentFee) || 0;

  const selectedService = useMemo(() => {
    if (!viewingMedic || !selectedServiceId) return null;
    const services: any[] = Array.isArray(viewingMedic.services)
      ? viewingMedic.services
      : [];
    return services.find((s) => s.id === selectedServiceId) || null;
  }, [viewingMedic, selectedServiceId]);

  const servicesForType = useMemo(() => {
    if (!viewingMedic) return [];
    const services: any[] = Array.isArray(viewingMedic.services)
      ? viewingMedic.services
      : [];
    return services.filter((s: any) => {
      if (s.type === "any") return true;
      if (consultType === "online" && s.type === "video") return true;
      if (
        consultType === "inPerson" &&
        (s.type === "in-person" || s.type === "home")
      )
        return true;
      return false;
    });
  }, [viewingMedic, consultType]);

  useEffect(() => {
    if (!selectedServiceId) return;
    if (!servicesForType.some((s: any) => s.id === selectedServiceId)) {
      setSelectedServiceId(null);
    }
  }, [servicesForType, selectedServiceId]);

  // ─── Mode-aware price ────────────────────────────────
  const computedPrice = useMemo(() => {
    if (!viewingMedic) return 0;

    const baseAmount = selectedService
      ? Number(selectedService.price) || 0
      : bookingMode === "instant"
        ? Math.round(baseRate * instantHours)
        : Math.round(
            baseRate *
              (consultType === "inPerson"
                ? 1
                : selectedDuration
                  ? DURATION_HOURS[selectedDuration]
                  : 1),
          );

    let total = baseAmount;
    if (bookingMode === "instant") total += instantPremium;
    if (bookingMode === "emergency") total += emergencyPremium + urgentFee;

    return total;
  }, [
    viewingMedic,
    selectedService,
    bookingMode,
    consultType,
    selectedDuration,
    baseRate,
    instantHours,
    instantPremium,
    emergencyPremium,
    urgentFee,
  ]);

  const durationSummary = useMemo(() => {
    if (!viewingMedic) return "";
    if (bookingMode === "instant")
      return `${instantWindowMinutes} min instant call`;
    if (selectedService)
      return `${selectedService.durationMinutes} min · ${selectedService.name}`;
    if (consultType === "inPerson") return "1 hour home visit";
    if (!selectedDuration) return "Select a duration";
    return `${selectedDuration} online session`;
  }, [
    viewingMedic,
    bookingMode,
    instantWindowMinutes,
    selectedService,
    consultType,
    selectedDuration,
  ]);

  // ─── Auto-set booking date/time for instant/emergency ──
  // NOTE: Emergency starts NOW — the backend ignores the requested slot
  // and stamps scheduledAt = server time.
  const autoBookingDateTime = useMemo(() => {
    if (bookingMode === "instant") {
      const d = new Date();
      d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5, 0, 0);
      return { date: d, time: toTimeStr(d) };
    }
    if (bookingMode === "emergency") {
      const d = new Date();
      d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5, 0, 0);
      return { date: d, time: toTimeStr(d) };
    }
    return null;
  }, [bookingMode, viewingMedic]);

  // ─── Time slots (only for scheduled) ─────────────────
  const timeSlots = useMemo<TimeSlot[]>(() => {
    if (!viewingMedic || bookingMode !== "scheduled") return [];

    const all = generateTimeSlots(
      viewingMedic.availability?.hours?.start,
      viewingMedic.availability?.hours?.end,
    );

    if (!selectedDate) {
      return all.map((t) => ({ time: t, disabled: false }));
    }

    const now = new Date();
    const isToday = selectedDate.toDateString() === now.toDateString();
    if (!isToday) {
      return all.map((t) => ({ time: t, disabled: false }));
    }

    const minStart = new Date(now.getTime() + MIN_LEAD_MINUTES * 60 * 1000);
    return all.map((t) => {
      const [h, m] = t.split(":").map(Number);
      const slotTime = new Date(selectedDate);
      slotTime.setHours(h, m, 0, 0);
      return { time: t, disabled: slotTime < minStart };
    });
  }, [viewingMedic, selectedDate, bookingMode]);

  useEffect(() => {
    if (!selectedTime || bookingMode !== "scheduled") return;
    const slot = timeSlots.find((s) => s.time === selectedTime);
    if (!slot || slot.disabled) setSelectedTime("");
  }, [timeSlots, selectedTime, bookingMode]);

  const handleDateChange = (date: Date | null) => {
    setSelectedDate(date);
    setSelectedTime("");
  };

  const minDate = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    if (!viewingMedic) return t;
    const todaySlots = generateTimeSlots(
      viewingMedic.availability?.hours?.start,
      viewingMedic.availability?.hours?.end,
    );
    const now = new Date();
    const minStart = new Date(now.getTime() + MIN_LEAD_MINUTES * 60 * 1000);
    const hasToday = todaySlots.some((slot) => {
      const [h, m] = slot.split(":").map(Number);
      const st = new Date();
      st.setHours(h, m, 0, 0);
      return st >= minStart;
    });
    if (!hasToday) t.setDate(t.getDate() + 1);
    return t;
  }, [viewingMedic]);

  const maxDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d;
  }, []);

  const allSlotsTodayDisabled =
    !!selectedDate &&
    selectedDate.toDateString() === new Date().toDateString() &&
    timeSlots.length > 0 &&
    timeSlots.every((s) => s.disabled);

  // ─── Open modal with mode ────────────────────────────
  const openMedicModal = (medic: any, mode: BookingMode = "scheduled") => {
    let effectiveMode: BookingMode = mode;
    if (
      effectiveMode === "instant" &&
      !(medic.status === "online" && medic.instantTalk)
    ) {
      effectiveMode = "scheduled";
    }
    if (effectiveMode === "emergency" && medic.emergencyAvailable !== true) {
      effectiveMode = "scheduled";
    }
    if (effectiveMode === "instant" || effectiveMode === "emergency") {
      setSelectedServiceId(null);
      setSelectedDuration("");
      setConsultType("online");
    }
    setBookingMode(effectiveMode);
    setViewingMedic(medic);
  };

  // ─── Continue / canContinue per mode ─────────────────
  const canContinueSchedule = useMemo(() => {
    if (bookingMode === "instant") return true;
    if (bookingMode === "emergency") {
      if (consultType === "inPerson") return !!patientAddress.trim();
      return !!selectedServiceId || !!selectedDuration;
    }
    return (
      !!selectedDate &&
      !!selectedTime &&
      (consultType === "inPerson"
        ? !!patientAddress
        : selectedServiceId
          ? true
          : !!selectedDuration)
    );
  }, [
    bookingMode,
    consultType,
    patientAddress,
    selectedDate,
    selectedTime,
    selectedServiceId,
    selectedDuration,
  ]);

  // ─── Reset on open ───────────────────────────────────
  useEffect(() => {
    if (viewingMedic) {
      setBookingStep("details");
      setSelectedDate(null);
      setSelectedTime("");
      setSelectedDuration("");
      setSelectedServiceId(null);
      setPatientAddress(ssGet("medics:patientAddress") || "");

      if (bookingMode === "instant" || bookingMode === "emergency") {
        setConsultType("online");
      }
    }
  }, [viewingMedic]);

  // ─── Payment handler ─────────────────────────────────
  const handlePayment = async () => {
    if (typeof window === "undefined" || !viewingMedic) return;

    let dateStr: string;
    let timeStr: string;

    if (bookingMode === "instant" || bookingMode === "emergency") {
      if (!autoBookingDateTime) return;
      dateStr = toDateStr(autoBookingDateTime.date);
      timeStr = autoBookingDateTime.time;
    } else {
      if (!selectedDate || !selectedTime) {
        triggerNotify("Please pick a date and time first", "error");
        return;
      }
      dateStr = toDateStr(selectedDate);
      timeStr = selectedTime;
    }

    setIsProcessing(true);

    const finalDuration =
      bookingMode === "instant"
        ? `${instantWindowMinutes} min`
        : selectedService
          ? `${selectedService.durationMinutes} min`
          : consultType === "online"
            ? selectedDuration || "60 min"
            : "60 min";

    const finalReason =
      bookingMode === "emergency"
        ? selectedService
          ? `Emergency · ${selectedService.name}`
          : "Emergency consultation"
        : bookingMode === "instant"
          ? `Instant call · ${instantWindowMinutes}m`
          : selectedService
            ? `${selectedService.name}${
                consultType === "inPerson" ? " (in-person)" : " (online)"
              }`
            : consultType === "online"
              ? "Online consultation"
              : "In-person consultation";

    const priceBreakdown = {
      baseRate,
      servicePrice: selectedService ? Number(selectedService.price) || 0 : 0,
      urgentFee: bookingMode === "emergency" ? urgentFee : 0,
      emergencyPremium: bookingMode === "emergency" ? emergencyPremium : 0,
      instantTalkPremium: bookingMode === "instant" ? instantPremium : 0,
      homeVisitFee: 0,
      followUpDiscountPct: 0,
      durationHours:
        bookingMode === "instant"
          ? instantHours
          : selectedService
            ? selectedService.durationMinutes / 60
            : consultType === "inPerson"
              ? 1
              : selectedDuration
                ? DURATION_HOURS[selectedDuration]
                : 1,
      total: computedPrice,
    };

    try {
      const PaystackPop = (await import("@paystack/inline-js")).default;
      const paystack = new PaystackPop();
      const paystackOptions: any = {
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "",
        email: user?.email || "patient@doza.health",
        amount: computedPrice * 100,
        currency: "NGN",
        onSuccess: async (response: any) => {
          const paymentReference = response?.reference || null;

          try {
            const result = await authPost("/api/appointments", {
              medicId: viewingMedic.id,
              medicName: viewingMedic.name,
              medicProfileImage: viewingMedic.profileImage || null,
              medicSpecialty: viewingMedic.specialty || null,

              date: dateStr,
              time: timeStr,

              consultType: bookingMode === "instant" ? "online" : consultType,
              duration: finalDuration,
              address:
                consultType === "inPerson" && bookingMode !== "instant"
                  ? patientAddress.trim() || null
                  : null,
              amount: computedPrice,
              paymentReference,

              reason: finalReason,
              notes: null,

              serviceId: selectedServiceId,
              serviceName: selectedService?.name || null,

              instantTalk: bookingMode === "instant",
              emergency: bookingMode === "emergency",

              priceBreakdown,
            });

            if (result.success) {
              const label =
                bookingMode === "emergency"
                  ? "Emergency confirmed — session starting now."
                  : bookingMode === "instant"
                    ? "Instant call confirmed."
                    : `Booking with ${viewingMedic.name} confirmed.`;
              triggerNotify(label, "success");

              // ── Auto-open chat for emergencies ──
              if (bookingMode === "emergency") {
                const appointmentId = result.data?.id;
                if (appointmentId) {
                  try {
                    sessionStorage.setItem("doza_open_chat_id", appointmentId);
                  } catch {}
                  try {
                    window.dispatchEvent(
                      new CustomEvent("doza:open-chat", {
                        detail: { appointmentId },
                      }),
                    );
                  } catch {}
                }
              }

              setViewingMedic(null);
              await mutate("/api/appointments").catch(() => {});
              setTimeout(() => {
                setActivePanel("appointment");
              }, 800);
            } else {
              triggerNotify(
                result.error ||
                  "Payment captured but booking failed. Contact support.",
                "error",
              );
            }
          } catch {
            triggerNotify(
              "Payment captured but save failed. Contact support with your Paystack receipt.",
              "error",
            );
          } finally {
            setIsProcessing(false);
          }
        },
        onCancel: () => {
          setIsProcessing(false);
          triggerNotify("Payment cancelled", "error");
        },
      };

      paystack.newTransaction(paystackOptions);
    } catch {
      triggerNotify(
        "Payment service unavailable. Please try again later.",
        "error",
      );
      setIsProcessing(false);
    }
  };

  // ─── Mode chip label ─────────────────────────────────
  const modeLabel =
    bookingMode === "emergency"
      ? "Emergency"
      : bookingMode === "instant"
        ? "Instant talk"
        : "Scheduled";

  const modeColor =
    bookingMode === "emergency"
      ? "bg-rose-500 text-white"
      : bookingMode === "instant"
        ? "bg-emerald-600 text-white"
        : "bg-slate-900 text-white";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "min-h-screen bg-[#F8FAFC] pb-28 pt-2 text-slate-900",
        poppins.className,
      )}
    >
      <style jsx global>{`
        .react-datepicker {
          border: none !important;
          border-radius: 16px !important;
          box-shadow: 0 20px 40px -15px rgba(5, 150, 105, 0.15) !important;
          font-family: inherit !important;
          padding: 16px !important;
          background: white !important;
          width: 100% !important;
        }
        .react-datepicker__header {
          background: white !important;
          border-bottom: 1px solid #ecfdf5 !important;
          padding-top: 8px !important;
        }
        .react-datepicker__current-month {
          font-weight: 700 !important;
          font-size: 0.9rem !important;
          color: #064e3b !important;
        }
        .react-datepicker__day-name {
          color: #059669 !important;
          font-weight: 600 !important;
          font-size: 0.75rem !important;
        }
        .react-datepicker__day {
          font-weight: 500 !important;
          border-radius: 10px !important;
          transition: all 0.2s !important;
          color: #047857 !important;
        }
        .react-datepicker__day:hover {
          background-color: #ecfdf5 !important;
          color: #059669 !important;
        }
        .react-datepicker__day--selected {
          background-color: #059669 !important;
          color: white !important;
          box-shadow: 0 4px 12px rgba(5, 150, 105, 0.25) !important;
        }
        .react-datepicker__day--disabled {
          color: #a7f3d0 !important;
        }
        .react-datepicker__navigation {
          top: 20px !important;
          min-height: 44px !important;
          min-width: 44px !important;
        }
        @media (max-width: 640px) {
          .react-datepicker__day,
          .react-datepicker__day-name {
            width: 2.75rem !important;
            line-height: 2.75rem !important;
            margin: 0.1rem !important;
          }
        }
      `}</style>

      {/* Toast — Lucide icons, no text characters */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={cn(
              "fixed top-20 sm:top-6 left-1/2 -translate-x-1/2 z-[300] px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 font-semibold text-sm tracking-wide max-w-[calc(100vw-2rem)]",
              notification.type === "success"
                ? "bg-emerald-600 text-white"
                : "bg-rose-600 text-white",
            )}
            role="alert"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 shrink-0">
              {notification.type === "success" ? (
                <CheckCircle2 size={12} className="text-white" />
              ) : (
                <AlertCircle size={12} className="text-white" />
              )}
            </span>
            <span className="truncate">{notification.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="mx-auto max-w-7xl px-4 pt-3 sm:px-6 lg:px-8 space-y-4 lg:space-y-5">
        <header className="pt-1 lg:pt-2 flex flex-col gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight leading-tight">
              Doza Medics
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md">
              Verified healthcare professionals on demand.
            </p>
          </div>
        </header>

        <nav className="flex overflow-x-auto gap-1 p-1 bg-emerald-50 rounded-2xl border border-emerald-100 w-full md:w-fit scrollbar-none [&::-webkit-scrollbar]:hidden">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "flex items-center gap-1.5 min-h-10 px-3 rounded-xl text-xs font-semibold transition-all shrink-0",
                selectedCategory === cat.id
                  ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20"
                  : "text-emerald-700/80 hover:bg-white hover:text-emerald-800",
                FOCUS,
              )}
            >
              {cat.icon}
              <span>{cat.label}</span>
            </button>
          ))}
        </nav>

        <section>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-700/70">
              Available Specialists {!isColdStart && `(${medics.length})`}
            </h2>
          </div>

          {isColdStart ? (
            // ── Bento 2-per-row skeleton grid on mobile ──
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 md:gap-3 lg:gap-4">
              {[...Array(6)].map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : medics.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 gap-3 bg-white rounded-2xl border border-emerald-100 shadow-xs text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-1">
                <Stethoscope size={26} />
              </div>
              <p className="text-base font-bold text-emerald-900">
                No professionals found
              </p>
              <p className="text-sm text-emerald-700/70 max-w-xs mx-auto leading-relaxed">
                We could not find any active specialists in this category right
                now. Try switching to a different category.
              </p>
            </div>
          ) : (
            // ── Bento 2-per-row grid on mobile, 3 on md+ ──
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 md:gap-3 lg:gap-4">
              {medics.map((m: any) => (
                <MedicCard
                  key={m.id}
                  medic={m}
                  onOpen={(mode: BookingMode) => openMedicModal(m, mode)}
                  isComparing={compareList.some((c) => c.id === m.id)}
                  onCompare={() => {
                    if (compareList.find((c) => c.id === m.id)) {
                      setCompareList(compareList.filter((c) => c.id !== m.id));
                    } else if (compareList.length < 3) {
                      setCompareList([...compareList, m]);
                    } else {
                      triggerNotify(
                        "You can compare up to 3 medics at a time",
                        "error",
                      );
                    }
                  }}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Compare tray */}
      <AnimatePresence>
        {compareList.length > 0 && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-24 sm:bottom-6 inset-x-0 z-[110] flex justify-center px-4 pointer-events-none"
          >
            <div className="pointer-events-auto bg-emerald-700 text-white rounded-2xl shadow-2xl shadow-emerald-900/30 px-3 sm:px-4 py-2.5 flex items-center gap-2.5 sm:gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-emerald-200 uppercase tracking-wider hidden sm:inline">
                  Comparing:
                </span>
                <div className="flex -space-x-2">
                  {compareList.map((m) => (
                    <MedicAvatar
                      key={m.id}
                      src={m.profileImage}
                      name={m.name}
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-emerald-700 shadow"
                      textClassName="text-[10px] sm:text-[11px]"
                    />
                  ))}
                </div>
              </div>
              <div className="h-6 w-px bg-emerald-500/60" />
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  onClick={() => setShowCompareModal(true)}
                  className={cn(
                    "min-h-9 px-3 rounded-xl bg-white text-emerald-700 hover:bg-emerald-50 text-xs font-bold tracking-wide transition-colors",
                    FOCUS,
                  )}
                >
                  View ({compareList.length}/3)
                </button>
                <button
                  onClick={() => setCompareList([])}
                  aria-label="Clear comparison"
                  className={cn(
                    "min-h-9 min-w-9 inline-flex items-center justify-center rounded-xl text-emerald-200 hover:text-white hover:bg-emerald-800 transition-colors",
                    FOCUS,
                  )}
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Compare modal */}
      <AnimatePresence>
        {showCompareModal && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCompareModal(false)}
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
              aria-hidden
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden p-4 sm:p-6 max-h-[88vh] flex flex-col border border-emerald-100"
              role="dialog"
              aria-modal="true"
            >
              <div className="flex justify-between items-center pb-3 border-b border-emerald-100 gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold text-emerald-900 leading-tight">
                    Professional Comparison
                  </h2>
                  <p className="text-xs text-emerald-700/70">
                    Side-by-side breakdown
                  </p>
                </div>
                <button
                  onClick={() => setShowCompareModal(false)}
                  aria-label="Close"
                  className={cn(
                    "min-h-10 min-w-10 inline-flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors shrink-0",
                    FOCUS,
                  )}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="overflow-x-auto py-3 flex-1 custom-emerald-scrollbar">
                <table className="w-full text-left border-collapse min-w-[520px]">
                  <thead>
                    <tr className="border-b border-emerald-100">
                      <th className="pb-3 text-[10px] font-bold text-emerald-700/70 uppercase">
                        Attributes
                      </th>
                      {compareList.map((m) => (
                        <th key={m.id} className="pb-3 px-3 text-center">
                          <MedicAvatar
                            src={m.profileImage}
                            name={m.name}
                            className="w-14 h-14 rounded-2xl mx-auto mb-2 shadow-sm border border-emerald-100"
                            textClassName="text-lg"
                          />
                          <p className="text-sm font-bold text-emerald-900 truncate">
                            {m.name}
                          </p>
                          <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mt-0.5">
                            {m.specialty}
                          </p>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-emerald-100">
                    <CompareRow
                      label="Experience"
                      values={compareList.map((m) => `${m.experience} years`)}
                    />
                    <CompareRow
                      label="Location"
                      values={compareList.map((m) => m.city)}
                    />
                    <CompareRow
                      label="Languages"
                      values={compareList.map(
                        (m) => m.languages?.join(", ") || "English",
                      )}
                    />
                    <CompareRow
                      label="Rate"
                      values={compareList.map(
                        (m) => `${formatNaira(Number(m.price) || 0)}/hr`,
                      )}
                      isPrice
                    />
                    <CompareRow
                      label="Rating"
                      values={compareList.map((m) =>
                        formatRatingValue(m.ratingAverage, m.ratingCount),
                      )}
                    />
                    <CompareRow
                      label="Action"
                      values={compareList.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => {
                            openMedicModal(m, "scheduled");
                            setShowCompareModal(false);
                          }}
                          className={cn(
                            "w-full min-h-9 px-3 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors",
                            FOCUS,
                          )}
                        >
                          Select
                        </button>
                      ))}
                      isButton
                    />
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Booking modal */}
      <AnimatePresence>
        {viewingMedic && (
          <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingMedic(null)}
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
              aria-hidden
            />
            <motion.div
              initial={{ scale: 0.98, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.98, opacity: 0, y: 20 }}
              className="relative bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[92dvh] sm:max-h-[90vh] flex flex-col border border-emerald-100 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-0"
              role="dialog"
              aria-modal="true"
            >
              <div className="sm:hidden flex justify-center pt-3" aria-hidden>
                <div className="w-10 h-1 rounded-full bg-emerald-200" />
              </div>

              <div className="px-4 sm:px-5 py-3 border-b border-emerald-100 bg-white sticky top-0 z-20 shrink-0">
                <div className="flex justify-between items-center gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <MedicAvatar
                      src={viewingMedic.profileImage}
                      name={viewingMedic.name}
                      className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl border border-emerald-100 shrink-0"
                      textClassName="text-sm sm:text-base"
                    />
                    <div className="min-w-0">
                      <h2 className="text-base sm:text-lg font-bold text-emerald-900 leading-tight truncate">
                        {viewingMedic.name}
                      </h2>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span
                          className={cn(
                            "text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md",
                            modeColor,
                          )}
                        >
                          {modeLabel}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider bg-emerald-50 px-1.5 py-0.5 rounded-md">
                          {viewingMedic.specialty}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setViewingMedic(null)}
                    aria-label="Close"
                    className={cn(
                      "min-h-10 min-w-10 inline-flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors shrink-0",
                      FOCUS,
                    )}
                  >
                    <X size={18} />
                  </button>
                </div>

                {bookingStep === "details" &&
                  (viewingMedic.emergencyAvailable ||
                    (viewingMedic.status === "online" &&
                      viewingMedic.instantTalk)) && (
                    <div className="flex gap-1.5 mt-2.5 flex-wrap">
                      {viewingMedic.status === "online" &&
                        viewingMedic.instantTalk && (
                          <button
                            onClick={() => {
                              setBookingMode("instant");
                              setConsultType("online");
                              setSelectedServiceId(null);
                              setSelectedDuration("");
                              setBookingStep("schedule");
                            }}
                            className={cn(
                              "flex-1 min-h-9 px-3 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-colors",
                              bookingMode === "instant"
                                ? "bg-emerald-600 text-white"
                                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200",
                              FOCUS,
                            )}
                          >
                            <span className="inline-flex items-center gap-1.5">
                              <Zap size={11} />
                              Talk now
                            </span>
                          </button>
                        )}
                      {viewingMedic.emergencyAvailable && (
                        <button
                          onClick={() => {
                            setBookingMode("emergency");
                            setConsultType("online");
                            setSelectedServiceId(null);
                            setSelectedDuration("");
                            setBookingStep("schedule");
                          }}
                          className={cn(
                            "flex-1 min-h-9 px-3 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-colors",
                            bookingMode === "emergency"
                              ? "bg-rose-500 text-white"
                              : "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200",
                            FOCUS,
                          )}
                        >
                          <span className="inline-flex items-center gap-1.5">
                            <AlertCircle size={11} />
                            Emergency
                          </span>
                        </button>
                      )}
                    </div>
                  )}
              </div>

              <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 custom-emerald-scrollbar">
                <div className="flex gap-1 p-1 bg-emerald-50 rounded-xl border border-emerald-100">
                  {[
                    { id: "details", label: "1. Profile" },
                    {
                      id: "schedule",
                      label:
                        bookingMode === "instant"
                          ? "2. Confirm"
                          : bookingMode === "emergency"
                            ? "2. Urgent"
                            : "2. Schedule",
                    },
                    { id: "payment", label: "3. Payment" },
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        if (s.id === "details") setBookingStep("details");
                        if (s.id === "schedule" && bookingStep !== "details")
                          setBookingStep("schedule");
                      }}
                      className={cn(
                        "flex-1 min-h-9 text-[11px] sm:text-xs font-semibold rounded-lg transition-all text-center",
                        bookingStep === s.id
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "text-emerald-700/70 hover:text-emerald-900",
                        FOCUS,
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                {bookingStep === "details" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <DetailBox
                        label="Experience"
                        value={`${viewingMedic.experience} yrs`}
                      />
                      <DetailBox
                        label="Languages"
                        value={viewingMedic.languages?.[0] || "English"}
                      />
                      <DetailBox label="Location" value={viewingMedic.city} />
                      <DetailBox
                        label="Rating"
                        value={formatRatingValue(
                          viewingMedic.ratingAverage,
                          viewingMedic.ratingCount,
                        )}
                      />
                    </div>
                    <div className="space-y-1.5 bg-emerald-50 p-3.5 rounded-xl border border-emerald-100">
                      <h4 className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldCheck size={14} />
                        Professional Bio
                      </h4>
                      <p className="text-xs sm:text-sm text-emerald-700/80 leading-relaxed">
                        {viewingMedic.bio ||
                          "No biography provided for this professional."}
                      </p>
                    </div>

                    <ReviewsSection medicId={viewingMedic.id} />

                    <div className="flex items-center justify-between gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                        Hourly rate
                      </span>
                      <span className="text-base font-bold text-emerald-900 tabular-nums">
                        {formatNaira(baseRate)} / hr
                      </span>
                    </div>

                    {bookingMode === "scheduled" &&
                      (viewingMedic.status === "online" ||
                        viewingMedic.emergencyAvailable) && (
                        <div className="grid grid-cols-2 gap-2">
                          {viewingMedic.status === "online" &&
                            viewingMedic.instantTalk && (
                              <button
                                onClick={() => {
                                  setBookingMode("instant");
                                  setConsultType("online");
                                  setSelectedServiceId(null);
                                  setSelectedDuration("");
                                  setBookingStep("schedule");
                                }}
                                className={cn(
                                  "min-h-11 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition-colors shadow-sm flex items-center justify-center gap-1.5",
                                  FOCUS,
                                )}
                              >
                                <Zap size={14} /> Talk now
                              </button>
                            )}
                          {viewingMedic.emergencyAvailable && (
                            <button
                              onClick={() => {
                                setBookingMode("emergency");
                                setConsultType("online");
                                setSelectedServiceId(null);
                                setSelectedDuration("");
                                setBookingStep("schedule");
                              }}
                              className={cn(
                                "min-h-11 rounded-xl bg-rose-500 text-white font-bold text-sm hover:bg-rose-600 transition-colors shadow-sm flex items-center justify-center gap-1.5",
                                FOCUS,
                              )}
                            >
                              <AlertCircle size={14} /> Emergency
                            </button>
                          )}
                        </div>
                      )}

                    <button
                      onClick={() => setBookingStep("schedule")}
                      className={cn(
                        "w-full min-h-11 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors shadow-sm",
                        FOCUS,
                      )}
                    >
                      {bookingMode === "instant"
                        ? "Confirm Instant Call"
                        : bookingMode === "emergency"
                          ? "Confirm Emergency"
                          : "Continue to Scheduling"}
                    </button>
                  </div>
                )}

                {bookingStep === "schedule" && (
                  <div className="space-y-4">
                    {bookingMode === "instant" && (
                      <>
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center shrink-0">
                              <Zap size={16} className="text-white" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-emerald-900">
                                Starting in ~5 minutes
                              </p>
                              <p className="text-[11px] text-emerald-700/70">
                                {viewingMedic.name} will call you shortly
                              </p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <InfoTile
                              label="Session"
                              value={`${instantWindowMinutes} min`}
                            />
                            <InfoTile label="Type" value="Online call" />
                          </div>
                        </div>

                        <PriceBreakdownCard
                          rows={[
                            {
                              label: `Base rate × ${instantHours}h`,
                              value: formatNaira(
                                Math.round(baseRate * instantHours),
                              ),
                            },
                            ...(instantPremium > 0
                              ? [
                                  {
                                    label: "Instant premium",
                                    value: formatNaira(instantPremium),
                                  },
                                ]
                              : []),
                          ]}
                          total={computedPrice}
                        />

                        <button
                          disabled={!canContinueSchedule}
                          onClick={() => setBookingStep("payment")}
                          className={cn(
                            "w-full min-h-11 bg-emerald-600 text-white rounded-xl font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-700 transition-colors shadow-sm",
                            FOCUS,
                          )}
                        >
                          Confirm and pay {formatNaira(computedPrice)}
                        </button>

                        <button
                          onClick={() => {
                            setBookingMode("scheduled");
                            setBookingStep("details");
                          }}
                          className="w-full text-[11px] font-bold text-slate-500 hover:text-slate-700 py-1"
                        >
                          <span className="inline-flex items-center gap-1">
                            <ArrowLeft size={11} /> Back to scheduling
                          </span>
                        </button>
                      </>
                    )}

                    {bookingMode === "emergency" && (
                      <>
                        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="w-9 h-9 rounded-lg bg-rose-500 flex items-center justify-center shrink-0">
                              <AlertCircle size={16} className="text-white" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-rose-900">
                                Emergency request (STAT)
                              </p>
                              <p className="text-[11px] text-rose-700/80">
                                We will notify {viewingMedic.name} right now.
                                Your session starts immediately.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setConsultType("online")}
                            className={cn(
                              "flex items-center gap-2 p-2.5 rounded-xl border-2 transition-all text-left min-h-[64px]",
                              consultType === "online"
                                ? "border-rose-500 bg-rose-50"
                                : "border-slate-200 bg-white hover:border-rose-200",
                              FOCUS,
                            )}
                          >
                            <Video
                              size={16}
                              className="text-rose-600 shrink-0"
                            />
                            <div className="min-w-0">
                              <span className="block text-xs font-bold text-slate-900">
                                Online
                              </span>
                              <span className="block text-[10px] text-slate-500">
                                Video call now
                              </span>
                            </div>
                          </button>
                          <button
                            onClick={() => setConsultType("inPerson")}
                            className={cn(
                              "flex items-center gap-2 p-2.5 rounded-xl border-2 transition-all text-left min-h-[64px]",
                              consultType === "inPerson"
                                ? "border-rose-500 bg-rose-50"
                                : "border-slate-200 bg-white hover:border-rose-200",
                              FOCUS,
                            )}
                          >
                            <Home
                              size={16}
                              className="text-rose-600 shrink-0"
                            />
                            <div className="min-w-0">
                              <span className="block text-xs font-bold text-slate-900">
                                In-Person
                              </span>
                              <span className="block text-[10px] text-slate-500">
                                Home visit
                              </span>
                            </div>
                          </button>
                        </div>

                        {consultType === "inPerson" && (
                          <div className="space-y-1.5">
                            <label
                              htmlFor="emergency-address"
                              className="block text-[10px] font-bold text-rose-700 uppercase tracking-wider"
                            >
                              Your address (required)
                            </label>
                            <input
                              id="emergency-address"
                              type="text"
                              value={patientAddress}
                              onChange={(e) =>
                                setPatientAddress(e.target.value)
                              }
                              placeholder="e.g., 14 Admiralty Way, Lekki"
                              className={cn(
                                "w-full min-h-11 px-3.5 bg-rose-50/50 border border-rose-100 text-slate-900 rounded-xl text-base sm:text-sm focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/15 outline-none transition",
                                FOCUS,
                              )}
                            />
                          </div>
                        )}

                        {consultType === "online" && (
                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-rose-700 uppercase tracking-wider">
                              Duration
                            </label>
                            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                              {DURATIONS.map((d) => (
                                <button
                                  key={d}
                                  onClick={() => setSelectedDuration(d)}
                                  className={cn(
                                    "min-h-10 px-2 rounded-xl text-xs font-bold transition-colors border",
                                    selectedDuration === d
                                      ? "bg-rose-500 text-white border-rose-500"
                                      : "bg-white text-slate-700 border-slate-200 hover:bg-rose-50",
                                    FOCUS,
                                  )}
                                >
                                  {d}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <PriceBreakdownCard
                          rows={[
                            {
                              label: "Base rate",
                              value: formatNaira(
                                Math.round(
                                  baseRate *
                                    (consultType === "online" &&
                                    selectedDuration
                                      ? DURATION_HOURS[selectedDuration]
                                      : 1),
                                ),
                              ),
                            },
                            ...(emergencyPremium > 0
                              ? [
                                  {
                                    label: "Emergency premium",
                                    value: formatNaira(emergencyPremium),
                                  },
                                ]
                              : []),
                            ...(urgentFee > 0
                              ? [
                                  {
                                    label: "Urgent fee",
                                    value: formatNaira(urgentFee),
                                  },
                                ]
                              : []),
                          ]}
                          total={computedPrice}
                        />

                        <button
                          disabled={!canContinueSchedule}
                          onClick={() => setBookingStep("payment")}
                          className={cn(
                            "w-full min-h-11 bg-rose-500 text-white rounded-xl font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-rose-600 transition-colors shadow-sm",
                            FOCUS,
                          )}
                        >
                          Continue Emergency Booking
                        </button>

                        <button
                          onClick={() => {
                            setBookingMode("scheduled");
                            setBookingStep("details");
                          }}
                          className="w-full text-[11px] font-bold text-slate-500 hover:text-slate-700 py-1"
                        >
                          <span className="inline-flex items-center gap-1">
                            <ArrowLeft size={11} /> Back to scheduling
                          </span>
                        </button>
                      </>
                    )}

                    {bookingMode === "scheduled" && (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setConsultType("inPerson")}
                            className={cn(
                              "flex items-center gap-2 p-2.5 rounded-xl border-2 transition-all text-left min-h-[68px]",
                              consultType === "inPerson"
                                ? "border-emerald-500 bg-emerald-50"
                                : "border-emerald-100 bg-white hover:border-emerald-200",
                              FOCUS,
                            )}
                          >
                            <div
                              className={cn(
                                "p-1.5 rounded-lg shrink-0",
                                consultType === "inPerson"
                                  ? "bg-emerald-600 text-white"
                                  : "bg-emerald-50 text-emerald-600",
                              )}
                            >
                              <Home size={16} />
                            </div>
                            <div className="min-w-0">
                              <span className="block text-xs font-bold text-emerald-900">
                                In-Person
                              </span>
                              <span className="block text-[10px] text-emerald-700/70">
                                1 hr home visit
                              </span>
                            </div>
                          </button>
                          <button
                            onClick={() => setConsultType("online")}
                            className={cn(
                              "flex items-center gap-2 p-2.5 rounded-xl border-2 transition-all text-left min-h-[68px]",
                              consultType === "online"
                                ? "border-emerald-500 bg-emerald-50"
                                : "border-emerald-100 bg-white hover:border-emerald-200",
                              FOCUS,
                            )}
                          >
                            <div
                              className={cn(
                                "p-1.5 rounded-lg shrink-0",
                                consultType === "online"
                                  ? "bg-emerald-600 text-white"
                                  : "bg-emerald-50 text-emerald-600",
                              )}
                            >
                              <Video size={16} />
                            </div>
                            <div className="min-w-0">
                              <span className="block text-xs font-bold text-emerald-900">
                                Online Call
                              </span>
                              <span className="block text-[10px] text-emerald-700/70">
                                Pick a duration
                              </span>
                            </div>
                          </button>
                        </div>

                        {servicesForType.length > 0 && (
                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                              <CheckCircle2 size={12} />
                              Service package (optional)
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {servicesForType.map((s: any) => {
                                const active = selectedServiceId === s.id;
                                return (
                                  <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => {
                                      if (active) {
                                        setSelectedServiceId(null);
                                      } else {
                                        setSelectedServiceId(s.id);
                                        setSelectedDuration("");
                                      }
                                    }}
                                    className={cn(
                                      "p-2.5 rounded-xl border-2 text-left transition-all",
                                      active
                                        ? "border-emerald-500 bg-emerald-50"
                                        : "border-emerald-100 bg-white hover:border-emerald-200",
                                      FOCUS,
                                    )}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0 flex-1">
                                        <p className="text-xs font-bold text-emerald-900 truncate">
                                          {s.name}
                                        </p>
                                        <p className="text-[10px] text-emerald-700/70 mt-0.5">
                                          {s.durationMinutes}m ·{" "}
                                          {formatNaira(Number(s.price) || 0)}
                                        </p>
                                      </div>
                                      {active && (
                                        <div className="shrink-0 w-4 h-4 rounded-full bg-emerald-600 flex items-center justify-center">
                                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                        </div>
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {consultType === "inPerson" && (
                          <div className="space-y-1.5">
                            <label
                              htmlFor="patient-address"
                              className="block text-[10px] font-bold text-emerald-700 uppercase tracking-wider"
                            >
                              Patient residential address
                            </label>
                            <input
                              id="patient-address"
                              type="text"
                              value={patientAddress}
                              onChange={(e) =>
                                setPatientAddress(e.target.value)
                              }
                              placeholder="e.g., 14 Admiralty Way, Lekki"
                              autoComplete="street-address"
                              className={cn(
                                "w-full min-h-11 px-3.5 bg-emerald-50/50 border border-emerald-100 text-emerald-900 rounded-xl text-base sm:text-sm focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 outline-none transition",
                                FOCUS,
                              )}
                            />
                          </div>
                        )}

                        {consultType === "online" && !selectedService && (
                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                              Consultation duration
                            </label>
                            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                              {DURATIONS.map((d) => (
                                <button
                                  key={d}
                                  onClick={() => setSelectedDuration(d)}
                                  className={cn(
                                    "min-h-10 px-2 rounded-xl text-xs font-bold transition-colors border",
                                    selectedDuration === d
                                      ? "bg-emerald-600 text-white border-emerald-600"
                                      : "bg-white text-emerald-700 border-emerald-100 hover:bg-emerald-50",
                                    FOCUS,
                                  )}
                                >
                                  {d}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                            Appointment date
                          </label>
                          <div className="relative">
                            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-600 z-10 pointer-events-none">
                              <CalendarIcon size={16} />
                            </div>
                            <DatePicker
                              selected={selectedDate}
                              onChange={handleDateChange}
                              minDate={minDate}
                              maxDate={maxDate}
                              dateFormat="MMMM d, yyyy"
                              placeholderText="Select date"
                              className="w-full min-h-11 pl-10 pr-4 bg-emerald-50/50 text-emerald-900 font-semibold border border-emerald-100 rounded-xl text-base sm:text-sm focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 outline-none cursor-pointer"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                            Available time slot
                          </label>
                          {!selectedDate ? (
                            <p className="text-xs text-slate-500 italic px-1">
                              Select a date to see available times.
                            </p>
                          ) : allSlotsTodayDisabled ? (
                            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                              <AlertCircle
                                size={14}
                                className="shrink-0 mt-0.5 text-amber-600"
                              />
                              <span>
                                No more slots available today. Please pick
                                another date.
                              </span>
                            </div>
                          ) : (
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                              {timeSlots.map(({ time: t, disabled }) => {
                                const isSelected = selectedTime === t;
                                return (
                                  <button
                                    key={t}
                                    type="button"
                                    onClick={() =>
                                      !disabled && setSelectedTime(t)
                                    }
                                    disabled={disabled}
                                    aria-disabled={disabled}
                                    className={cn(
                                      "min-h-10 rounded-xl text-xs font-semibold border transition-colors relative",
                                      disabled
                                        ? "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed line-through"
                                        : isSelected
                                          ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                                          : "border-emerald-100 bg-white text-emerald-700 hover:bg-emerald-50",
                                      FOCUS,
                                    )}
                                  >
                                    {t}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        <button
                          disabled={!canContinueSchedule}
                          onClick={() => setBookingStep("payment")}
                          className={cn(
                            "w-full min-h-11 bg-emerald-600 text-white rounded-xl font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-700 transition-colors shadow-sm",
                            FOCUS,
                          )}
                        >
                          Continue to Payment
                        </button>
                      </>
                    )}
                  </div>
                )}

                {bookingStep === "payment" && (
                  <div className="space-y-4">
                    <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl space-y-3">
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                          Total Payable Fee
                        </span>
                        <span className="text-xl sm:text-2xl font-bold text-emerald-900 tabular-nums">
                          {formatNaira(computedPrice)}
                        </span>
                      </div>
                      <div className="h-px bg-emerald-200" />
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-[10px] font-bold text-emerald-700/70 uppercase tracking-wider">
                            Mode
                          </p>
                          <p className="font-semibold text-emerald-900 mt-0.5">
                            {modeLabel}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-emerald-700/70 uppercase tracking-wider">
                            Duration
                          </p>
                          <p className="font-semibold text-emerald-900 mt-0.5">
                            {durationSummary}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-[10px] font-bold text-emerald-700/70 uppercase tracking-wider">
                            When
                          </p>
                          <p className="font-semibold text-emerald-900 mt-0.5">
                            {bookingMode === "instant"
                              ? `Starting in ~5 min (${autoBookingDateTime?.time})`
                              : bookingMode === "emergency"
                                ? `Starting now (${autoBookingDateTime?.time})`
                                : `${selectedDate?.toLocaleDateString()} @ ${selectedTime}`}
                          </p>
                        </div>
                        {consultType === "inPerson" &&
                          bookingMode !== "instant" && (
                            <div className="col-span-2">
                              <p className="text-[10px] font-bold text-emerald-700/70 uppercase tracking-wider">
                                Address
                              </p>
                              <p className="font-semibold text-emerald-900 mt-0.5 truncate">
                                {patientAddress}
                              </p>
                            </div>
                          )}
                      </div>
                    </div>
                    <button
                      onClick={handlePayment}
                      disabled={isProcessing}
                      className={cn(
                        "w-full min-h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed",
                        FOCUS,
                      )}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="animate-spin" size={16} />
                          <span>Opening checkout...</span>
                        </>
                      ) : (
                        <span>
                          Pay {formatNaira(computedPrice)} with Paystack
                        </span>
                      )}
                    </button>
                    <p className="text-[10px] text-center text-slate-500">
                      Secure checkout · Powered by Paystack
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Subcomponents ────────────────────────────────────
// Bento-style compact card. On mobile this sits in a 2-col grid so it
// needs to work at ~170px wide: square image, tight overlays, one-row
// footer with a chevron-only Book pill.
function MedicCard({ medic, onOpen, isComparing, onCompare }: any) {
  const hourly = Number(medic.price) || 0;
  const hasRating = Number(medic.ratingCount) > 0;
  const isOnline = medic.status === "online";
  const isOnLeave = medic.status === "on-leave";
  const hasInstantTalk = isOnline && medic.instantTalk === true;
  const hasEmergency = medic.emergencyAvailable === true;

  return (
    <div
      onClick={() => onOpen("scheduled")}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen("scheduled");
        }
      }}
      className={cn(
        "group relative w-full overflow-hidden rounded-2xl sm:rounded-3xl bg-white",
        "border border-emerald-100 shadow-xs transition-all duration-300 cursor-pointer",
        "hover:-translate-y-0.5 hover:shadow-lg hover:border-emerald-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2",
      )}
    >
      <div className="relative aspect-square sm:aspect-[4/5] w-full overflow-hidden bg-emerald-100">
        {medic.profileImage ? (
          <img
            src={medic.profileImage}
            alt={medic.name}
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 transition-transform duration-500 ease-out group-hover:scale-105">
            <span className="text-5xl sm:text-7xl font-bold text-white tracking-tight select-none">
              {getInitials(medic.name)}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-emerald-950/40 to-transparent" />

        {/* Status badges — compact on mobile */}
        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex flex-col items-start gap-1 sm:gap-1.5 max-w-[calc(100%-3rem)]">
          {isOnline && (
            <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full bg-emerald-500 text-white shadow-sm shadow-emerald-900/20 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">
              <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-white animate-pulse" />
              <span className="hidden sm:inline">Available now</span>
              <span className="sm:hidden">Online</span>
            </span>
          )}
          {isOnLeave && (
            <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full bg-slate-600 text-white shadow-sm text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">
              On leave
            </span>
          )}
          {hasEmergency && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpen("emergency");
              }}
              className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full bg-rose-500 text-white shadow-sm text-[9px] sm:text-[10px] font-bold uppercase tracking-wider hover:bg-rose-600 transition-colors"
              title="Request emergency visit"
            >
              <AlertCircle size={9} className="sm:w-[10px] sm:h-[10px]" />
              <span className="hidden sm:inline">Emergency</span>
              <span className="sm:hidden">STAT</span>
            </button>
          )}
          {hasRating && (
            <div className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full bg-white/90 backdrop-blur-md shadow-sm border border-white/60">
              <Star
                size={9}
                className="fill-amber-400 text-amber-400 sm:w-[11px] sm:h-[11px]"
              />
              <span className="text-[10px] sm:text-[11px] font-bold text-emerald-900 tabular-nums leading-none">
                {Number(medic.ratingAverage).toFixed(1)}
              </span>
              <span className="hidden sm:inline text-[10px] text-emerald-700/60 leading-none">
                ({medic.ratingCount})
              </span>
            </div>
          )}
        </div>

        {/* Compare button — smaller on mobile */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCompare();
          }}
          aria-label={
            isComparing ? "Remove from comparison" : "Add to comparison"
          }
          title="Compare professional"
          className={cn(
            "absolute top-2 right-2 sm:top-3 sm:right-3 w-8 h-8 sm:w-10 sm:h-10 inline-flex items-center justify-center rounded-full",
            "backdrop-blur-md transition-all duration-200 active:scale-95",
            isComparing
              ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/40"
              : "bg-white/20 text-white border border-white/30 hover:bg-white/30 hover:scale-105",
            FOCUS,
          )}
        >
          <Scale size={13} className="sm:w-4 sm:h-4" />
        </button>

        {/* Name & meta — tight on mobile */}
        <div className="absolute bottom-0 left-0 right-0 p-2.5 sm:p-4 space-y-0.5 sm:space-y-1">
          <p className="text-[8px] sm:text-[10px] font-bold uppercase tracking-widest text-emerald-200 truncate">
            {medic.specialty}
          </p>
          <h3 className="text-sm sm:text-lg font-bold text-white leading-tight tracking-tight truncate">
            {medic.name}
          </h3>
          <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-3 gap-y-0.5 sm:gap-y-1 pt-0.5 sm:pt-1">
            <div className="flex items-center gap-0.5 sm:gap-1 text-[9px] sm:text-[11px] text-white/90 font-medium min-w-0">
              <MapPin
                size={9}
                className="text-emerald-300 shrink-0 sm:w-[11px] sm:h-[11px]"
              />
              <span className="truncate">{medic.city}</span>
            </div>
            <span className="text-white/40 text-[9px] sm:text-[10px]">·</span>
            <div className="flex items-center gap-0.5 sm:gap-1 text-[9px] sm:text-[11px] text-white/90 font-medium">
              <Clock
                size={9}
                className="text-emerald-300 shrink-0 sm:w-[11px] sm:h-[11px]"
              />
              {medic.experience}y
            </div>
          </div>
        </div>
      </div>

      {/* Footer — rate + actions, one row */}
      <div className="flex items-center justify-between gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 sm:py-2.5 bg-white">
        <div className="min-w-0">
          <p className="hidden sm:block text-[9px] font-bold uppercase tracking-wider text-emerald-700/60 leading-none">
            Rate / hour
          </p>
          <p className="text-sm sm:text-base font-bold text-emerald-900 leading-tight sm:mt-0.5 tabular-nums">
            {formatNaira(hourly)}
          </p>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {hasInstantTalk && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpen("instant");
              }}
              className="inline-flex items-center justify-center gap-0.5 sm:gap-1 min-h-6 min-w-6 sm:min-h-0 sm:min-w-0 text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-emerald-700 px-1.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors"
              title={`Instant ${medic.instantTalkWindowMinutes || 15}-min call`}
            >
              <Zap size={8} className="sm:w-[9px] sm:h-[9px]" />
              <span className="hidden sm:inline">Talk</span>
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpen("scheduled");
            }}
            aria-label={`Book ${medic.name}`}
            className={cn(
              "inline-flex items-center justify-center gap-0.5 sm:gap-1",
              "h-7 w-7 sm:h-10 sm:w-auto sm:pl-3 sm:pr-2.5",
              "rounded-lg sm:rounded-xl",
              "bg-emerald-600 group-hover:bg-emerald-700 text-white",
              "sm:text-[11px] font-bold uppercase tracking-wider",
              "shadow-sm shadow-emerald-600/20 transition-all active:scale-95",
              FOCUS,
            )}
          >
            <span className="hidden sm:inline">Book</span>
            <ChevronRight
              size={13}
              className="sm:w-3.5 sm:h-3.5 transition-transform group-hover:translate-x-0.5"
            />
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailBox({ label, value }: any) {
  return (
    <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-100 text-center">
      <p className="text-[9px] font-bold text-emerald-700/70 uppercase tracking-wider mb-0.5">
        {label}
      </p>
      <p className="text-xs sm:text-sm font-bold text-emerald-900 truncate">
        {value || "N/A"}
      </p>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white border border-slate-200 p-2">
      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
        {label}
      </p>
      <p className="text-xs font-bold text-slate-900 mt-0.5 truncate">
        {value}
      </p>
    </div>
  );
}

function PriceBreakdownCard({
  rows,
  total,
}: {
  rows: { label: string; value: string }[];
  total: number;
}) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="flex items-center justify-between text-xs">
          <span className="text-slate-600">{r.label}</span>
          <span className="font-bold text-slate-900 tabular-nums">
            {r.value}
          </span>
        </div>
      ))}
      <div className="h-px bg-slate-200" />
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
          Total
        </span>
        <span className="text-base font-bold text-emerald-700 tabular-nums">
          {formatNaira(total)}
        </span>
      </div>
    </div>
  );
}

function CompareRow({ label, values, isPrice, isButton }: any) {
  return (
    <tr className="border-b border-emerald-100">
      <td className="py-2.5 font-bold text-emerald-700/70 uppercase text-[10px] tracking-wider">
        {label}
      </td>
      {values.map((v: any, i: number) => (
        <td
          key={i}
          className={cn(
            "py-2.5 px-2 text-center font-semibold text-emerald-900 text-xs sm:text-sm",
            isPrice && "text-emerald-700 font-bold text-sm sm:text-base",
            isButton && "text-center",
          )}
        >
          {v}
        </td>
      ))}
    </tr>
  );
}

// ─── Reviews section ─────────────────────────────────
function Stars({
  value,
  size = 12,
  emptyClass = "text-emerald-200",
  filledClass = "fill-amber-400 text-amber-400",
}: {
  value: number;
  size?: number;
  emptyClass?: string;
  filledClass?: string;
}) {
  const rounded = Math.round(value || 0);
  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={i <= rounded ? filledClass : emptyClass}
        />
      ))}
    </div>
  );
}

function ReviewsSection({ medicId }: { medicId: string }) {
  const { data, isLoading } = useSWR(
    medicId ? `/api/medics/${medicId}/reviews` : null,
    authFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5_000,
      revalidateOnMount: true,
      keepPreviousData: true,
    },
  );

  const summary = data?.data?.summary || { average: 0, count: 0 };
  const reviews: any[] = data?.data?.reviews || [];

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="h-4 w-32 bg-emerald-100 rounded animate-pulse" />
        <div className="h-16 bg-emerald-50 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-4 text-center">
        <p className="text-xs font-semibold text-emerald-800">No reviews yet</p>
        <p className="text-[10px] text-emerald-700/60 mt-1">
          Book a session and be the first to review.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
          <Star size={12} className="fill-amber-500 text-amber-500" />
          Patient Reviews
        </h4>
        <div className="flex items-center gap-1.5">
          <Stars value={summary.average} size={11} />
          <span className="text-xs font-bold text-emerald-900 tabular-nums">
            {Number(summary.average).toFixed(1)}
          </span>
          <span className="text-[10px] text-emerald-700/60">
            ({summary.count})
          </span>
        </div>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-emerald-scrollbar">
        {reviews.map((r) => (
          <div
            key={r.id}
            className="bg-white border border-emerald-100 rounded-xl p-3 flex gap-2.5"
          >
            {r.patientImage ? (
              <img
                src={r.patientImage}
                alt={r.patientName || "Patient"}
                className="w-8 h-8 rounded-full object-cover border border-emerald-100 shrink-0"
                loading="lazy"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center shrink-0">
                {(r.patientName || "A").charAt(0).toUpperCase()}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-emerald-900 truncate">
                  {r.patientName || "Anonymous"}
                </p>
                <span className="text-[10px] text-emerald-700/60 shrink-0 tabular-nums">
                  {r.createdAt
                    ? new Date(r.createdAt).toLocaleDateString()
                    : ""}
                </span>
              </div>
              <Stars
                value={r.stars}
                size={10}
                emptyClass="text-emerald-100"
                filledClass="fill-amber-400 text-amber-400"
              />
              {r.comment && (
                <p className="text-[11px] text-emerald-800/80 mt-1 leading-relaxed break-words">
                  {r.comment}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
