// app/dashboard/components/panels/DozaMedicsPanel.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
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
  Star,
} from "lucide-react";
import { cn } from "@/app/utils/utils";
import { authFetcher, authPost } from "@/app/utils/client-auth";
import { poppins, bebasNeue } from "@/app/constants";

// --- Helpers ---
const DURATIONS = ["15 min", "30 min", "45 min", "60 min", "90+ min"];

const generateTimeSlots = (start: string, end: string) => {
  const slots = [];
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

// --- Skeleton Loader ---
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 p-5 shadow-sm animate-pulse flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-start mb-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-100" />
          <div className="w-10 h-10 rounded-xl bg-slate-100" />
        </div>
        <div className="h-5 w-3/4 bg-slate-200 rounded-md mb-2" />
        <div className="h-3 w-1/3 bg-slate-100 rounded-md mb-4" />
        <div className="space-y-2 mb-6">
          <div className="h-3 w-1/2 bg-slate-100 rounded-md" />
          <div className="h-3 w-2/3 bg-slate-100 rounded-md" />
        </div>
      </div>
      <div className="flex justify-between items-center pt-4 border-t border-slate-50">
        <div>
          <div className="h-2.5 w-8 bg-slate-100 rounded mb-1" />
          <div className="h-6 w-16 bg-slate-200 rounded-lg" />
        </div>
        <div className="w-11 h-11 rounded-xl bg-slate-200" />
      </div>
    </div>
  );
}

