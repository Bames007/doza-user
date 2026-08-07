"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSettings } from "../../hooks/useUserData";
import {
  Bell,
  Shield,
  CreditCard,
  Key,
  Trash2,
  Loader2,
  ChevronRight,
  Crown,
  Save,
  Lock,
  Database,
  ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ChangePasswordModal from "../ChangePasswordModal";
import DeleteAccountModal from "../DeleteAccountModal";
import PlanModal from "../modals/PlanModal";
import { authPut } from "@/app/utils/client-auth";
import { cn } from "@/app/utils/utils";
import { poppins } from "@/app/constants";

const settingsSchema = z.object({
  notifications: z.object({
    email: z.boolean(),
    push: z.boolean(),
  }),
  privacy: z.object({
    shareWithFamily: z.boolean(),
    dataRetention: z.enum(["forever", "1year", "6months"]),
  }),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function SettingsPanel() {
  const { settings, isLoading, error, mutateSettings } = useSettings();
  const [isSaving, setIsSaving] = useState(false);
  const [modals, setModals] = useState({
    password: false,
    delete: false,
    plan: false,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { isDirty },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      notifications: { email: true, push: false },
      privacy: { shareWithFamily: true, dataRetention: "forever" },
    },
  });

  useEffect(() => {
    if (settings) {
      reset({
        notifications: settings.notifications,
        privacy: settings.privacy,
      });
    }
  }, [settings, reset]);

  const onSubmit = async (data: SettingsFormValues) => {
    setIsSaving(true);
    try {
      const result = await authPut("/api/user/settings", data);
      if (result.success) {
        mutateSettings();
        reset(data);
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading)
    return (
      <div
        className={cn(
          "min-h-screen bg-[#F8FAFC] pb-44 pt-8",
          poppins.className,
        )}
      >
        <div className="max-w-3xl mx-auto px-4 md:px-6 space-y-10 animate-pulse">
          {/* Header Skeleton */}
          <div className="space-y-3">
            <div className="h-4 w-32 bg-slate-200 rounded-md" />
            <div className="h-10 w-64 bg-slate-200 rounded-lg" />
          </div>

          {/* Subscription Skeleton */}
          <div className="h-36 rounded-[32px] bg-slate-200 w-full" />

          {/* Notifications Skeleton */}
          <div className="h-56 rounded-[32px] bg-white border border-slate-200" />

          {/* Security Skeleton */}
          <div className="h-48 rounded-[32px] bg-white border border-slate-200" />
        </div>
      </div>
    );

  return (
    <div
      className={cn("min-h-screen bg-[#F8FAFC] pb-40 pt-8", poppins.className)}
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto px-4 md:px-6"
      >
        {/* --- HEADER --- */}
        <header className="mb-12">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-[2px] w-8 bg-emerald-500" />
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
              Security & Identity
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">
            Settings
          </h1>
        </header>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
          {/* --- SUBSCRIPTION CARD --- */}
          <section className="bg-slate-900 rounded-[32px] p-8 text-white shadow-lg relative overflow-hidden group border border-slate-800">
            <div className="absolute -right-8 -bottom-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative z-10">
              <div className="flex gap-6 items-center">
                <div className="w-16 h-16 bg-white/10 backdrop-blur-xl rounded-[24px] flex items-center justify-center border border-white/10 shrink-0">
                  <Crown className="w-8 h-8 text-emerald-400" />
                </div>
                <div>
                  <p className="text-emerald-400 text-[11px] font-bold uppercase tracking-wider mb-1">
                    Active Membership
                  </p>
                  <h3 className="text-3xl font-bold tracking-tight">
                    {settings?.subscription?.plan || "Standard Access"}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModals((prev) => ({ ...prev, plan: true }))}
                className="w-full md:w-auto bg-white text-slate-900 px-8 py-4 rounded-2xl font-bold text-xs uppercase tracking-wider hover:bg-emerald-50 transition-all flex items-center justify-center gap-3 shadow-md"
              >
                Modify Plan <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </section>

          {/* --- NOTIFICATIONS SECTION --- */}
          <section className="bg-white rounded-[32px] border border-slate-200/80 p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600 border border-emerald-100/60">
                <Bell size={20} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900 leading-none mb-1">
                  Communication
                </h2>
                <p className="text-xs text-slate-400 font-medium">
                  Manage how you receive alerts
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {["email", "push"].map((type) => (
                <label
                  key={type}
                  className="flex items-center justify-between p-5 bg-slate-50/80 rounded-2xl cursor-pointer hover:bg-emerald-50/50 border border-slate-200/80 hover:border-emerald-200 transition-all group"
                >
                  <div className="space-y-0.5">
                    <span className="capitalize font-bold text-slate-800 text-sm">
                      {type} Alerts
                    </span>
                    <p className="text-xs text-slate-400 font-medium">
                      Receive system updates via {type}
                    </p>
                  </div>
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      {...register(`notifications.${type as "email" | "push"}`)}
                      className="w-5 h-5 accent-emerald-600 cursor-pointer rounded"
                    />
                  </div>
                </label>
              ))}
            </div>
          </section>

          {/* --- SECURITY ZONE --- */}
          <section className="bg-white rounded-[32px] border border-slate-200/80 p-8 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2.5 bg-slate-100 rounded-xl text-slate-700 border border-slate-200/60">
                <Lock size={20} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900 leading-none mb-1">
                  Privacy & Security
                </h2>
                <p className="text-xs text-slate-400 font-medium">
                  Manage your security credentials
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div
                onClick={() =>
                  setModals((prev) => ({ ...prev, password: true }))
                }
                className="flex items-center justify-between p-5 bg-slate-50/80 rounded-2xl cursor-pointer hover:bg-slate-100 transition-all border border-slate-200/80 group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 group-hover:text-emerald-600 shadow-sm transition-colors border border-slate-200/60">
                    <Key size={18} />
                  </div>
                  <span className="text-sm font-bold text-slate-700">
                    Update Credentials
                  </span>
                </div>
                <ArrowRight
                  size={16}
                  className="text-slate-300 group-hover:translate-x-1 transition-transform"
                />
              </div>

              <div
                onClick={() => setModals((prev) => ({ ...prev, delete: true }))}
                className="flex items-center justify-between p-5 bg-rose-50/30 rounded-2xl cursor-pointer hover:bg-rose-50 transition-all border border-rose-100 group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-rose-400 shadow-sm border border-rose-100">
                    <Trash2 size={18} />
                  </div>
                  <span className="text-sm font-bold text-rose-600">
                    Purge Data & Account
                  </span>
                </div>
                <ArrowRight
                  size={16}
                  className="text-rose-300 group-hover:translate-x-1 transition-transform"
                />
              </div>
            </div>
          </section>

          {/* --- FLOATING SAVE STATUS --- */}
          <AnimatePresence>
            {isDirty && (
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="fixed bottom-10 left-0 right-0 px-4 z-[60] pointer-events-none"
              >
                <div className="max-w-sm mx-auto">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="pointer-events-auto w-full bg-slate-900 text-white p-5 rounded-[24px] shadow-xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-3 group border border-slate-800"
                  >
                    {isSaving ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold uppercase tracking-wider">
                          Commit Changes
                        </span>
                        <Save className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      </div>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </motion.div>

      {/* Modals */}
      <ChangePasswordModal
        isOpen={modals.password}
        onClose={() => setModals((p) => ({ ...p, password: false }))}
      />
      <DeleteAccountModal
        isOpen={modals.delete}
        onClose={() => setModals((p) => ({ ...p, delete: false }))}
      />
      <PlanModal
        isOpen={modals.plan}
        onClose={() => setModals((p) => ({ ...p, plan: false }))}
        currentPlan={settings?.subscription?.plan || "basic"}
      />
    </div>
  );
}
