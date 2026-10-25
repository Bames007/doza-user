// app/dashboard/components/panels/DozaMedicsPanel.tsx
"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import useSWR from "swr";
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
} from "lucide-react";
import { cn } from "@/app/utils/utils";
import { authFetcher, authPost } from "@/app/utils/client-auth";
import { poppins } from "@/app/constants";

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

// --- Helpers ---
const DURATIONS = ["15 min", "30 min", "45 min", "60 min", "90+ min"];

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

// --- Skeleton Loader ---
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-emerald-100 p-4 lg:p-5 shadow-xs animate-pulse flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-start mb-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100" />
          <div className="w-10 h-10 rounded-xl bg-emerald-50" />
        </div>
        <div className="h-4 w-3/4 bg-emerald-200 rounded-md mb-2" />
        <div className="h-3 w-1/3 bg-emerald-100 rounded-md mb-4" />
        <div className="space-y-2 mb-5">
          <div className="h-3 w-1/2 bg-emerald-100 rounded-md" />
          <div className="h-3 w-2/3 bg-emerald-100 rounded-md" />
        </div>
      </div>
      <div className="flex justify-between items-center pt-3 border-t border-emerald-100">
        <div>
          <div className="h-2.5 w-10 bg-emerald-100 rounded mb-1.5" />
          <div className="h-5 w-20 bg-emerald-200 rounded-lg" />
        </div>
        <div className="w-10 h-10 rounded-xl bg-emerald-100" />
      </div>
    </div>
  );
}

