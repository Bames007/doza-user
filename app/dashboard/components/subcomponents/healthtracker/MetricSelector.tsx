"use client";

import { cn } from "@/app/utils/utils";
import { metricConfig, MetricType } from "@/app/types/healthtracker";
import { Heart, Activity, Footprints, Moon, Weight } from "lucide-react";
import { motion } from "framer-motion";
import { poppins } from "@/app/constants";

const iconMap = {
  heartRate: Heart,
  bloodPressure: Activity,
  steps: Footprints,
  sleep: Moon,
  weight: Weight,
};

interface MetricSelectorProps {
  selectedType: MetricType;
  onSelectMetric: (metric: MetricType) => void;
}

export function MetricSelector({
  selectedType,
  onSelectMetric,
}: MetricSelectorProps) {
  return (
    <nav
      className={cn(
        "bg-white p-2.5 sm:p-3.5 rounded-2xl border border-slate-200/80 shadow-xs",
        poppins.className,
      )}
    >
      {/* Editorial Navigation Title Header */}
      <p className="hidden lg:block text-[9px] font-extrabold text-slate-400 uppercase tracking-[0.25em] mb-3 mt-1 ml-3">
        Select Health Category
      </p>

      {/* Fluid Dual-Axis Layout Core Matrix - Enhanced for mobile responsiveness */}
      <div className="flex lg:flex-col overflow-x-auto lg:overflow-visible gap-2 p-0.5 no-scrollbar scroll-smooth snap-x touch-pan-x">
        {(Object.keys(metricConfig) as MetricType[]).map((key) => {
          const config = metricConfig[key];
          const MetricIcon = iconMap[key];
          const isActive = selectedType === key;

          return (
            <motion.button
              key={key}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectMetric(key)}
              className={cn(
                "flex items-center gap-2.5 sm:gap-3.5 px-3.5 sm:px-4 py-3 rounded-xl transition-all duration-300 ease-out whitespace-nowrap text-left shrink-0 lg:w-full group relative snap-center border",
                isActive
                  ? "bg-emerald-50 text-emerald-900 border-emerald-200/80 shadow-sm shadow-emerald-500/10"
                  : "bg-white text-slate-600 border-transparent hover:border-slate-200/80 hover:bg-slate-50 hover:text-slate-900 shadow-2xs",
              )}
            >
              {/* Dynamic Action Icon Frame */}
              <div
                className={cn(
                  "p-1.5 rounded-lg transition-all duration-300 shrink-0",
                  isActive
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-slate-50 text-slate-400 group-hover:bg-white group-hover:text-slate-700",
                )}
              >
                <MetricIcon
                  size={15}
                  strokeWidth={2.5}
                  className="transition-transform duration-300 group-hover:scale-105"
                />
              </div>

              {/* Category Label String Context */}
              <span
                className={cn(
                  "text-[10px] sm:text-[11px] uppercase transition-all tracking-wider",
                  isActive
                    ? "font-black text-emerald-900 tracking-widest"
                    : "font-bold text-slate-600 group-hover:text-slate-900",
                )}
              >
                {config.label}
              </span>

              {/* Active Pill Indicator (Vertical Orientation Only) */}
              {isActive && (
                <span className="absolute right-3.5 w-1.5 h-1.5 bg-emerald-600 rounded-full hidden lg:block shadow-[0_0_8px_rgba(5,150,105,0.4)]" />
              )}
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
