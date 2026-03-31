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
} from "lucide-react";
import { cn } from "@/app/utils/utils";
import { authFetcher } from "@/app/utils/client-auth";
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
  { id: "nurse", label: "Nurses", icon: <Syringe size={14} /> },
  { id: "doctor", label: "Doctors", icon: <Stethoscope size={14} /> },
  { id: "dentist", label: "Dentists", icon: <SmilePlus size={14} /> },
  { id: "eye", label: "Eye Care", icon: <Eye size={14} /> },
  { id: "pharmacist", label: "Pharmacists", icon: <Pill size={14} /> },
  { id: "other", label: "Others", icon: <Users size={14} /> },
];

export default function DozaMedicsPanel({ user }: any) {
  const [selectedCategory, setSelectedCategory] = useState("nurse");
  const [compareList, setCompareList] = useState<any[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [viewingMedic, setViewingMedic] = useState<any | null>(null);
  const [bookingStep, setBookingStep] = useState<
    "details" | "schedule" | "payment"
  >("details");

  // Booking State
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

  // Notifications
  const triggerNotify = (
    msg: string,
    type: "success" | "error" = "success",
  ) => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // Payment – dynamically import Paystack only on client
  const handlePayment = async () => {
    if (typeof window === "undefined") return; // safety for SSR

    setIsProcessing(true);
    try {
      const PaystackPop = (await import("@paystack/inline-js")).default;
      const paystack = new PaystackPop();
      paystack.newTransaction({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "",
        email: user?.email || "patient@doza.health",
        amount: (viewingMedic.price || 0) * 100,
        currency: "NGN",
        onSuccess: () => {
          triggerNotify(
            `Booking with ${viewingMedic.name} confirmed!`,
            "success",
          );
          setViewingMedic(null);
        },
        onCancel: () => {
          setIsProcessing(false);
          triggerNotify("Payment cancelled", "error");
        },
      });
    } catch (err) {
      console.error("Failed to load Paystack", err);
      triggerNotify(
        "Payment service unavailable. Please try again later.",
        "error",
      );
      setIsProcessing(false);
    }
  };

  // Reset booking state when medic changes
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

  // Limit date to today + 30 days
  const minDate = new Date();
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 30);

  // Generate time slots based on medic's availability (static for now)
  const timeSlots = useMemo(() => {
    if (!viewingMedic) return [];
    return generateTimeSlots(
      viewingMedic.availability?.hours?.start,
      viewingMedic.availability?.hours?.end,
    );
  }, [viewingMedic]);

  return (
    <div className={cn("min-h-screen bg-[#F8FAFC] pb-40", poppins.className)}>
      {/* Custom Global CSS for the Calendar UI Improvement */}
      <style jsx global>{`
        .react-datepicker {
          border: none !important;
          border-radius: 24px !important;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15) !important;
          font-family: inherit !important;
          padding: 16px !important;
          background: white !important;
        }
        .react-datepicker__header {
          background: white !important;
          border-bottom: 1px solid #f1f5f9 !important;
          padding-top: 12px !important;
        }
        .react-datepicker__current-month {
          font-weight: 800 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em !important;
          font-size: 0.85rem !important;
          color: #0f172a !important;
        }
        .react-datepicker__day-name {
          color: #94a3b8 !important;
          font-weight: 700 !important;
          font-size: 0.7rem !important;
        }
        .react-datepicker__day {
          font-weight: 600 !important;
          border-radius: 12px !important;
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
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3) !important;
        }
        .react-datepicker__day--disabled {
          color: #e2e8f0 !important;
        }
        .react-datepicker__navigation {
          top: 24px !important;
        }
      `}</style>

      {/* Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={cn(
              "fixed top-6 left-1/2 -translate-x-1/2 z-[300] px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 font-bold text-sm",
              notification.type === "success"
                ? "bg-emerald-600 text-white"
                : "bg-red-500 text-white",
            )}
          >
            {notification.type === "success" ? "✓" : "⚠"} {notification.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-[100] px-6 py-6">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-center gap-6">
          <h1
            className={cn(
              "text-5xl text-slate-900 tracking-tighter",
              bebasNeue.className,
            )}
          >
            DOZA <span className="text-emerald-500">MEDICS</span>
          </h1>
          <nav className="flex flex-wrap justify-center gap-2 bg-slate-50 p-1.5 rounded-[32px] border border-slate-100">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                  selectedCategory === cat.id
                    ? "bg-white text-emerald-600 shadow-sm border border-slate-100"
                    : "text-slate-400 hover:text-slate-600",
                )}
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Grid */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-emerald-500 w-12 h-12" />
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
              Loading professionals...
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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

      {/* Comparison Tray */}
      <AnimatePresence>
        {compareList.length > 0 && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-8 inset-x-0 z-[110] flex justify-center px-4"
          >
            <div className="bg-white border border-slate-200 rounded-[32px] shadow-2xl p-5 flex items-center gap-8">
              <div className="flex -space-x-3">
                {compareList.map((m) => (
                  <img
                    key={m.id}
                    src={m.profileImage}
                    className="w-12 h-12 rounded-full border-4 border-white object-cover shadow-sm"
                  />
                ))}
              </div>
              <button
                onClick={() => setShowCompareModal(true)}
                className="bg-slate-900 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-colors"
              >
                Compare ({compareList.length})
              </button>
              <button
                onClick={() => setCompareList([])}
                className="p-3 text-slate-400 hover:text-red-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Compare Modal (Enhanced) */}
      <AnimatePresence>
        {showCompareModal && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCompareModal(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white w-full max-w-5xl rounded-[48px] shadow-2xl overflow-hidden p-8 md:p-12 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-10">
                <h2
                  className={cn("text-4xl text-slate-900", bebasNeue.className)}
                >
                  Compare{" "}
                  <span className="text-emerald-500">Professionals</span>
                </h2>
                <button
                  onClick={() => setShowCompareModal(false)}
                  className="p-3 bg-slate-900 text-white rounded-full"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="py-5 text-[10px] font-black text-slate-400 uppercase">
                        Feature
                      </th>
                      {compareList.map((m) => (
                        <th key={m.id} className="py-5 px-6 text-center">
                          <img
                            src={m.profileImage}
                            className="w-20 h-20 rounded-2xl mx-auto object-cover mb-3"
                          />
                          <p className="text-sm font-bold text-slate-900">
                            {m.name}
                          </p>
                          <p className="text-[9px] text-emerald-500 uppercase tracking-widest mt-1">
                            {m.specialty}
                          </p>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    <CompareRow
                      label="Experience"
                      values={compareList.map((m) => `${m.experience} yrs`)}
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
                        (m) => `₦${m.price.toLocaleString()}`,
                      )}
                      isPrice
                    />
                    <CompareRow
                      label="Rating"
                      values={compareList.map(() => "4.9/5")}
                    />
                    <CompareRow
                      label="Book"
                      values={compareList.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => {
                            setViewingMedic(m);
                            setShowCompareModal(false);
                          }}
                          className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-emerald-700 transition"
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

      {/* Booking Modal */}
      <AnimatePresence>
        {viewingMedic && (
          <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center p-0 md:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingMedic(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="relative bg-white w-full max-w-3xl rounded-t-[48px] md:rounded-[56px] shadow-2xl overflow-hidden max-h-[95vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-white sticky top-0 z-20">
                <div className="flex items-center gap-5">
                  <img
                    src={viewingMedic.profileImage}
                    className="w-16 h-16 rounded-[24px] object-cover"
                  />
                  <div>
                    <h2
                      className={cn(
                        "text-3xl text-slate-900",
                        bebasNeue.className,
                      )}
                    >
                      {viewingMedic.name}
                    </h2>
                    <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">
                      {viewingMedic.specialty}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                      <Languages size={12} />{" "}
                      {viewingMedic.languages?.join(", ") || "English"}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setViewingMedic(null)}
                  className="p-3 bg-slate-900 text-white rounded-full hover:bg-emerald-500 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 overflow-y-auto">
                {/* Step Indicator */}
                <div className="flex gap-3 mb-8">
                  {["details", "schedule", "payment"].map((step, idx) => (
                    <div
                      key={step}
                      className={cn(
                        "h-1.5 flex-1 rounded-full",
                        bookingStep === step
                          ? "bg-emerald-500"
                          : "bg-slate-100",
                      )}
                    />
                  ))}
                </div>

                {/* Step 1: Details */}
                {bookingStep === "details" && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                    <div className="grid grid-cols-2 gap-4">
                      <DetailBox
                        label="Experience"
                        value={`${viewingMedic.experience} years`}
                      />
                      <DetailBox
                        label="Languages"
                        value={viewingMedic.languages?.join(", ")}
                      />
                      <DetailBox label="Location" value={viewingMedic.city} />
                      <DetailBox label="Rating" value="4.9/5" />
                    </div>
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        About
                      </h4>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {viewingMedic.bio}
                      </p>
                    </div>
                    <button
                      onClick={() => setBookingStep("schedule")}
                      className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-600 transition-all"
                    >
                      Continue to Scheduling
                    </button>
                  </div>
                )}

                {/* Step 2: Schedule */}
                {bookingStep === "schedule" && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                    {/* Consultation Type */}
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => setConsultType("inPerson")}
                        className={cn(
                          "flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all",
                          consultType === "inPerson"
                            ? "border-emerald-500 bg-emerald-50"
                            : "border-slate-100 bg-slate-50",
                        )}
                      >
                        <Home
                          size={20}
                          className={
                            consultType === "inPerson"
                              ? "text-emerald-600"
                              : "text-slate-400"
                          }
                        />
                        <span className="text-[10px] text-slate-400 font-black uppercase">
                          In-Person
                        </span>
                      </button>
                      <button
                        onClick={() => setConsultType("online")}
                        className={cn(
                          "flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all",
                          consultType === "online"
                            ? "border-emerald-500 bg-emerald-50"
                            : "border-slate-100 bg-slate-50",
                        )}
                      >
                        <Video
                          size={20}
                          className={
                            consultType === "online"
                              ? "text-emerald-600"
                              : "text-slate-400"
                          }
                        />
                        <span className="text-[10px] text-slate-400 font-black uppercase">
                          Online
                        </span>
                      </button>
                    </div>

                    {/* Address (in-person) */}
                    {consultType === "inPerson" && (
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                          Your Address
                        </label>
                        <input
                          type="text"
                          value={patientAddress}
                          onChange={(e) => setPatientAddress(e.target.value)}
                          placeholder="Full address for home visit"
                          className="w-full p-4 bg-slate-50 border text-slate-600 border-slate-100 rounded-2xl text-sm focus:ring-2 ring-emerald-500 outline-none"
                        />
                      </div>
                    )}

                    {/* Duration (online) */}
                    {consultType === "online" && (
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center">
                          Consultation Duration
                        </p>
                        <div className="flex flex-wrap justify-center gap-2">
                          {DURATIONS.map((d) => (
                            <button
                              key={d}
                              onClick={() => setSelectedDuration(d)}
                              className={cn(
                                "px-5 py-3 rounded-xl text-[10px] font-black transition-all",
                                selectedDuration === d
                                  ? "bg-slate-900 text-white"
                                  : "bg-slate-100 text-slate-400",
                              )}
                            >
                              {d}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Improved UI Date Picker */}
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Select Date
                      </label>
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10">
                          <CalendarIcon size={18} />
                        </div>
                        <DatePicker
                          selected={selectedDate}
                          onChange={(date: any) => setSelectedDate(date)}
                          minDate={minDate}
                          maxDate={maxDate}
                          dateFormat="MMMM d, yyyy"
                          placeholderText="Choose your appointment date"
                          className="w-full pl-12 pr-4 py-4 bg-slate-50 text-slate-700 font-semibold border border-slate-100 rounded-2xl text-sm focus:ring-2 ring-emerald-500 outline-none cursor-pointer group-hover:border-slate-200 transition-all"
                        />
                      </div>
                    </div>

                    {/* Time Slots */}
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                        Available Times
                      </p>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                        {timeSlots.map((t) => (
                          <button
                            key={t}
                            onClick={() => setSelectedTime(t)}
                            className={cn(
                              "py-4 rounded-2xl text-xs font-bold border-2 transition-all",
                              selectedTime === t
                                ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                : "border-slate-50 bg-slate-50 text-slate-400",
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
                      className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-600 transition-all"
                    >
                      Continue to Payment
                    </button>
                  </div>
                )}

                {/* Step 3: Payment */}
                {bookingStep === "payment" && (
                  <div className="space-y-8 animate-in zoom-in-95">
                    <div className="bg-emerald-50/50 border border-emerald-100 p-8 rounded-[40px] space-y-6">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-emerald-600 uppercase">
                          Consultation Fee
                        </span>
                        <span className="text-4xl font-black text-slate-900">
                          ₦{viewingMedic.price?.toLocaleString()}
                        </span>
                      </div>
                      <div className="h-px bg-emerald-100/50" />
                      <div className="grid grid-cols-2 gap-6 text-sm">
                        <div>
                          <p className="text-[9px] font-black text-slate-300 uppercase mb-1">
                            Type
                          </p>
                          <p className="font-bold text-slate-600">
                            {consultType === "online" ? "Online" : "In-Person"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-300 uppercase mb-1">
                            Date
                          </p>
                          <p className="font-bold text-slate-600">
                            {selectedDate?.toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-300 uppercase mb-1">
                            Time
                          </p>
                          <p className="font-bold text-slate-600">
                            {selectedTime}
                          </p>
                        </div>
                        {consultType === "online" && (
                          <div>
                            <p className="text-[9px] font-black text-slate-300 uppercase mb-1">
                              Duration
                            </p>
                            <p className="font-bold text-slate-600">
                              {selectedDuration}
                            </p>
                          </div>
                        )}
                        {consultType === "inPerson" && (
                          <div className="col-span-2">
                            <p className="text-[9px] font-black text-slate-300 uppercase mb-1">
                              Address
                            </p>
                            <p className="font-bold text-slate-600 truncate">
                              {patientAddress}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={handlePayment}
                      disabled={isProcessing}
                      className="w-full py-6 bg-emerald-500 text-white rounded-[28px] font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-emerald-200 flex items-center justify-center gap-3"
                    >
                      {isProcessing ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        "Pay with Paystack"
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

// --- Subcomponents (unchanged) ---

function MedicCard({ medic, onOpen, isComparing, onCompare }: any) {
  return (
    <motion.div
      whileHover={{ y: -8 }}
      className="bg-white rounded-[48px] border border-slate-100 p-6 shadow-sm hover:shadow-xl transition-all group cursor-pointer"
      onClick={onOpen}
    >
      <div className="flex justify-between items-start mb-6">
        <img
          src={medic.profileImage}
          className="w-20 h-20 rounded-[28px] object-cover"
        />
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCompare();
          }}
          className={cn(
            "p-3 rounded-2xl transition-all",
            isComparing
              ? "bg-emerald-500 text-white"
              : "bg-slate-50 text-slate-300 hover:text-slate-900",
          )}
        >
          <Scale size={18} />
        </button>
      </div>

      <h3 className="text-xl font-bold text-slate-900 mb-1">{medic.name}</h3>
      <p className="text-emerald-500 text-[9px] font-black uppercase tracking-widest mb-4">
        {medic.specialty}
      </p>

      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-1 text-slate-400 text-[10px]">
          <MapPin size={12} /> {medic.city}
        </div>
        <div className="flex items-center gap-1 text-slate-400 text-[10px]">
          <Clock size={12} /> {medic.experience}y
        </div>
      </div>

      <div className="flex items-center gap-1 text-slate-400 text-[9px] mb-6">
        <Languages size={10} /> {medic.languages?.slice(0, 2).join(", ")}
        {medic.languages?.length > 2 && "..."}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-50">
        <div>
          <p className="text-[9px] font-black text-slate-300 uppercase">Rate</p>
          <p className="text-xl font-black text-slate-900">
            ₦{medic.price?.toLocaleString()}
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
          className="bg-slate-900 text-white p-4 rounded-2xl hover:bg-emerald-500 transition-colors"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </motion.div>
  );
}

function DetailBox({ label, value }: any) {
  return (
    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
      <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mb-1">
        {label}
      </p>
      <p className="text-xs font-bold text-slate-900 truncate">
        {value || "—"}
      </p>
    </div>
  );
}

function CompareRow({ label, values, isPrice, isButton }: any) {
  return (
    <tr className="border-b border-slate-50">
      <td className="py-6 font-black text-slate-400 uppercase text-[9px] tracking-widest">
        {label}
      </td>
      {values.map((v: any, i: number) => (
        <td
          key={i}
          className={cn(
            "py-6 px-4 text-center font-bold text-slate-700",
            isPrice && "text-emerald-600 text-base",
            isButton && "text-center",
          )}
        >
          {v}
        </td>
      ))}
    </tr>
  );
}
