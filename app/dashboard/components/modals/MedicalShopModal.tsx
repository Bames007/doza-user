// app/dashboard/components/medicalshop/Modal.tsx
"use client";

import { motion } from "framer-motion";
import { cn } from "@/app/utils/utils";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";

interface ModalProps {
  children: React.ReactNode;
  onClose: () => void;
  size?: "sm" | "md" | "lg";
}

export function Modal({ children, onClose, size = "md" }: ModalProps) {
  useBodyScrollLock(true);

  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.98, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.98, y: 20 }}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "bg-white rounded-t-3xl sm:rounded-2xl w-full max-h-[92vh] sm:max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-2xl pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-6",
          sizeClasses[size],
        )}
      >
        <div className="sm:hidden flex justify-center mb-3" aria-hidden>
          <div className="w-10 h-1 rounded-full bg-slate-300" />
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}
