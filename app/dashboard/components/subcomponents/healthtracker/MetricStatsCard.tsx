"use client";

import { TrendingUp, TrendingDown, BarChart2 } from "lucide-react";
import { metricConfig, MetricType } from "@/app/types/healthtracker";
import { motion } from "framer-motion";
import { poppins, bebasNeue } from "@/app/constants";
import { cn } from "@/app/utils/utils";

interface MetricStatsCardsProps {
  stats: { avg: any; min: any; max: any };
  currentMetric: MetricType;
}

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2";

export function MetricStatsCards({
  stats,
  currentMetric,
}: MetricStatsCardsProps) {
  const currentUnit = metricConfig[currentMetric].unit;
  const isBP = currentMetric === "bloodPressure";

  const fmt = (val: any) => {
    if (val === null || val === undefined) return "0";
    const num = typeof val === "number" ? val : Number(val);
    return !isNaN(num)
      ? num.toLocaleString("en-US", { maximumFractionDigits: 0 })
      : String(val);
  };

  const renderValue = (val: any) => {
    if (!val) return "0";

    if (isBP) {
      if (
        typeof val === "object" &&
        ("systolic" in val || "diastolic" in val)
      ) {
        const sys = fmt(val.systolic ?? 0);
        const dia = fmt(val.diastolic ?? 0);
        return (
          <span
            className={cn(
              "flex items-baseline tracking-tight text-slate-900",
              bebasNeue.className,
            )}
          >
            <span className="text-3xl sm:text-4xl md:text-5xl font-black leading-none">
              {sys}
            </span>
            <span
              className={cn(
                "text-slate-400 font-light mx-1 text-lg sm:text-xl md:text-2xl select-none",
                poppins.className,
              )}
            >
              /
            </span>
            <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-500 leading-none">
              {dia}
            </span>
          </span>
        );
      }

      if (typeof val === "string" && val.includes("/")) {
        const [sysRaw, diaRaw] = val.split("/");
        const sys = fmt(sysRaw.trim());
        const dia = fmt(diaRaw.trim());
        return (
          <span
            className={cn(
              "flex items-baseline tracking-tight text-slate-900",
              bebasNeue.className,
            )}
          >
            <span className="text-3xl sm:text-4xl md:text-5xl font-black leading-none">
              {sys}
            </span>
            <span
              className={cn(
                "text-slate-400 font-light mx-1 text-lg sm:text-xl md:text-2xl select-none",
                poppins.className,
              )}
            >
              /
            </span>
            <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-500 leading-none">
              {dia}
            </span>
          </span>
        );
      }
    }

    if (typeof val === "object") {
      return fmt(val.value ?? val.avg ?? 0);
    }
    return fmt(val);
  };

  const cardItems = [
    {
      label: isBP ? "Average" : "Average",
      val: stats?.avg,
      icon: BarChart2,
    },
    {
      label: isBP ? "Lowest" : "Lowest",
      val: stats?.min,
      icon: TrendingDown,
    },
    {
      label: isBP ? "Highest" : "Highest",
      val: stats?.max,
      icon: TrendingUp,
    },
  ];

  return (
    <div
      className={cn(
        "mb-6",
        // Mobile: horizontal snap-scroll row
        "-mx-4 px-4 flex gap-3 overflow-x-auto pb-1 snap-x snap-proximity scrollbar-none [&::-webkit-scrollbar]:hidden",
        // sm+: 3-col grid, no scroll
        "sm:mx-0 sm:px-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:pb-0",
        poppins.className,
      )}
    >
      {cardItems.map((item, idx) => {
        const IconNode = item.icon;
        return (
          <motion.div
            key={idx}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className={cn(
              "group bg-white rounded-2xl border border-slate-200/80 shadow-xs transition-shadow duration-300",
              "p-4 sm:p-5",
              // Mobile: fixed min-width for horizontal scroll
              "min-w-[220px] shrink-0 snap-start sm:min-w-0",
              "hover:shadow-md hover:border-emerald-200/80",
              "flex items-center justify-between gap-3",
            )}
          >
            <div className="space-y-1 min-w-0">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider truncate">
                {item.label}
              </p>

              <div className="flex items-baseline gap-1.5 min-w-0">
                {isBP ? (
                  renderValue(item.val)
                ) : (
                  <span
                    className={cn(
                      "text-3xl sm:text-4xl md:text-5xl font-black leading-none text-slate-900",
                      bebasNeue.className,
                    )}
                  >
                    {renderValue(item.val)}
                  </span>
                )}
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider self-end mb-1 select-none shrink-0">
                  {currentUnit}
                </span>
              </div>
            </div>

            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 border border-emerald-100/80 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110">
              <IconNode
                size={16}
                className="text-emerald-700"
                strokeWidth={2.5}
                aria-hidden
              />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
