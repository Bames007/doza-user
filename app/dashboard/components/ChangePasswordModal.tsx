"use client";

import React, { useState } from "react";
import { X, Loader2, ShieldCheck, Lock, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/app/utils/utils";
import { poppins, bebasNeue } from "@/app/constants";

export default function ChangePasswordModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass !== confirm) {
      setError("New passwords do not match");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: current,
          newPassword: newPass,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onClose();
        // You could replace alert with a toast later
        alert("Security Credentials Updated");
      } else {
        setError(data.error || "Authentication failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-end sm:items-center justify-center z-[100] p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 50, scale: 0.95 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 50, scale: 0.95 }}
            className={cn(
              "bg-white w-full max-w-md rounded-[32px] p-8 shadow-2xl relative overflow-hidden",
              poppins.className,
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Background Accent */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-50 rounded-full opacity-50 pointer-events-none" />

            <div className="flex justify-between items-start mb-8 relative z-10">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck size={14} className="text-emerald-500" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                    Security Protocol
                  </span>
                </div>
                <h2
                  className={cn(
                    "text-4xl text-slate-900 leading-none",
                    bebasNeue.className,
                  )}
                >
                  UPDATE <span className="text-emerald-600">SECRET</span>
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 bg-slate-50 rounded-xl hover:bg-rose-50 hover:text-rose-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
              <FormInput
                label="Current Password"
                type="password"
                icon={<Lock size={14} />}
                value={current}
                onChange={(e: any) => setCurrent(e.target.value)}
                required
              />

              <div className="h-px bg-slate-100 my-2" />

              <FormInput
                label="New Password"
                type="password"
                icon={<ShieldCheck size={14} />}
                value={newPass}
                onChange={(e: any) => setNewPass(e.target.value)}
                required
              />

              <FormInput
                label="Confirm Secret"
                type="password"
                icon={<ShieldCheck size={14} />}
                value={confirm}
                onChange={(e: any) => setConfirm(e.target.value)}
                required
              />

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-xs font-bold"
                >
                  <AlertCircle size={14} />
                  {error}
                </motion.div>
              )}

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-4 font-bold text-slate-400 bg-slate-50 rounded-2xl text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-4 font-bold text-white bg-slate-900 rounded-2xl text-[10px] uppercase tracking-widest shadow-xl shadow-slate-200 disabled:opacity-50 flex items-center justify-center gap-2 transition-transform active:scale-95"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Authorize Update"
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// --- Helper Input Component ---
function FormInput({ label, icon, ...props }: any) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 ml-1">
        <span className="text-slate-400">{icon}</span>
        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
          {label}
        </label>
      </div>
      <input
        {...props}
        className="w-full px-5 py-4 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-medium text-sm text-slate-900 placeholder:text-slate-300 shadow-inner"
      />
    </div>
  );
}