export default function DozaMedicsPanel({ user }: any) {
  const [selectedCategory, setSelectedCategory] = useState("nurse");
  const [compareList, setCompareList] = useState<any[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [viewingMedic, setViewingMedic] = useState<any | null>(null);
  const [bookingStep, setBookingStep] = useState<
    "details" | "schedule" | "payment"
  >("details");

  const [consultType, setConsultType] = useState<"online" | "inPerson">(
    "inPerson",
  );
  const [selectedDuration, setSelectedDuration] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState("");
  const [patientAddress, setPatientAddress] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [notification, setNotification] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  const { data: apiResponse, isLoading } = useSWR(
    `/api/medics?category=${selectedCategory}`,
    authFetcher,
  );
  const medics = useMemo(
    () => (apiResponse?.success ? apiResponse.data : []),
    [apiResponse],
  );

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
      setConsultType("inPerson");
      setPatientAddress("");
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
    <div
      className={cn(
        "min-h-screen bg-[#F8FAFC] pb-32 selection:bg-emerald-500 selection:text-white",
        poppins.className,
      )}
    >
      <style jsx global>{`
        .react-datepicker {
          border: none !important;
          border-radius: 20px !important;
          box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.1) !important;
          font-family: inherit !important;
          padding: 16px !important;
          background: white !important;
          width: 100% !important;
        }
        .react-datepicker__header {
          background: white !important;
          border-bottom: 1px solid #f1f5f9 !important;
          padding-top: 8px !important;
        }
        .react-datepicker__current-month {
          font-weight: 700 !important;
          font-size: 0.9rem !important;
          color: #0f172a !important;
        }
        .react-datepicker__day-name {
          color: #94a3b8 !important;
          font-weight: 600 !important;
          font-size: 0.75rem !important;
        }
        .react-datepicker__day {
          font-weight: 500 !important;
          border-radius: 10px !important;
          transition: all 0.2s !important;
          color: #475569 !important;
        }
        .react-datepicker__day:hover {
          background-color: #f0fdf4 !important;
          color: #10b981 !important;
        }
        .react-datepicker__day--selected {
          background-color: #10b981 !important;
          color: white !important;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25) !important;
        }
        .react-datepicker__day--disabled {
          color: #cbd5e1 !important;
        }
        .react-datepicker__navigation {
          top: 20px !important;
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
              "fixed top-6 left-1/2 -translate-x-1/2 z-[300] px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 font-semibold text-xs sm:text-sm tracking-wide",
              notification.type === "success"
                ? "bg-emerald-600 text-white"
                : "bg-red-500 text-white",
            )}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-xs">
              {notification.type === "success" ? "✓" : "!"}
            </span>
            {notification.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── HEADER ─────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-2">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-8 w-1 rounded-full bg-gradient-to-b from-emerald-500 to-teal-600" />
              <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-[0.25em]">
                Healthcare Professionals
              </span>
            </div>
            <h1
              className={cn(
                "text-4xl md:text-5xl text-slate-900 leading-[1.1] tracking-tight",
                bebasNeue.className,
              )}
            >
              Doza <span className="text-emerald-600">Medics</span>
            </h1>
            <p className="text-sm text-slate-600 mt-2 max-w-md">
              Verified healthcare professionals on demand.
            </p>
          </div>
        </div>

        {/* ─── CATEGORY TABS (with previous styling) ─────────────── */}
        <nav className="flex overflow-x-auto gap-1.5 p-1 mt-4 bg-slate-100/80 rounded-2xl border border-slate-200/60 w-full md:w-auto scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0",
                selectedCategory === cat.id
                  ? "bg-white text-emerald-600 shadow-sm border border-slate-200/50"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50",
              )}
            >
              {cat.icon}
              <span>{cat.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-4 pb-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            Available Specialists ({medics.length})
          </h2>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : medics.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 bg-white rounded-3xl border border-slate-100 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 mb-1">
              <Stethoscope size={28} />
            </div>
            <p className="text-base font-bold text-slate-800">
              No professionals found
            </p>
            <p className="text-xs text-slate-400 max-w-xs text-center">
              We couldn't find any active specialists matching this category
              right now. Try switching categories above.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {medics.map((m: any) => (
              <MedicCard
                key={m.id}
                medic={m}
                onOpen={() => setViewingMedic(m)}
                isComparing={compareList.some((c) => c.id === m.id)}
                onCompare={() => {
                  if (compareList.find((c) => c.id === m.id))
                    setCompareList(compareList.filter((c) => c.id !== m.id));
                  else if (compareList.length < 3)
                    setCompareList([...compareList, m]);
                }}
              />
            ))}
          </div>
        )}
      </main>

      {/* Comparison Floating Tray */}
      <AnimatePresence>
        {compareList.length > 0 && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-6 inset-x-0 z-[110] flex justify-center px-4 pointer-events-none"
          >
            <div className="pointer-events-auto bg-slate-900 text-white border border-slate-800 rounded-2xl shadow-2xl px-5 py-3 flex items-center gap-4 sm:gap-6">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Comparing:
                </span>
                <div className="flex -space-x-2">
                  {compareList.map((m) => (
                    <img
                      key={m.id}
                      src={m.profileImage}
                      className="w-9 h-9 rounded-full border-2 border-slate-900 object-cover shadow"
                    />
                  ))}
                </div>
              </div>
              <div className="h-4 w-px bg-slate-700" />
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowCompareModal(true)}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all shadow-md shadow-emerald-500/20"
                >
                  View Table ({compareList.length}/3)
                </button>
                <button
                  onClick={() => setCompareList([])}
                  className="p-2 text-slate-400 hover:text-white transition-colors"
                  title="Clear comparison"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Compare Modal */}
      <AnimatePresence>
        {showCompareModal && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCompareModal(false)}
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 max-h-[85vh] flex flex-col"
            >
              <div className="flex justify-between items-center pb-6 border-b border-slate-100">
                <div>
                  <h2
                    className={cn(
                      "text-2xl sm:text-3xl text-slate-900",
                      bebasNeue.className,
                    )}
                  >
                    Professional{" "}
                    <span className="text-emerald-500">Comparison</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Side-by-side breakdown of your selected specialists
                  </p>
                </div>
                <button
                  onClick={() => setShowCompareModal(false)}
                  className="p-2.5 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="overflow-x-auto py-6 flex-1">
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="pb-4 text-xs font-bold text-slate-400 uppercase w-1/4">
                        Attributes
                      </th>
                      {compareList.map((m) => (
                        <th key={m.id} className="pb-4 px-4 text-center w-1/4">
                          <img
                            src={m.profileImage}
                            className="w-16 h-16 rounded-2xl mx-auto object-cover mb-2 shadow-sm border border-slate-100"
                          />
                          <p className="text-sm font-bold text-slate-900 truncate">
                            {m.name}
                          </p>
                          <p className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wider mt-0.5">
                            {m.specialty}
                          </p>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-slate-50">
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
                      label="Consultation Fee"
                      values={compareList.map(
                        (m) => `₦${m.price.toLocaleString()}`,
                      )}
                      isPrice
                    />
                    <CompareRow
                      label="Rating Score"
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
                          className="w-full py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition shadow-sm"
                        >
                          Select & Book
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

      {/* Booking Modal */}
      <AnimatePresence>
        {viewingMedic && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingMedic(null)}
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-20">
                <div className="flex items-center gap-4">
                  <img
                    src={viewingMedic.profileImage}
                    className="w-14 h-14 rounded-2xl object-cover shadow-sm border border-slate-100"
                  />
                  <div>
                    <h2
                      className={cn(
                        "text-xl sm:text-2xl text-slate-900 leading-tight",
                        bebasNeue.className,
                      )}
                    >
                      {viewingMedic.name}
                    </h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded-md">
                        {viewingMedic.specialty}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Languages size={12} />{" "}
                        {viewingMedic.languages?.join(", ") || "English"}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setViewingMedic(null)}
                  className="p-2.5 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {/* Step Indicators */}
                <div className="flex gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
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
                        "flex-1 py-2 text-xs font-semibold rounded-lg transition-all text-center",
                        bookingStep === s.id
                          ? "bg-white text-slate-900 shadow-sm border border-slate-200/50"
                          : "text-slate-400 hover:text-slate-600",
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                {bookingStep === "details" && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <DetailBox
                        label="Experience"
                        value={`${viewingMedic.experience} years`}
                      />
                      <DetailBox
                        label="Languages"
                        value={viewingMedic.languages?.[0] || "English"}
                      />
                      <DetailBox label="Location" value={viewingMedic.city} />
                      <DetailBox label="Rating" value="4.9 / 5" />
                    </div>
                    <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                        <ShieldCheck size={16} className="text-emerald-500" />{" "}
                        Professional Bio
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                        {viewingMedic.bio ||
                          "No biography provided for this professional."}
                      </p>
                    </div>
                    <button
                      onClick={() => setBookingStep("schedule")}
                      className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-emerald-600 transition-all shadow-md"
                    >
                      Continue to Scheduling
                    </button>
                  </div>
                )}

                {bookingStep === "schedule" && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setConsultType("inPerson")}
                        className={cn(
                          "flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left",
                          consultType === "inPerson"
                            ? "border-emerald-500 bg-emerald-50/50"
                            : "border-slate-100 bg-slate-50/50 hover:border-slate-200",
                        )}
                      >
                        <div
                          className={cn(
                            "p-2.5 rounded-xl",
                            consultType === "inPerson"
                              ? "bg-emerald-500 text-white"
                              : "bg-white text-slate-400 shadow-sm",
                          )}
                        >
                          <Home size={18} />
                        </div>
                        <div>
                          <span className="block text-xs font-bold text-slate-900">
                            In-Person
                          </span>
                          <span className="block text-[10px] text-slate-400">
                            At your address
                          </span>
                        </div>
                      </button>
                      <button
                        onClick={() => setConsultType("online")}
                        className={cn(
                          "flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left",
                          consultType === "online"
                            ? "border-emerald-500 bg-emerald-50/50"
                            : "border-slate-100 bg-slate-50/50 hover:border-slate-200",
                        )}
                      >
                        <div
                          className={cn(
                            "p-2.5 rounded-xl",
                            consultType === "online"
                              ? "bg-emerald-500 text-white"
                              : "bg-white text-slate-400 shadow-sm",
                          )}
                        >
                          <Video size={18} />
                        </div>
                        <div>
                          <span className="block text-xs font-bold text-slate-900">
                            Online Call
                          </span>
                          <span className="block text-[10px] text-slate-400">
                            Virtual session
                          </span>
                        </div>
                      </button>
                    </div>

                    {consultType === "inPerson" && (
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                          Patient Residential Address
                        </label>
                        <input
                          type="text"
                          value={patientAddress}
                          onChange={(e) => setPatientAddress(e.target.value)}
                          placeholder="e.g., 14 Admiralty Way, Lekki Phase 1"
                          className="w-full p-3.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl text-xs focus:ring-2 ring-emerald-500 outline-none"
                        />
                      </div>
                    )}

                    {consultType === "online" && (
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                          Consultation Duration
                        </label>
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                          {DURATIONS.map((d) => (
                            <button
                              key={d}
                              onClick={() => setSelectedDuration(d)}
                              className={cn(
                                "py-2.5 px-2 rounded-xl text-xs font-bold transition-all border",
                                selectedDuration === d
                                  ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100",
                              )}
                            >
                              {d}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                        Appointment Date
                      </label>
                      <div className="relative">
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 z-10">
                          <CalendarIcon size={16} />
                        </div>
                        <DatePicker
                          selected={selectedDate}
                          onChange={(date: any) => setSelectedDate(date)}
                          minDate={minDate}
                          maxDate={maxDate}
                          dateFormat="MMMM d, yyyy"
                          placeholderText="Select date"
                          className="w-full pl-10 pr-4 py-3.5 bg-slate-50 text-slate-800 font-semibold border border-slate-200 rounded-xl text-xs focus:ring-2 ring-emerald-500 outline-none cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                        Available Time Slot
                      </label>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {timeSlots.map((t) => (
                          <button
                            key={t}
                            onClick={() => setSelectedTime(t)}
                            className={cn(
                              "py-2.5 rounded-xl text-xs font-semibold border transition-all",
                              selectedTime === t
                                ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm"
                                : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100",
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
                      className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-600 transition-all shadow-md"
                    >
                      Continue to Payment
                    </button>
                  </div>
                )}

                {bookingStep === "payment" && (
                  <div className="space-y-6">
                    <div className="bg-emerald-50/60 border border-emerald-100 p-6 rounded-2xl space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">
                          Total Payable Fee
                        </span>
                        <span className="text-2xl sm:text-3xl font-black text-slate-900">
                          ₦{viewingMedic.price?.toLocaleString()}
                        </span>
                      </div>
                      <div className="h-px bg-emerald-200/50" />
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">
                            Type
                          </p>
                          <p className="font-semibold text-slate-700 mt-0.5">
                            {consultType === "online"
                              ? "Online Consultation"
                              : "In-Person Visit"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">
                            Date & Time
                          </p>
                          <p className="font-semibold text-slate-700 mt-0.5">
                            {selectedDate?.toLocaleDateString()} @{" "}
                            {selectedTime}
                          </p>
                        </div>
                        {consultType === "online" && (
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">
                              Duration
                            </p>
                            <p className="font-semibold text-slate-700 mt-0.5">
                              {selectedDuration}
                            </p>
                          </div>
                        )}
                        {consultType === "inPerson" && (
                          <div className="col-span-2">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">
                              Address
                            </p>
                            <p className="font-semibold text-slate-700 mt-0.5 truncate">
                              {patientAddress}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={handlePayment}
                      disabled={isProcessing}
                      className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="animate-spin" size={16} />
                          <span>Initializing Payment...</span>
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
    </div>
  );
}

// --- Subcomponents ---
function MedicCard({ medic, onOpen, isComparing, onCompare }: any) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 p-5 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between group cursor-pointer"
      onClick={onOpen}
    >
      <div>
        <div className="flex justify-between items-start mb-4">
          <img
            src={medic.profileImage}
            className="w-16 h-16 rounded-2xl object-cover shadow-sm border border-slate-100"
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCompare();
            }}
            className={cn(
              "p-2.5 rounded-xl transition-all border",
              isComparing
                ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                : "bg-slate-50 text-slate-400 border-slate-200/60 hover:text-slate-900 hover:bg-slate-100",
            )}
            title="Compare professional"
          >
            <Scale size={15} />
          </button>
        </div>
        <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-0.5 group-hover:text-emerald-600 transition-colors">
          {medic.name}
        </h3>
        <p className="text-emerald-600 text-[10px] font-bold uppercase tracking-wider mb-3">
          {medic.specialty}
        </p>
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mb-4">
          <div className="flex items-center gap-1">
            <MapPin size={13} className="text-slate-400" /> {medic.city}
          </div>
          <div className="flex items-center gap-1">
            <Clock size={13} className="text-slate-400" /> {medic.experience}{" "}
            yrs exp
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-50">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
            Rate
          </p>
          <p className="text-base font-black text-slate-900">
            ₦{medic.price?.toLocaleString()}
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
          className="bg-slate-900 group-hover:bg-emerald-500 text-white p-3 rounded-xl transition-colors shadow-sm"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </motion.div>
  );
}

function DetailBox({ label, value }: any) {
  return (
    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mb-1">
        {label}
      </p>
      <p className="text-xs font-bold text-slate-800 truncate">
        {value || "—"}
      </p>
    </div>
  );
}

function CompareRow({ label, values, isPrice, isButton }: any) {
  return (
    <tr className="border-b border-slate-50">
      <td className="py-4 font-bold text-slate-400 uppercase text-xs tracking-wider">
        {label}
      </td>
      {values.map((v: any, i: number) => (
        <td
          key={i}
          className={cn(
            "py-4 px-4 text-center font-semibold text-slate-700 text-xs sm:text-sm",
            isPrice && "text-emerald-600 font-bold text-base",
            isButton && "text-center",
          )}
        >
          {v}
        </td>
      ))}
    </tr>
  );
}
