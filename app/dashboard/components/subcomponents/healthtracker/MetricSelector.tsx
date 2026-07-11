"use client";

import { cn } from "@/app/utils/utils";
import { metricConfig, MetricType } from "@/app/types/healthtracker";
import { Heart, Activity, Footprints, Moon, Weight } from "lucide-react";

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
    <nav className="bg-white p-2.5 sm:p-3.5 rounded-2xl border border-slate-100 shadow-sm font-poppins">
      {/* Editorial Navigation Title Header */}
      <p className="hidden lg:block text-[9px] font-black text-slate-400 uppercase tracking-[0.35em] mb-4 mt-1.5 ml-3">
        Select Health Category
      </p>

      {/* Fluid Dual-Axis Layout Core Matrix */}
      <div className="flex lg:flex-col overflow-x-auto lg:overflow-visible gap-1.5 sm:gap-2 p-0.5 no-scrollbar scroll-smooth snap-x">
        {(Object.keys(metricConfig) as MetricType[]).map((key) => {
          const config = metricConfig[key];
          const MetricIcon = iconMap[key];
          const isActive = selectedType === key;

          return (
            <button
              key={key}
              onClick={() => onSelectMetric(key)}
              className={cn(
                "flex items-center gap-2.5 sm:gap-3.5 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl transition-all duration-300 ease-out whitespace-nowrap text-left w-auto lg:w-full group relative snap-center",
                isActive
                  ? "bg-slate-900 text-white shadow-md shadow-slate-900/10 scale-[1.02] lg:scale-100"
                  : "bg-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98] lg:active:scale-100",
              )}
            >
              {/* Dynamic Action Icon Frame */}
              <MetricIcon
                size={15}
                strokeWidth={isActive ? 2.5 : 2}
                className={cn(
                  "transition-all duration-300 shrink-0",
                  isActive
                    ? "text-[#22C55E] scale-110"
                    : "text-slate-400 group-hover:text-slate-900 group-hover:scale-105",
                )}
              />

              {/* Category Label String Context */}
              <span
                className={cn(
                  "text-[10px] sm:text-[11px] uppercase transition-all tracking-wider font-poppins",
                  isActive
                    ? "font-black italic tracking-widest text-white"
                    : "font-bold text-slate-500 group-hover:text-slate-900",
                )}
              >
                {config.label}
              </span>

              {/* Active Neon Notification Ping Glow Dot (Vertical Orientation Only) */}
              {isActive && (
                <span className="absolute right-4 w-1.5 h-1.5 bg-[#22C55E] rounded-full hidden lg:block shadow-[0_0_10px_#22C55E]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
