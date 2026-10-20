"use client";

import { cn } from "@/app/utils/utils";
import { metricConfig, MetricType } from "@/app/types/healthtracker";
import { Heart, Activity, Footprints, Moon, Weight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { poppins } from "@/app/constants";

/**
 * Icon map — typed as Partial so future metricConfig additions
 * fall back gracefully instead of crashing on `MetricIcon === undefined`.
 */
const iconMap: Partial<Record<MetricType, LucideIcon>> = {
  heartRate: Heart,
  bloodPressure: Activity,
  steps: Footprints,
  sleep: Moon,
  weight: Weight,
};

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2";

interface MetricSelectorProps {
  selectedType: MetricType;
  onSelectMetric: (metric: MetricType) => void;
  /**
   * "chips" — horizontal snap-scroll rail, full-bleed, thumb-arc placement (mobile).
   * "list"  — vertical card stack (desktop sidebar). Defaults to "list" for
   *           backwards-compat with any caller that omits the prop.
   */
  variant?: "chips" | "list";
}

export function MetricSelector({
  selectedType,
  onSelectMetric,
  variant = "list",
}: MetricSelectorProps) {
  const metrics = Object.keys(metricConfig) as MetricType[];

  /* ───────────────────────── CHIPS (mobile) ───────────────────────── */
  if (variant === "chips") {
    return (
      <div
        role="tablist"
        aria-label="Select health category"
        className={cn(
          "-mx-4 sm:-mx-6 overflow-x-auto px-4 sm:px-6",
          "scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          poppins.className,
        )}
      >
        <div className="flex w-max snap-x snap-mandatory gap-2 py-1">
          {metrics.map((key) => {
            const config = metricConfig[key];
            const MetricIcon = iconMap[key] ?? Activity;
            const isActive = selectedType === key;

            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onSelectMetric(key)}
                className={cn(
                  // h-11 → 44px touch target; snap-start → predictable scroll stops
                  "inline-flex h-11 shrink-0 snap-start items-center gap-2",
                  "whitespace-nowrap rounded-xl border px-4",
                  "text-[11px] font-bold uppercase tracking-wider",
                  "transition-all duration-150 active:scale-[0.97]",
                  FOCUS,
                  isActive
                    ? "border-emerald-600 bg-emerald-600 text-white shadow-sm shadow-emerald-600/25"
                    : "border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                )}
              >
                <MetricIcon
                  size={16}
                  strokeWidth={2.5}
                  aria-hidden="true"
                  className="shrink-0"
                />
                <span>{config.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  /* ───────────────────────── LIST (desktop) ───────────────────────── */
  return (
    <nav
      aria-label="Select health category"
      className={cn(
        "rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-xs sm:p-3.5",
        poppins.className,
      )}
    >
      <p className="mb-3 ml-3 mt-1 hidden text-[9px] font-extrabold uppercase tracking-[0.25em] text-slate-400 lg:block">
        Select Health Category
      </p>

      <div className="flex flex-col gap-2">
        {metrics.map((key) => {
          const config = metricConfig[key];
          const MetricIcon = iconMap[key] ?? Activity;
          const isActive = selectedType === key;

          return (
            <button
              key={key}
              type="button"
              aria-pressed={isActive}
              onClick={() => onSelectMetric(key)}
              className={cn(
                // h-12 → 48px, practical sweet spot for primary nav rows
                "group relative flex h-12 w-full items-center gap-2.5",
                "rounded-xl border px-3 text-left sm:gap-3.5 sm:px-4",
                "transition-all duration-150 active:scale-[0.98]",
                FOCUS,
                isActive
                  ? "border-emerald-200/80 bg-emerald-50 text-emerald-900 shadow-sm shadow-emerald-500/10"
                  : "border-transparent bg-white text-slate-600 shadow-2xs hover:border-slate-200/80 hover:bg-slate-50 hover:text-slate-900",
              )}
            >
              <span
                className={cn(
                  "shrink-0 rounded-lg p-1.5 transition-colors duration-150",
                  isActive
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-slate-50 text-slate-400 group-hover:bg-white group-hover:text-slate-700",
                )}
              >
                <MetricIcon size={15} strokeWidth={2.5} aria-hidden="true" />
              </span>

              <span
                className={cn(
                  "flex-1 truncate text-[10px] uppercase tracking-wider transition-colors sm:text-[11px]",
                  isActive
                    ? "font-black tracking-widest text-emerald-900"
                    : "font-bold text-slate-600 group-hover:text-slate-900",
                )}
              >
                {config.label}
              </span>

              {isActive && (
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600 shadow-[0_0_8px_rgba(5,150,105,0.4)]"
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