export default function DozaMedicsPanel({ user }: any) {
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
  const [bookingStep, setBookingStep] = useState<
    "details" | "schedule" | "payment"
  >("details");
  const [selectedDuration, setSelectedDuration] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState("");
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
      dedupingInterval: 60_000,
      revalidateIfStale: false,
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

  const handlePayment = async () => {
    if (typeof window === "undefined") return;
    setIsProcessing(true);
    try {
      const PaystackPop = (await import("@paystack/inline-js")).default;
      const paystack = new PaystackPop();
      paystack.newTransaction({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "",
        email: user?.email || "patient@doza.health",
        amount: (viewingMedic.price || 0) * 100,
        currency: "NGN",
        onSuccess: async () => {
          setIsProcessing(true);
          try {
            const result = await authPost("/api/appointments", {
              medicId: viewingMedic.id,
              medicName: viewingMedic.name,
              date: selectedDate?.toISOString().split("T")[0],
              time: selectedTime,
              reason: `Consultation (${consultType})`,
              notes:
                consultType === "inPerson"
                  ? `Address: ${patientAddress}`
                  : `Duration: ${selectedDuration}`,
            });
            if (result.success) {
              triggerNotify(
                `Booking with ${viewingMedic.name} confirmed!`,
                "success",
              );
              setViewingMedic(null);
            } else {
              triggerNotify(
                result.error || "Failed to save. Please contact support.",
                "error",
              );
            }
          } catch {
            triggerNotify(
              "Failed to save booking. Please contact support.",
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
      });
    } catch {
      triggerNotify(
        "Payment service unavailable. Please try again later.",
        "error",
      );
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (viewingMedic) {
      setBookingStep("details");
      setSelectedDate(null);
      setSelectedTime("");
      setSelectedDuration("");
      setPatientAddress(ssGet("medics:patientAddress") || "");
    }
  }, [viewingMedic]);

  const minDate = new Date();
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 30);

  const timeSlots = useMemo(() => {
    if (!viewingMedic) return [];
    return generateTimeSlots(
      viewingMedic.availability?.hours?.start,
      viewingMedic.availability?.hours?.end,
    );
  }, [viewingMedic]);

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

      {/* Notification Toast */}
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
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-xs shrink-0">
              {notification.type === "success" ? "✓" : "!"}
            </span>
            <span className="truncate">{notification.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="mx-auto max-w-7xl px-4 pt-3 sm:px-6 lg:px-8 space-y-4 lg:space-y-5">
        {/* ─── HEADER ──────────────────────────────────────── */}
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

        {/* ─── CATEGORY TABS ───────────────────────────────── */}
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

        {/* ─── SPECIALISTS GRID ────────────────────────────── */}
        <section>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-700/70">
              Available Specialists {!isColdStart && `(${medics.length})`}
            </h2>
          </div>

          {isColdStart ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
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
                We couldn't find any active specialists in this category right
                now. Try switching to a different category.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
              {medics.map((m: any) => (
                <MedicCard
                  key={m.id}
                  medic={m}
                  onOpen={() => setViewingMedic(m)}
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

      {/* ─── COMPARE TRAY ────────────────────────────────── */}
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
                    <img
                      key={m.id}
                      src={m.profileImage}
                      alt={m.name}
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-emerald-700 object-cover shadow"
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

      {/* ─── COMPARE MODAL ───────────────────────────────── */}
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
                          <img
                            src={m.profileImage}
                            alt={m.name}
                            className="w-14 h-14 rounded-2xl mx-auto object-cover mb-2 shadow-sm border border-emerald-100"
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
                      label="Fee"
                      values={compareList.map(
                        (m) => `₦${m.price.toLocaleString()}`,
                      )}
                      isPrice
                    />
                    <CompareRow
                      label="Rating"
                      values={compareList.map(() => "4.9 / 5.0")}
                    />
                    <CompareRow
                      label="Action"
                      values={compareList.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => {
                            setViewingMedic(m);
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

      {/* ─── BOOKING MODAL ───────────────────────────────── */}
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
              {/* Drag handle (mobile only) */}
              <div className="sm:hidden flex justify-center pt-3" aria-hidden>
                <div className="w-10 h-1 rounded-full bg-emerald-200" />
              </div>

              {/* Modal header */}
              <div className="px-4 sm:px-5 py-3 border-b border-emerald-100 flex justify-between items-center bg-white sticky top-0 z-20 gap-3 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={viewingMedic.profileImage}
                    alt={viewingMedic.name}
                    className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl object-cover border border-emerald-100 shrink-0"
                  />
                  <div className="min-w-0">
                    <h2 className="text-base sm:text-lg font-bold text-emerald-900 leading-tight truncate">
                      {viewingMedic.name}
                    </h2>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider bg-emerald-50 px-1.5 py-0.5 rounded-md">
                        {viewingMedic.specialty}
                      </span>
                      <span className="text-[11px] text-emerald-700/70 flex items-center gap-1">
                        <Languages size={11} />{" "}
                        {viewingMedic.languages?.join(", ") || "English"}
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

              {/* Modal body */}
              <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 custom-emerald-scrollbar">
                {/* Step indicator */}
                <div className="flex gap-1 p-1 bg-emerald-50 rounded-xl border border-emerald-100">
                  {[
                    { id: "details", label: "1. Profile" },
                    { id: "schedule", label: "2. Schedule" },
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
                      <DetailBox label="Rating" value="4.9 / 5" />
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
                    <button
                      onClick={() => setBookingStep("schedule")}
                      className={cn(
                        "w-full min-h-11 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors shadow-sm",
                        FOCUS,
                      )}
                    >
                      Continue to Scheduling
                    </button>
                  </div>
                )}

                {bookingStep === "schedule" && (
                  <div className="space-y-4">
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
                            At your address
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
                            Virtual session
                          </span>
                        </div>
                      </button>
                    </div>

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
                          onChange={(e) => setPatientAddress(e.target.value)}
                          placeholder="e.g., 14 Admiralty Way, Lekki"
                          autoComplete="street-address"
                          className={cn(
                            "w-full min-h-11 px-3.5 bg-emerald-50/50 border border-emerald-100 text-emerald-900 rounded-xl text-base sm:text-sm focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 outline-none transition",
                            FOCUS,
                          )}
                        />
                      </div>
                    )}

                    {consultType === "online" && (
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
                          onChange={(date: any) => setSelectedDate(date)}
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
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                        {timeSlots.map((t) => (
                          <button
                            key={t}
                            onClick={() => setSelectedTime(t)}
                            className={cn(
                              "min-h-10 rounded-xl text-xs font-semibold border transition-colors",
                              selectedTime === t
                                ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                                : "border-emerald-100 bg-white text-emerald-700 hover:bg-emerald-50",
                              FOCUS,
                            )}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      disabled={
                        !selectedDate ||
                        !selectedTime ||
                        (consultType === "inPerson" && !patientAddress) ||
                        (consultType === "online" && !selectedDuration)
                      }
                      onClick={() => setBookingStep("payment")}
                      className={cn(
                        "w-full min-h-11 bg-emerald-600 text-white rounded-xl font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-700 transition-colors shadow-sm",
                        FOCUS,
                      )}
                    >
                      Continue to Payment
                    </button>
                  </div>
                )}

                {bookingStep === "payment" && (
                  <div className="space-y-4">
                    <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl space-y-3">
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                          Total Payable Fee
                        </span>
                        <span className="text-xl sm:text-2xl font-bold text-emerald-900">
                          ₦{viewingMedic.price?.toLocaleString()}
                        </span>
                      </div>
                      <div className="h-px bg-emerald-200" />
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-[10px] font-bold text-emerald-700/70 uppercase tracking-wider">
                            Type
                          </p>
                          <p className="font-semibold text-emerald-900 mt-0.5">
                            {consultType === "online"
                              ? "Online Consultation"
                              : "In-Person Visit"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-emerald-700/70 uppercase tracking-wider">
                            Date & Time
                          </p>
                          <p className="font-semibold text-emerald-900 mt-0.5">
                            {selectedDate?.toLocaleDateString()} @{" "}
                            {selectedTime}
                          </p>
                        </div>
                        {consultType === "online" && (
                          <div>
                            <p className="text-[10px] font-bold text-emerald-700/70 uppercase tracking-wider">
                              Duration
                            </p>
                            <p className="font-semibold text-emerald-900 mt-0.5">
                              {selectedDuration}
                            </p>
                          </div>
                        )}
                        {consultType === "inPerson" && (
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
                          <span>Initializing payment…</span>
                        </>
                      ) : (
                        <span>Pay with Paystack</span>
                      )}
                    </button>
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

// --- Subcomponents ---
function MedicCard({ medic, onOpen, isComparing, onCompare }: any) {
  return (
    <div
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className={cn(
        "group relative w-full overflow-hidden rounded-3xl bg-white",
        "border border-emerald-100 shadow-xs transition-all duration-300 cursor-pointer",
        "hover:-translate-y-0.5 hover:shadow-lg hover:border-emerald-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2",
      )}
    >
      {/* ─── HERO IMAGE ─────────────────────────────────── */}
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-emerald-100">
        <img
          src={medic.profileImage}
          alt={medic.name}
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />

        {/* Cinematic gradient for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-emerald-950/40 to-transparent" />

        {/* Floating compare button — top-right */}
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
            "absolute top-3 right-3 w-10 h-10 inline-flex items-center justify-center rounded-full",
            "backdrop-blur-md transition-all duration-200 active:scale-95",
            isComparing
              ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/40"
              : "bg-white/20 text-white border border-white/30 hover:bg-white/30 hover:scale-105",
            FOCUS,
          )}
        >
          <Scale size={16} />
        </button>

        {/* Bottom overlay — identity */}
        <div className="absolute bottom-0 left-0 right-0 p-4 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-200">
            {medic.specialty}
          </p>
          <h3 className="text-lg sm:text-xl font-bold text-white leading-tight tracking-tight truncate">
            {medic.name}
          </h3>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1">
            <div className="flex items-center gap-1 text-[11px] text-white/90 font-medium">
              <MapPin size={11} className="text-emerald-300 shrink-0" />
              {medic.city}
            </div>
            <span className="text-white/40 text-[10px]">•</span>
            <div className="flex items-center gap-1 text-[11px] text-white/90 font-medium">
              <Clock size={11} className="text-emerald-300 shrink-0" />
              {medic.experience} yrs
            </div>
          </div>
        </div>
      </div>

      {/* ─── BOTTOM ACTION STRIP ────────────────────────── */}
      <div className="flex items-center justify-between gap-2 px-3 py-2.5 bg-white">
        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-700/60 leading-none">
            Rate
          </p>
          <p className="text-base font-bold text-emerald-900 leading-tight mt-0.5 tabular-nums">
            ₦{medic.price?.toLocaleString()}
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
          aria-label={`Book ${medic.name}`}
          className={cn(
            "inline-flex items-center gap-1 h-10 pl-3 pr-2.5 rounded-xl",
            "bg-emerald-600 group-hover:bg-emerald-700 text-white",
            "text-[11px] font-bold uppercase tracking-wider",
            "shadow-sm shadow-emerald-600/20 transition-all active:scale-95",
            FOCUS,
          )}
        >
          Book
          <ChevronRight
            size={14}
            className="transition-transform group-hover:translate-x-0.5"
          />
        </button>
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
        {value || "—"}
      </p>
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
