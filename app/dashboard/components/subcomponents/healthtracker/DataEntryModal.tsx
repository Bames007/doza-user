"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { X, Loader2, Check } from "lucide-react";
import { authPost } from "@/app/utils/client-auth";
import { metricConfig, MetricType } from "@/app/types/healthtracker";

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
  currentMetric,
  onClose,
  onSuccess,
}: DataEntryModalProps) {
  const isBP = currentMetric === "bloodPressure";
  const label = metricConfig[currentMetric].label;

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
      type: currentMetric,
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
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-md z-[100]"
      />

      <motion.div
        initial={{ y: "30%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "30%", opacity: 0 }}
        transition={{ type: "spring", damping: 26, stiffness: 220 }}
        className="fixed bottom-0 sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 w-full sm:max-w-md bg-white rounded-t-[2.5rem] sm:rounded-2xl p-7 shadow-2xl border border-slate-100 z-[101] font-poppins"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="font-black text-2xl text-slate-900 uppercase italic leading-none">
              Add New {label}
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1.5">
              Save your latest reading below
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all"
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
          className="space-y-5"
        >
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] mb-2.5">
              Date of Reading
            </label>
            <input
              type="date"
              {...(isBP
                ? bpForm.register("date")
                : standardForm.register("date"))}
              className="w-full text-slate-900 text-xs font-semibold bg-slate-50 border border-slate-200 focus:border-slate-900 focus:bg-white rounded-xl px-4 py-3.5 outline-none transition-all"
            />
          </div>

          {isBP ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] mb-2.5">
                  Systolic (Top #)
                </label>
                <input
                  type="number"
                  {...bpForm.register("systolic")}
                  className="w-full text-slate-900 bg-slate-50 border border-slate-200 focus:border-slate-900 focus:bg-white rounded-xl px-4 py-3 outline-none transition-all font-bebas tracking-wider text-2xl"
                />
                {bpForm.formState.errors.systolic && (
                  <p className="text-[10px] text-red-500 mt-1.5 font-bold tracking-tight">
                    {bpForm.formState.errors.systolic.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] mb-2.5">
                  Diastolic (Bottom #)
                </label>
                <input
                  type="number"
                  {...bpForm.register("diastolic")}
                  className="w-full text-slate-900 bg-slate-50 border border-slate-200 focus:border-slate-900 focus:bg-white rounded-xl px-4 py-3 outline-none transition-all font-bebas tracking-wider text-2xl"
                />
                {bpForm.formState.errors.diastolic && (
                  <p className="text-[10px] text-red-500 mt-1.5 font-bold tracking-tight">
                    {bpForm.formState.errors.diastolic.message}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] mb-2.5">
                Enter Value ({metricConfig[currentMetric].unit})
              </label>
              <input
                type="number"
                step="any"
                {...standardForm.register("value")}
                className="w-full text-slate-900 border border-slate-200 focus:border-slate-900 bg-slate-50 focus:bg-white rounded-xl px-4 py-3 outline-none transition-all font-bebas tracking-wider text-3xl"
              />
              {standardForm.formState.errors.value && (
                <p className="text-[10px] text-red-500 mt-1.5 font-bold tracking-tight">
                  {standardForm.formState.errors.value.message}
                </p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={activeSubmittingState}
            className="w-full mt-4 py-4 bg-slate-950 hover:bg-black disabled:bg-slate-100 disabled:text-slate-400 text-white text-[10px] font-black uppercase tracking-[0.4em] rounded-xl transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-950/5"
          >
            {activeSubmittingState ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <>
                <Check size={14} strokeWidth={3} className="text-[#22C55E]" />
                <span>Save Entry</span>
              </>
            )}
          </button>
        </form>
      </motion.div>
    </>
  );
}
