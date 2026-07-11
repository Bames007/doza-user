"use client";

import { TrendingUp, TrendingDown, BarChart2 } from "lucide-react";
import { metricConfig, MetricType } from "@/app/types/healthtracker";

interface MetricStatsCardsProps {
  stats: {
    avg: any;
    min: any;
    max: any;
  };
  currentMetric: MetricType;
}

export function MetricStatsCards({
  stats,
  currentMetric,
}: MetricStatsCardsProps) {
  const currentUnit = metricConfig[currentMetric].unit;
  const isBP = currentMetric === "bloodPressure";

  // Safe robust parser to guarantee both values render beautifully across all viewports
  const renderValue = (val: any) => {
    if (!val) return "0";

    if (isBP) {
      // Case 1: Standard object structure { systolic, diastolic }
      if (
        typeof val === "object" &&
        ("systolic" in val || "diastolic" in val)
      ) {
        const sys = val.systolic ?? 0;
        const dia = val.diastolic ?? 0;
        return (
          <span className="flex items-baseline font-bebas tracking-wide text-slate-900">
            {/* Top / Systolic Number */}
            <span className="text-4xl sm:text-5xl font-black leading-none">
              {sys}
            </span>
            {/* Diagonal Slash Separator */}
            <span className="text-slate-300 font-poppins font-light mx-1 text-xl sm:text-2xl select-none">
              /
            </span>
            {/* Bottom / Diastolic Number (Sized down for elegant hierarchy) */}
            <span className="text-2xl sm:text-3xl font-bold text-slate-400 variant-numeric-normal leading-none">
              {dia}
            </span>
          </span>
        );
      }

      // Case 2: Fallback if raw string format is provided (e.g., "120/80")
      if (typeof val === "string" && val.includes("/")) {
        const [sys, dia] = val.split("/");
        return (
          <span className="flex items-baseline font-bebas tracking-wide text-slate-900">
            <span className="text-4xl sm:text-5xl font-black leading-none">
              {sys}
            </span>
            <span className="text-slate-300 font-poppins font-light mx-1 text-xl sm:text-2xl select-none">
              /
            </span>
            <span className="text-2xl sm:text-3xl font-bold text-slate-400 leading-none">
              {dia}
            </span>
          </span>
        );
      }
    }

    // Standard single numerical metric fallback (Steps, Heart Rate, etc.)
    if (typeof val === "object") {
      const standardNum = val.value ?? val.avg ?? 0;
      return typeof standardNum === "number"
        ? standardNum.toFixed(0)
        : standardNum;
    }

    return typeof val === "number" ? val.toFixed(0) : val;
  };

  const cardItems = [
    {
      label: isBP ? "Average Pressure" : "Your Trend Average",
      val: stats?.avg,
      icon: BarChart2,
      iconColor: "text-blue-500",
      bgGradient: "hover:border-blue-100",
    },
    {
      label: isBP ? "Lowest Pressure" : "Lowest Value Logged",
      val: stats?.min,
      icon: TrendingDown,
      iconColor: "text-[#22C55E]",
      bgGradient: "hover:border-emerald-100",
    },
    {
      label: isBP ? "Highest Pressure" : "Highest Value Logged",
      val: stats?.max,
      icon: TrendingUp,
      iconColor: "text-amber-500",
      bgGradient: "hover:border-amber-100",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-5 mb-8 font-poppins">
      {cardItems.map((item, idx) => {
        const IconNode = item.icon;
        return (
          <div
            key={idx}
            className={`bg-white p-5 sm:p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between transition-all duration-300 hover:shadow-md hover:border-slate-200 ${item.bgGradient}`}
          >
            <div className="space-y-1.5 sm:space-y-2 min-w-0">
              {/* Micro tracking header label */}
              <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.35em] truncate block">
                {item.label}
              </p>

              {/* Main quantitative result metric node line */}
              <div className="flex items-baseline gap-1 font-bebas tracking-wide text-slate-900">
                {isBP ? (
                  renderValue(item.val)
                ) : (
                  <span className="text-4xl sm:text-5xl font-black leading-none">
                    {renderValue(item.val)}
                  </span>
                )}

                {/* Responsive Unit Label placement alignment baseline configuration */}
                <span className="text-[10px] sm:text-[11px] font-black text-slate-400 font-poppins tracking-widest uppercase ml-1.5 self-end mb-0.5 select-none shrink-0">
                  {currentUnit}
                </span>
              </div>
            </div>

            {/* Icon Graphic Frame Wrapper block container element */}
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex-shrink-0 ml-4 hidden min-[360px]:block transition-colors group-hover:bg-white">
              <IconNode
                size={16}
                className={`${item.iconColor} transition-transform duration-300 group-hover:scale-110`}
                strokeWidth={2.5}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
