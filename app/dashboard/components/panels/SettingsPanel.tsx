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
  HelpCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import ChangePasswordModal from "../ChangePasswordModal";
import DeleteAccountModal from "../DeleteAccountModal";
import PlanModal from "../modals/PlanModal";
import { authPut } from "@/app/utils/client-auth";
import { cn } from "@/app/utils/utils";
import { poppins, bebasNeue } from "@/app/constants";

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
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [planModalOpen, setPlanModalOpen] = useState(false);

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
      } else {
        alert("Error saving settings: " + result.error);
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-red-600">Error loading settings</div>;
  }

  const currentPlan = settings?.subscription?.plan || "basic";

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={cn("min-h-screen px-4 py-6 md:p-6 pb-28", poppins.className)}
      >
        <div className="max-w-3xl mx-auto">
          {/* Header with title */}
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-emerald-100 rounded-xl">
              <Shield className="w-6 h-6 text-emerald-600" />
            </div>
            <h1
              className={cn(
                "text-3xl font-bold text-gray-800",
                bebasNeue.className,
              )}
            >
              Settings
            </h1>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Notifications */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Bell className="w-5 h-5 text-emerald-600" />
                </div>
                <h2
                  className={cn(
                    "text-lg font-semibold text-gray-800",
                    bebasNeue.className,
                  )}
                >
                  Notifications
                </h2>
              </div>
              <div className="space-y-3 ml-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register("notifications.email")}
                    className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                  />
                  <span className="text-gray-700">Email notifications</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register("notifications.push")}
                    className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                  />
                  <span className="text-gray-700">Push notifications</span>
                </label>
              </div>
            </div>

            {/* Privacy */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Shield className="w-5 h-5 text-emerald-600" />
                </div>
                <h2
                  className={cn(
                    "text-lg font-semibold text-gray-800",
                    bebasNeue.className,
                  )}
                >
                  Privacy
                </h2>
              </div>
              <div className="space-y-4 ml-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register("privacy.shareWithFamily")}
                    className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                  />
                  <span className="text-gray-700">
                    Share health data with family members
                  </span>
                </label>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data retention period
                  </label>
                  <select
                    {...register("privacy.dataRetention")}
                    className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-700"
                  >
                    <option value="forever">Forever</option>
                    <option value="1year">1 year</option>
                    <option value="6months">6 months</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Subscription */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <CreditCard className="w-5 h-5 text-emerald-600" />
                </div>
                <h2
                  className={cn(
                    "text-lg font-semibold text-gray-800",
                    bebasNeue.className,
                  )}
                >
                  Subscription
                </h2>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 rounded-full">
                    <Crown className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Current plan</p>
                    <p className="text-xl font-semibold text-gray-900 capitalize">
                      {settings?.subscription?.plan || "Free"}
                    </p>
                    {settings?.subscription?.expiry && (
                      <p className="text-sm text-gray-500">
                        Expires:{" "}
                        {new Date(
                          settings.subscription.expiry,
                        ).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPlanModalOpen(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition shadow-sm min-h-[44px]"
                >
                  {settings?.subscription?.plan === "free"
                    ? "Upgrade Plan"
                    : "Change Plan"}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-white border border-red-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition">
              <h2
                className={cn(
                  "text-lg font-semibold mb-4 text-red-600",
                  bebasNeue.className,
                )}
              >
                Danger Zone
              </h2>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setPasswordModalOpen(true)}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition min-h-[44px]"
                >
                  <Key className="w-4 h-4" />
                  Change Password
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(true)}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition min-h-[44px]"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Account
                </button>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!isDirty || isSaving}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium shadow-sm min-h-[44px]"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSaving ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </form>
        </div>
      </motion.div>

      <ChangePasswordModal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
      />
      <DeleteAccountModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
      />
      <PlanModal
        isOpen={planModalOpen}
        onClose={() => setPlanModalOpen(false)}
        currentPlan={currentPlan}
      />
    </>
  );
}
