// app/dashboard/components/panels/SettingsPanel.tsx
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSettings } from "../../hooks/useUserData";
import {
  Bell,
  CreditCard,
  Key,
  Trash2,
  Loader2,
  ChevronRight,
  Crown,
  Save,
  Lock,
  ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ChangePasswordModal from "../ChangePasswordModal";
import DeleteAccountModal from "../DeleteAccountModal";
import PlanModal from "../modals/PlanModal";
import { authPut } from "@/app/utils/client-auth";
import { cn } from "@/app/utils/utils";
import { poppins } from "@/app/constants";

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2";

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

  /* ─── Skeleton ─────────────────────────────────────────── */
  if (isLoading)
    return (
      <div
        className={cn(
          "min-h-screen bg-[#F8FAFC] pb-28 pt-2 animate-pulse",
          poppins.className,
        )}
      >
        <div className="max-w-3xl mx-auto px-4 pt-3 sm:px-6 lg:px-8 space-y-4 lg:space-y-5">
          <div className="space-y-2">
            <div className="h-9 w-40 rounded-lg bg-emerald-100" />
            <div className="h-3.5 w-72 rounded-lg bg-emerald-100/70" />
          </div>
          <div className="h-32 rounded-2xl bg-emerald-100/50" />
          <div className="h-48 rounded-2xl bg-emerald-100/50" />
          <div className="h-44 rounded-2xl bg-emerald-100/50" />
        </div>
      </div>
    );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "min-h-screen bg-[#F8FAFC] pb-32 pt-2 text-slate-900",
        poppins.className,
      )}
    >
      <main className="mx-auto max-w-3xl px-4 pt-3 sm:px-6 lg:px-8 space-y-4 lg:space-y-5">
        {/* ─── HEADER ──────────────────────────────────────── */}
        <header className="pt-1 lg:pt-2 flex flex-col gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight leading-tight">
              Settings
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md">
              Manage your membership, notifications, and account security.
            </p>
          </div>
        </header>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 lg:space-y-5"
        >
          {/* ─── SUBSCRIPTION ───────────────────────────────── */}
          <section className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl p-5 sm:p-6 text-white shadow-sm shadow-emerald-600/20 relative overflow-hidden">
            <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none" />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/15 rounded-xl flex items-center justify-center shrink-0">
                  <Crown className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-100" />
                </div>
                <div className="min-w-0">
                  <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-wider mb-0.5">
                    Active Membership
                  </p>
                  <h3 className="text-xl sm:text-2xl font-bold tracking-tight leading-tight truncate">
                    {settings?.subscription?.plan || "Standard Access"}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModals((prev) => ({ ...prev, plan: true }))}
                className={cn(
                  "inline-flex items-center justify-center gap-1.5 bg-white text-emerald-700 px-4 min-h-11 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-emerald-50 transition-all shrink-0",
                  FOCUS,
                )}
              >
                Modify Plan <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </section>

          {/* ─── NOTIFICATIONS ──────────────────────────────── */}
          <section className="bg-white rounded-2xl border border-emerald-100 p-5 sm:p-6 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                <Bell size={18} className="text-emerald-600" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 leading-tight">
                  Communication
                </h2>
                <p className="text-[11px] text-emerald-700/60 font-medium">
                  Manage how you receive alerts
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(["email", "push"] as const).map((type) => (
                <label
                  key={type}
                  className="flex items-center justify-between gap-3 p-4 bg-emerald-50/50 rounded-xl cursor-pointer hover:bg-emerald-50 border border-emerald-100 hover:border-emerald-200 transition-all"
                >
                  <div className="space-y-0.5 min-w-0">
                    <span className="capitalize font-bold text-emerald-900 text-sm">
                      {type} Alerts
                    </span>
                    <p className="text-[11px] text-emerald-700/70 font-medium">
                      Receive updates via {type}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    {...register(`notifications.${type}`)}
                    className="w-5 h-5 accent-emerald-600 cursor-pointer rounded shrink-0"
                  />
                </label>
              ))}
            </div>
          </section>

          {/* ─── SECURITY ───────────────────────────────────── */}
          <section className="bg-white rounded-2xl border border-emerald-100 p-5 sm:p-6 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                <Lock size={18} className="text-emerald-600" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 leading-tight">
                  Privacy &amp; Security
                </h2>
                <p className="text-[11px] text-emerald-700/60 font-medium">
                  Manage your security credentials
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() =>
                  setModals((prev) => ({ ...prev, password: true }))
                }
                className={cn(
                  "w-full flex items-center justify-between gap-3 p-4 bg-emerald-50/50 rounded-xl hover:bg-emerald-50 border border-emerald-100 hover:border-emerald-200 transition-all group text-left",
                  FOCUS,
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center text-emerald-600 shrink-0">
                    <Key size={16} />
                  </div>
                  <span className="text-sm font-bold text-emerald-900 truncate">
                    Update Credentials
                  </span>
                </div>
                <ArrowRight
                  size={16}
                  className="text-emerald-400 group-hover:translate-x-1 transition-transform shrink-0"
                />
              </button>

              <button
                type="button"
                onClick={() => setModals((prev) => ({ ...prev, delete: true }))}
                className={cn(
                  "w-full flex items-center justify-between gap-3 p-4 bg-white rounded-xl hover:bg-emerald-50/50 border border-emerald-100 transition-all group text-left",
                  FOCUS,
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 bg-emerald-800 rounded-lg flex items-center justify-center text-white shrink-0">
                    <Trash2 size={16} />
                  </div>
                  <span className="text-sm font-bold text-emerald-800 truncate">
                    Purge Data &amp; Account
                  </span>
                </div>
                <ArrowRight
                  size={16}
                  className="text-emerald-400 group-hover:translate-x-1 transition-transform shrink-0"
                />
              </button>
            </div>
          </section>
        </form>
      </main>

      {/* ─── FLOATING SAVE ────────────────────────────────── */}
      <AnimatePresence>
        {isDirty && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-24 sm:bottom-8 left-0 right-0 px-4 z-[60] pointer-events-none"
          >
            <div className="max-w-sm mx-auto">
              <button
                type="submit"
                form=""
                onClick={handleSubmit(onSubmit)}
                disabled={isSaving}
                className={cn(
                  "pointer-events-auto w-full h-12 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-600/25 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 active:scale-[0.98]",
                  FOCUS,
                )}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Commit Changes
                    </span>
                    <Save className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
    </motion.div>
  );
}
