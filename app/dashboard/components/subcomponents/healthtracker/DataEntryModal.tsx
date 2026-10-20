"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Plus, ChevronDown, Check } from "lucide-react";
import Image from "next/image";
import { authPost } from "@/app/utils/client-auth";
import { metricConfig, MetricType } from "@/app/types/healthtracker";
import { poppins, bebasNeue } from "@/app/constants";
import { cn } from "@/app/utils/utils";
import { useState, useEffect, useRef } from "react";

import DatePicker from "@/app/components/CustomDatePicker";

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2";

const standardSchema = z.object({
  date: z.string().min(1, "Please choose a date"),
  value: z.coerce.number().positive("Please enter a number greater than 0"),
});

const bpSchema = z.object({
  date: z.string().min(1, "Please choose a date"),
  systolic: z.coerce.number().int().positive("Enter a valid top number"),
  diastolic: z.coerce.number().int().positive("Enter a valid bottom number"),
});

type StandardFormValues = z.input<typeof standardSchema>;
type BloodPressureFormValues = z.input<typeof bpSchema>;

interface DataEntryModalProps {
  currentMetric: MetricType;
  onClose: () => void;
  onSuccess: () => void;
}

export function DataEntryModal({
  currentMetric: initialMetric,
  onClose,
  onSuccess,
}: DataEntryModalProps) {
  const [selectedMetric, setSelectedMetric] =
    useState<MetricType>(initialMetric);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isBP = selectedMetric === "bloodPressure";
  const label = metricConfig[selectedMetric]?.label ?? "Metric";
  const unit = metricConfig[selectedMetric]?.unit ?? "";

  const standardForm = useForm<StandardFormValues>({
    resolver: zodResolver(standardSchema),
    defaultValues: { date: new Date().toISOString().split("T")[0], value: 0 },
  });

  const bpForm = useForm<BloodPressureFormValues>({
    resolver: zodResolver(bpSchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      systolic: 0,
      diastolic: 0,
    },
  });

  const dateError =
    (bpForm.formState.errors.date?.message as string | undefined) ??
    (standardForm.formState.errors.date?.message as string | undefined);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isBP) bpForm.clearErrors();
    else standardForm.clearErrors();
  }, [selectedMetric]);

  const executeFormSubmit = async (payloadData: Record<string, any>) => {
    let finalValue: any;
    if (isBP) {
      finalValue = {
        systolic: Number(payloadData.systolic),
        diastolic: Number(payloadData.diastolic),
      };
    } else {
      finalValue = Number(payloadData.value);
    }

    const res = await authPost("/api/health-records", {
      date: payloadData.date,
      type: selectedMetric,
      value: finalValue,
    });

    if (res?.success) onSuccess();
    else alert("Could not save your reading. Please try again.");
  };

  const activeSubmittingState = isBP
    ? bpForm.formState.isSubmitting
    : standardForm.formState.isSubmitting;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100]"
        aria-hidden
      />

      {/* Sheet / Modal */}
      <motion.div
        initial={{ y: "30%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "30%", opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 240 }}
        className={cn(
          "fixed bottom-0 left-0 right-0 sm:left-1/2 sm:top-1/2 sm:right-auto sm:bottom-auto sm:-translate-x-1/2 sm:-translate-y-1/2",
          "w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl",
          "pt-4 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6",
          "shadow-2xl border border-slate-200/80 z-[101] max-h-[92vh] overflow-y-auto",
          poppins.className,
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="data-entry-title"
      >
        {/* Drag handle (mobile only) */}
        <div className="sm:hidden flex justify-center mb-3" aria-hidden>
          <div className="w-10 h-1 rounded-full bg-slate-300" />
        </div>

        {/* Header */}
        <div className="flex justify-between items-start gap-3 mb-5 pb-4 border-b border-slate-100">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2">
              <div className="relative w-5 h-5 flex items-center justify-center">
                <Image
                  src="/logo.png"
                  alt=""
                  width={20}
                  height={20}
                  className="object-contain"
                />
              </div>
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                Doza Medic Log
              </p>
            </div>
            <h3
              id="data-entry-title"
              className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-tight"
            >
              Add new reading
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={cn(
              "shrink-0 min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 transition-colors",
              FOCUS,
            )}
          >
            <X size={18} strokeWidth={2.5} aria-hidden />
          </button>
        </div>

        <form
          onSubmit={
            isBP
              ? bpForm.handleSubmit(executeFormSubmit)
              : standardForm.handleSubmit(executeFormSubmit)
          }
          className="space-y-4"
        >
          {/* Metric selector dropdown */}
          <div className="space-y-1.5 relative" ref={dropdownRef}>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
              Metric type
            </label>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              aria-haspopup="listbox"
              aria-expanded={isDropdownOpen}
              className={cn(
                "w-full min-h-12 flex items-center justify-between gap-2",
                "bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl px-4",
                "text-sm font-semibold text-slate-900 transition-colors",
                "focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20",
                isDropdownOpen &&
                  "bg-white border-emerald-600 ring-2 ring-emerald-600/20",
              )}
            >
              <span className="flex items-center gap-2 min-w-0">
                <span className="truncate">{label}</span>
                {unit && (
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md shrink-0">
                    {unit}
                  </span>
                )}
              </span>
              <ChevronDown
                size={16}
                className={cn(
                  "text-slate-500 transition-transform duration-200 shrink-0",
                  isDropdownOpen && "rotate-180 text-emerald-700",
                )}
                aria-hidden
              />
            </button>

            <AnimatePresence>
              {isDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  role="listbox"
                  className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-64 overflow-y-auto p-1.5 space-y-0.5"
                >
                  {Object.entries(metricConfig).map(([key, config]) => {
                    const isSelected = selectedMetric === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => {
                          setSelectedMetric(key as MetricType);
                          setIsDropdownOpen(false);
                        }}
                        className={cn(
                          "w-full min-h-11 flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-left transition-colors",
                          isSelected
                            ? "bg-emerald-50 text-emerald-900"
                            : "text-slate-700 hover:bg-slate-50",
                          FOCUS,
                        )}
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <span className="truncate">{config.label}</span>
                          <span className="text-xs font-medium text-slate-500 shrink-0">
                            ({config.unit})
                          </span>
                        </span>
                        {isSelected && (
                          <Check
                            size={16}
                            className="text-emerald-700 shrink-0"
                            strokeWidth={3}
                            aria-hidden
                          />
                        )}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Date — uses the custom DatePicker */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
              Date of reading
            </label>
            {isBP ? (
              <Controller
                control={bpForm.control}
                name="date"
                render={({ field }) => (
                  <DatePicker
                    value={field.value ?? ""}
                    onChange={(iso: string) => field.onChange(iso)}
                    placeholder="Select date"
                    maxDate={new Date()}
                  />
                )}
              />
            ) : (
              <Controller
                control={standardForm.control}
                name="date"
                render={({ field }) => (
                  <DatePicker
                    value={field.value ?? ""}
                    onChange={(iso: string) => field.onChange(iso)}
                    placeholder="Select date"
                    maxDate={new Date()}
                  />
                )}
              />
            )}
            {dateError && (
              <p role="alert" className="text-xs text-rose-700 font-semibold">
                {dateError}
              </p>
            )}
          </div>

          {/* Value(s) */}
          {isBP ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label
                  htmlFor="systolic"
                  className="block text-xs font-bold text-slate-600 uppercase tracking-wider"
                >
                  Systolic (top)
                </label>
                <input
                  id="systolic"
                  type="number"
                  inputMode="numeric"
                  placeholder="120"
                  {...bpForm.register("systolic")}
                  className={cn(
                    "w-full min-h-12 text-slate-900 bg-slate-50 border border-slate-200 focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-600/20 rounded-xl px-4 outline-none transition-all text-2xl font-black text-center",
                    bebasNeue.className,
                  )}
                />
                {bpForm.formState.errors.systolic && (
                  <p
                    role="alert"
                    className="text-xs text-rose-700 font-semibold"
                  >
                    {bpForm.formState.errors.systolic.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="diastolic"
                  className="block text-xs font-bold text-slate-600 uppercase tracking-wider"
                >
                  Diastolic (bottom)
                </label>
                <input
                  id="diastolic"
                  type="number"
                  inputMode="numeric"
                  placeholder="80"
                  {...bpForm.register("diastolic")}
                  className={cn(
                    "w-full min-h-12 text-slate-900 bg-slate-50 border border-slate-200 focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-600/20 rounded-xl px-4 outline-none transition-all text-2xl font-black text-center",
                    bebasNeue.className,
                  )}
                />
                {bpForm.formState.errors.diastolic && (
                  <p
                    role="alert"
                    className="text-xs text-rose-700 font-semibold"
                  >
                    {bpForm.formState.errors.diastolic.message}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label
                  htmlFor="reading-value"
                  className="block text-xs font-bold text-slate-600 uppercase tracking-wider"
                >
                  Value
                </label>
                {unit && (
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                    {unit}
                  </span>
                )}
              </div>
              <input
                id="reading-value"
                type="number"
                inputMode="decimal"
                step="any"
                placeholder="0"
                {...standardForm.register("value")}
                className={cn(
                  "w-full min-h-14 text-slate-900 bg-slate-50 border border-slate-200 focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-600/20 rounded-xl px-4 outline-none transition-all text-3xl font-black text-center",
                  bebasNeue.className,
                )}
              />
              {standardForm.formState.errors.value && (
                <p role="alert" className="text-xs text-rose-700 font-semibold">
                  {standardForm.formState.errors.value.message}
                </p>
              )}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={activeSubmittingState}
            className={cn(
              "w-full min-h-12 mt-2 rounded-xl bg-emerald-600 text-white text-sm font-bold",
              "flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20",
              "hover:bg-emerald-700 active:scale-[0.98] transition-all",
              "disabled:bg-slate-100 disabled:text-slate-500 disabled:shadow-none disabled:cursor-not-allowed",
              FOCUS,
            )}
          >
            {activeSubmittingState ? (
              <>
                <Loader2 size={16} className="animate-spin" aria-hidden />
                <span>Saving…</span>
              </>
            ) : (
              <>
                <Plus size={16} strokeWidth={3} aria-hidden />
                <span>Save reading</span>
              </>
            )}
          </button>
        </form>
      </motion.div>
    </>
  );
}
