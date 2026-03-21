"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Check } from "lucide-react";
import { cn } from "@/app/utils/utils";
import { plans } from "../../constants/constants";

interface PlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan?: string;
}

export default function PlanModal({
  isOpen,
  onClose,
  currentPlan = "basic",
}: PlanModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">
              Choose a Plan
            </h2>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {plans.map((plan) => {
              const isCurrent = plan.id === currentPlan;
              return (
                <div
                  key={plan.id}
                  className={cn(
                    "relative rounded-xl border p-5 flex flex-col h-full transition-shadow",
                    plan.highlighted
                      ? "border-emerald-300 shadow-lg shadow-emerald-100"
                      : "border-gray-200",
                    isCurrent && "ring-2 ring-emerald-500",
                  )}
                >
                  {plan.highlighted && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  )}
                  {isCurrent && (
                    <span className="absolute -top-3 right-4 bg-emerald-100 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full">
                      Current
                    </span>
                  )}
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-gray-900">
                      {plan.name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">{plan.tagline}</p>
                    <p className="text-2xl font-bold text-emerald-700 mt-3">
                      {plan.price}
                    </p>
                  </div>
                  <ul className="space-y-2 flex-1">
                    {plan.benefits.map((benefit, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-gray-700"
                      >
                        <Check className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    className={cn(
                      "mt-6 w-full py-2 px-4 rounded-lg font-medium transition",
                      isCurrent
                        ? "bg-gray-200 text-gray-600 cursor-default"
                        : "bg-emerald-600 text-white hover:bg-emerald-700",
                    )}
                    disabled={isCurrent}
                    onClick={() => {
                      alert(`You selected the ${plan.name} plan.`);
                      // Here you would handle upgrade logic
                      onClose();
                    }}
                  >
                    {isCurrent ? "Current Plan" : "Select Plan"}
                  </button>
                </div>
              );
            })}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
