// app/dashboard/components/medicalshop/HelpModal.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/app/utils/utils";
import { bebasNeue } from "@/app/constants";
import { Modal } from "../../modals/MedicalShopModal";
import {
  HELP_SLIDES,
  FOCUS,
} from "@/app/dashboard/constants/medicalShopConstants";

interface HelpModalProps {
  onClose: () => void;
}

export function HelpModal({ onClose }: HelpModalProps) {
  const [slide, setSlide] = useState(0);

  return (
    <Modal onClose={onClose} size="lg">
      <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <HelpCircle className="w-5 h-5" />
          </div>
          <h2
            className={cn(
              "text-xl font-bold text-slate-900 tracking-tight",
              bebasNeue.className,
            )}
          >
            How to shop
          </h2>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className={cn(
            "min-h-11 min-w-11 inline-flex items-center justify-center hover:bg-slate-100 rounded-xl transition-colors",
            FOCUS,
          )}
        >
          <X className="w-5 h-5 text-slate-600" />
        </button>
      </div>

      <div className="relative py-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center text-center px-4"
          >
            <div className="w-20 h-20 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center mb-5 text-emerald-600">
              {HELP_SLIDES[slide].icon}
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              {HELP_SLIDES[slide].title}
            </h3>
            <p className="text-sm text-slate-600 max-w-sm leading-relaxed">
              {HELP_SLIDES[slide].description}
            </p>
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-center gap-1.5 mt-6">
          {HELP_SLIDES.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setSlide(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              className={cn(
                "h-2 rounded-full transition-all",
                idx === slide ? "bg-emerald-600 w-5" : "bg-slate-300 w-2",
              )}
            />
          ))}
        </div>

        <button
          onClick={() =>
            setSlide((p) => (p === 0 ? HELP_SLIDES.length - 1 : p - 1))
          }
          aria-label="Previous slide"
          className={cn(
            "absolute left-0 top-1/2 -translate-y-1/2 min-h-10 min-w-10 inline-flex items-center justify-center bg-white border border-slate-200 shadow rounded-full text-slate-600",
            FOCUS,
          )}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() =>
            setSlide((p) => (p === HELP_SLIDES.length - 1 ? 0 : p + 1))
          }
          aria-label="Next slide"
          className={cn(
            "absolute right-0 top-1/2 -translate-y-1/2 min-h-10 min-w-10 inline-flex items-center justify-center bg-white border border-slate-200 shadow rounded-full text-slate-600",
            FOCUS,
          )}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <button
        onClick={onClose}
        className={cn(
          "mt-6 w-full min-h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition-colors text-sm",
          FOCUS,
        )}
      >
        Start exploring
      </button>
    </Modal>
  );
}
