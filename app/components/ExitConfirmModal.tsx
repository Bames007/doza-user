// app/components/ExitConfirmModal.tsx
"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, X } from "lucide-react";
import { cn } from "@/app/utils/utils";
import { poppins, bebasNeue } from "../constants";

interface ExitConfirmModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  appName?: string;
  title?: string;
  body?: string;
}

export default function ExitConfirmModal({
  open,
  onConfirm,
  onCancel,
  appName = "Doza",
  title,
  body,
}: ExitConfirmModalProps) {
  // Escape closes (same as Cancel)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[400] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            aria-hidden
          />

          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 24, stiffness: 260 }}
            className={cn(
              "relative bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden",
              "border border-slate-100 sm:pb-0",
              poppins.className,
            )}
            // Inline style — the arbitrary pb-[max(...)] Tailwind class
            // doesn't compile in every setup, so the safe-area inset was
            // being ignored on notched devices.
            style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="exit-confirm-title"
            aria-describedby="exit-confirm-body"
          >
            {/* Mobile drag handle */}
            <div className="sm:hidden flex justify-center pt-3" aria-hidden>
              <div className="w-10 h-1 rounded-full bg-slate-200" />
            </div>

            <div className="p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <LogOut size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2
                    id="exit-confirm-title"
                    className={cn(
                      "text-xl sm:text-2xl font-bold text-slate-900 leading-tight",
                      bebasNeue.className,
                    )}
                  >
                    {title || `CLOSE ${appName.toUpperCase()}?`}
                  </h2>
                  <p
                    id="exit-confirm-body"
                    className="text-sm text-slate-500 mt-1 leading-relaxed"
                  >
                    {body ||
                      `You're about to leave the ${appName} app. Your session stays active — you can come right back.`}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 mt-5">
                <button
                  type="button"
                  onClick={onCancel}
                  autoFocus
                  className={cn(
                    "order-2 sm:order-1 flex-1 min-h-11 rounded-xl font-bold text-sm",
                    "bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors",
                  )}
                >
                  Stay
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  className={cn(
                    "order-1 sm:order-2 flex-1 min-h-11 rounded-xl font-bold text-sm",
                    "bg-rose-500 text-white hover:bg-rose-600 transition-colors shadow-sm",
                  )}
                >
                  Yes, close
                </button>
              </div>

              <button
                type="button"
                onClick={onCancel}
                aria-label="Close"
                className="absolute top-3 right-3 min-h-9 min-w-9 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
