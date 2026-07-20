"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Clock, Building, Copy, Check } from "lucide-react";
import { cn } from "@/app/utils/utils";
import { bebasNeue } from "@/app/constants";

interface LinkRequestPopupProps {
  isOpen: boolean;
  onClose: () => void;
  centerName: string;
  otp: string; // now passed from the pending request
  expiresAt: number;
}

export function LinkRequestPopup({
  isOpen,
  onClose,
  centerName,
  otp,
  expiresAt,
}: LinkRequestPopupProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const calcTimeLeft = () => {
      const diff = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setTimeLeft(diff);
      return diff;
    };
    calcTimeLeft();
    const interval = setInterval(() => {
      const remaining = calcTimeLeft();
      if (remaining <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, expiresAt]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(otp);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.95 }}
        className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200/80 overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500 rounded-xl text-white">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h3
                className={cn(
                  "text-lg font-bold text-slate-900",
                  bebasNeue.className,
                )}
              >
                Link Request
              </h3>
              <p className="text-xs text-slate-600">
                {centerName} wants to link with you
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-lg"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* OTP Display */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-center">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
              Your One-Time Password
            </p>
            <div className="flex items-center justify-center gap-2">
              {otp.split("").map((digit, idx) => (
                <div
                  key={idx}
                  className="w-10 h-12 bg-white rounded-lg border border-slate-300 flex items-center justify-center text-2xl font-bold text-slate-800 font-mono shadow-sm"
                >
                  {digit}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-2 mt-2 text-xs text-slate-500">
              <Clock className="w-3.5 h-3.5" />
              <span>Expires in {formatTime(timeLeft)}</span>
            </div>
            <button
              onClick={handleCopy}
              className="mt-3 text-sm text-emerald-600 font-medium flex items-center gap-1 mx-auto hover:underline"
            >
              {copied ? (
                <Check className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              {copied ? "Copied!" : "Copy OTP"}
            </button>
          </div>

          {/* Instructions */}
          <div className="text-sm text-slate-700 space-y-2">
            <p>
              Please share this 6‑digit code with the center staff to complete
              the link.
            </p>
            <p className="text-xs text-slate-500">
              This code will expire in {formatTime(timeLeft)}. If it expires,
              ask the center to send a new request.
            </p>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-slate-200/80 flex justify-between text-xs text-slate-500">
            <span>This link allows the center to access your health data.</span>
            <button
              onClick={onClose}
              className="text-emerald-600 font-medium hover:underline"
            >
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
