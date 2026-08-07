"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Plus, Calendar, ChevronDown, Check } from "lucide-react";
import Image from "next/image";
import { authPost } from "@/app/utils/client-auth";
import { metricConfig, MetricType } from "@/app/types/healthtracker";
import { poppins, bebasNeue } from "@/app/constants";
import { cn } from "@/app/utils/utils";
import { useState, useEffect, useRef } from "react";

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

  // Close custom dropdown when clicking outside
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

  // Reset relevant form errors or state when switching metric type inside modal
  useEffect(() => {
    if (isBP) {
      bpForm.clearErrors();
    } else {
      standardForm.clearErrors();
    }
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

    if (res?.success) {
      onSuccess();
    } else {
      alert("Could not save your reading. Please try again.");
    }
  };

  const activeSubmittingState = isBP
    ? bpForm.formState.isSubmitting
    : standardForm.formState.isSubmitting;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100]"
      />

      <motion.div
        initial={{ y: "30%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "30%", opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 240 }}
        className={cn(
          "fixed bottom-0 sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 w-full sm:max-w-md bg-white rounded-t-[2rem] sm:rounded-2xl p-6 sm:p-7 shadow-2xl border border-slate-100 z-[101]",
          poppins.className,
        )}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-5 pb-4 border-b border-slate-100/80">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="relative w-5 h-5 flex items-center justify-center">
                <Image
                  src="/logo.png"
                  alt="Doza Logo"
                  width={20}
                  height={20}
                  className="object-contain"
                />
              </div>
              <p className="text-[9px] font-extrabold text-emerald-600 uppercase tracking-[0.25em]">
                Doza Log
              </p>
            </div>
            <h3 className="font-extrabold text-xl text-slate-900 uppercase tracking-tight leading-none">
              Add New Reading
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
          >
            <X size={15} strokeWidth={2.5} />
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
          {/* Custom Metric Selector Dropdown */}
          <div className="space-y-1.5 relative" ref={dropdownRef}>
            <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-[0.25em]">
              Select Metric Type
            </label>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full flex items-center justify-between text-slate-900 text-xs font-bold bg-slate-50/80 border border-slate-200/80 hover:border-slate-300 focus:border-emerald-600 focus:bg-white rounded-xl px-4 py-3.5 outline-none transition-all cursor-pointer shadow-2xs"
            >
              <span className="flex items-center gap-2">
                <span>{label}</span>
                {unit && (
                  <span className="text-[10px] font-extrabold text-emerald-600 px-2 py-0.5 bg-emerald-50 rounded-md">
                    {unit}
                  </span>
                )}
              </span>
              <ChevronDown
                size={14}
                className={cn(
                  "text-slate-400 transition-transform duration-200",
                  isDropdownOpen && "rotate-180 text-emerald-600",
                )}
              />
            </button>

            <AnimatePresence>
              {isDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-xl shadow-xl z-50 max-h-56 overflow-y-auto p-1.5 space-y-1"
                >
                  {Object.entries(metricConfig).map(([key, config]) => {
                    const isSelected = selectedMetric === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setSelectedMetric(key as MetricType);
                          setIsDropdownOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer text-left",
                          isSelected
                            ? "bg-emerald-50 text-emerald-900 font-bold"
                            : "text-slate-700 hover:bg-slate-50 hover:text-slate-900",
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <span>{config.label}</span>
                          <span className="text-[9px] font-extrabold text-slate-400 uppercase">
                            ({config.unit})
                          </span>
                        </span>
                        {isSelected && (
                          <Check
                            size={14}
                            className="text-emerald-600"
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

          {/* Date Input Field */}
          <div className="space-y-1.5">
            <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-[0.25em]">
              Date of Reading
            </label>
            <div className="relative">
              <input
                type="date"
                {...(isBP
                  ? bpForm.register("date")
                  : standardForm.register("date"))}
                className="w-full text-slate-900 text-xs font-semibold bg-slate-50/80 border border-slate-200/80 focus:border-emerald-600 focus:bg-white rounded-xl px-4 py-3.5 outline-none transition-all shadow-2xs"
              />
              <Calendar
                size={14}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>

          {/* Metric Value Input(s) */}
          {isBP ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-[0.25em]">
                  Systolic (Top)
                </label>
                <input
                  type="number"
                  placeholder="120"
                  {...bpForm.register("systolic")}
                  className={cn(
                    "w-full text-slate-900 bg-slate-50/80 border border-slate-200/80 focus:border-emerald-600 focus:bg-white rounded-xl px-4 py-3 outline-none transition-all text-2xl font-black shadow-2xs",
                    bebasNeue.className,
                  )}
                />
                {bpForm.formState.errors.systolic && (
                  <p className="text-[10px] text-red-500 font-bold tracking-tight">
                    {bpForm.formState.errors.systolic.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-[0.25em]">
                  Diastolic (Bottom)
                </label>
                <input
                  type="number"
                  placeholder="80"
                  {...bpForm.register("diastolic")}
                  className={cn(
                    "w-full text-slate-900 bg-slate-50/80 border border-slate-200/80 focus:border-emerald-600 focus:bg-white rounded-xl px-4 py-3 outline-none transition-all text-2xl font-black shadow-2xs",
                    bebasNeue.className,
                  )}
                />
                {bpForm.formState.errors.diastolic && (
                  <p className="text-[10px] text-red-500 font-bold tracking-tight">
                    {bpForm.formState.errors.diastolic.message}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-[0.25em]">
                  Value Input
                </label>
                <span className="text-[9px] font-extrabold text-emerald-600 uppercase tracking-widest">
                  {unit}
                </span>
              </div>
              <input
                type="number"
                step="any"
                placeholder="0.00"
                {...standardForm.register("value")}
                className={cn(
                  "w-full text-slate-900 bg-slate-50/80 border border-slate-200/80 focus:border-emerald-600 focus:bg-white rounded-xl px-4 py-3 outline-none transition-all text-3xl font-black shadow-2xs",
                  bebasNeue.className,
                )}
              />
              {standardForm.formState.errors.value && (
                <p className="text-[10px] text-red-500 font-bold tracking-tight">
                  {standardForm.formState.errors.value.message}
                </p>
              )}
            </div>
          )}

          {/* Submit Action */}
          <button
            type="submit"
            disabled={activeSubmittingState}
            className="w-full mt-2 py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-100 disabled:text-slate-400 text-white text-[10px] font-extrabold uppercase tracking-[0.3em] rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/15 cursor-pointer"
          >
            {activeSubmittingState ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <>
                <Plus size={15} strokeWidth={3} />
                <span>Save Reading</span>
              </>
            )}
          </button>
        </form>
      </motion.div>
    </>
  );
}
