"use client";

import { TrendingUp, TrendingDown, BarChart2 } from "lucide-react";
import { metricConfig, MetricType } from "@/app/types/healthtracker";
import { motion } from "framer-motion";
import { poppins, bebasNeue } from "@/app/constants";
import { cn } from "@/app/utils/utils";

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

  // Helper function to format numbers with thousand separators (e.g., 20000 -> 20,000)
  const formatNumberWithCommas = (val: any) => {
    if (val === null || val === undefined) return "0";

    // If it's a number, format it
    if (typeof val === "number") {
      return val.toLocaleString("en-US", { maximumFractionDigits: 0 });
    }

    // If it's a numeric string, parse and format it
    const parsed = Number(val);
    if (!isNaN(parsed)) {
      return parsed.toLocaleString("en-US", { maximumFractionDigits: 0 });
    }

    return val;
  };

  const renderValue = (val: any) => {
    if (!val) return "0";

    if (isBP) {
      if (
        typeof val === "object" &&
        ("systolic" in val || "diastolic" in val)
      ) {
        const sys = formatNumberWithCommas(val.systolic ?? 0);
        const dia = formatNumberWithCommas(val.diastolic ?? 0);
        return (
          <span
            className={cn(
              "flex items-baseline tracking-wide text-slate-900",
              bebasNeue.className,
            )}
          >
            <span className="text-4xl sm:text-5xl font-black leading-none">
              {sys}
            </span>
            <span
              className={cn(
                "text-slate-300 font-light mx-1 text-xl sm:text-2xl select-none",
                poppins.className,
              )}
            >
              /
            </span>
            <span className="text-2xl sm:text-3xl font-bold text-slate-400 leading-none">
              {dia}
            </span>
          </span>
        );
      }

      if (typeof val === "string" && val.includes("/")) {
        const [sysRaw, diaRaw] = val.split("/");
        const sys = formatNumberWithCommas(sysRaw.trim());
        const dia = formatNumberWithCommas(diaRaw.trim());
        return (
          <span
            className={cn(
              "flex items-baseline tracking-wide text-slate-900",
              bebasNeue.className,
            )}
          >
            <span className="text-4xl sm:text-5xl font-black leading-none">
              {sys}
            </span>
            <span
              className={cn(
                "text-slate-300 font-light mx-1 text-xl sm:text-2xl select-none",
                poppins.className,
              )}
            >
              /
            </span>
            <span className="text-2xl sm:text-3xl font-bold text-slate-400 leading-none">
              {dia}
            </span>
          </span>
        );
      }
    }

    if (typeof val === "object") {
      const standardNum = val.value ?? val.avg ?? 0;
      return formatNumberWithCommas(standardNum);
    }

    return formatNumberWithCommas(val);
  };

  const cardItems = [
    {
      label: isBP ? "Average Pressure" : "Your Trend Average",
      val: stats?.avg,
      icon: BarChart2,
      iconColor: "text-emerald-600",
      bgGradient: "hover:border-emerald-200/80",
    },
    {
      label: isBP ? "Lowest Pressure" : "Lowest Value Logged",
      val: stats?.min,
      icon: TrendingDown,
      iconColor: "text-emerald-600",
      bgGradient: "hover:border-emerald-200/80",
    },
    {
      label: isBP ? "Highest Pressure" : "Highest Value Logged",
      val: stats?.max,
      icon: TrendingUp,
      iconColor: "text-emerald-600",
      bgGradient: "hover:border-emerald-200/80",
    },
  ];

  return (
    <div
      className={cn(
        "grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-5 mb-8",
        poppins.className,
      )}
    >
      {cardItems.map((item, idx) => {
        const IconNode = item.icon;
        return (
          <motion.div
            key={idx}
            whileHover={{ y: -2 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className={cn(
              "bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between transition-all duration-300 hover:shadow-md",
              item.bgGradient,
            )}
          >
            <div className="space-y-1.5 sm:space-y-2 min-w-0">
              <p className="text-[9px] sm:text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.25em] truncate block">
                {item.label}
              </p>

              <div
                className={cn(
                  "flex items-baseline gap-1 tracking-wide text-slate-900",
                  bebasNeue.className,
                )}
              >
                {isBP ? (
                  renderValue(item.val)
                ) : (
                  <span className="text-4xl sm:text-5xl font-black leading-none">
                    {renderValue(item.val)}
                  </span>
                )}

                <span className="text-[10px] sm:text-[11px] font-extrabold text-slate-400 tracking-widest uppercase ml-1.5 self-end mb-0.5 select-none shrink-0 font-poppins">
                  {currentUnit}
                </span>
              </div>
            </div>

            <div className="p-3 bg-emerald-50/60 border border-emerald-100/60 rounded-xl flex-shrink-0 ml-4 hidden min-[360px]:block transition-colors group-hover:bg-emerald-50">
              <IconNode
                size={16}
                className={cn(
                  "transition-transform duration-300 group-hover:scale-110",
                  item.iconColor,
                )}
                strokeWidth={2.5}
              />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
