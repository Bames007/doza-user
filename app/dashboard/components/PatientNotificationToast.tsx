// app/dashboard/components/PatientNotificationToast.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Stethoscope, X } from "lucide-react";
import type { IncomingNotification } from "../hooks/usePatientNotifications";

export default function PatientNotificationToast({
  items,
  onDismiss,
  onOpenChat,
}: {
  items: IncomingNotification[];
  onDismiss: (id: string) => void;
  onOpenChat: (appointmentId: string) => void;
}) {
  return (
    <div className="fixed right-3 left-3 sm:left-auto sm:right-4 bottom-4 z-[450] flex flex-col gap-2 sm:w-80 pointer-events-none">
      <AnimatePresence>
        {items.map((n) => (
          <motion.div
            key={n.id}
            layout
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, transition: { duration: 0.18 } }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="pointer-events-auto bg-white rounded-2xl shadow-2xl border border-emerald-200 p-3 flex items-start gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 overflow-hidden">
              {n.medicImage ? (
                <img
                  src={n.medicImage}
                  alt={n.medicName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Stethoscope size={18} className="text-emerald-700" />
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                onOpenChat(n.appointmentId);
                onDismiss(n.id);
              }}
              className="flex-1 min-w-0 text-left"
            >
              <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide leading-tight">
                New message
              </p>
              <p className="text-sm font-bold text-slate-900 truncate leading-tight">
                {n.medicName}
              </p>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                {n.preview}
              </p>
            </button>
            <button
              type="button"
              onClick={() => onDismiss(n.id)}
              aria-label="Dismiss"
              className="shrink-0 min-h-8 min-w-8 inline-flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
