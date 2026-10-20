"use client";

import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { Activity } from "lucide-react";
import {
  metricConfig,
  MetricType,
  ChartDataPoint,
  HealthRecord,
} from "@/app/types/healthtracker";
import { formatDisplayValue } from "../../panels/HealthTrackerPanel";
import { poppins, bebasNeue } from "@/app/constants";
import { cn } from "@/app/utils/utils";

// ─── Chart design tokens — single source of truth ─────────────
const CHART = {
  primary: "#059669", // emerald-600
  secondary: "#34d399", // emerald-400
  grid: "#F1F5F9", // slate-100
  axis: "#64748B", // slate-500 (4.6:1 on white — passes AA)
} as const;

interface TelemetryChartProps {
  chartData: ChartDataPoint[];
  currentMetric: MetricType;
  filteredRecords: HealthRecord[];
}

export function TelemetryChart({
  chartData,
  currentMetric,
  filteredRecords,
}: TelemetryChartProps) {
  const activeLabel = metricConfig[currentMetric]?.label ?? "Metric";
  const activeUnit = metricConfig[currentMetric]?.unit ?? "";
  const latestEntry = filteredRecords?.[filteredRecords.length - 1];
  const isBP = currentMetric === "bloodPressure";

  const formatNumberWithCommas = (val: any) => {
    if (val === null || val === undefined) return "0";
    const num = typeof val === "number" ? val : Number(val);
    return !isNaN(num)
      ? num.toLocaleString("en-US", { maximumFractionDigits: 0 })
      : String(val);
  };

  const enrichedChartData = (chartData || []).map((point: any) => {
    if (
      isBP &&
      point?.originalRecord?.value &&
      typeof point.originalRecord.value === "object"
    ) {
      const bp = point.originalRecord.value as {
        systolic?: number;
        diastolic?: number;
      };
      return {
        ...point,
        systolic: bp.systolic ?? 0,
        diastolic: bp.diastolic ?? 0,
      };
    }
    return { ...point, numericValue: point?.numericValue ?? 0 };
  });

  const renderTerminalValue = (record: HealthRecord) => {
    try {
      const valStr = formatDisplayValue(record);
      if (isBP && typeof valStr === "string" && valStr.includes("/")) {
        const [sysRaw, diaRaw] = valStr.split("/");
        const sys = formatNumberWithCommas(sysRaw?.trim());
        const dia = formatNumberWithCommas(diaRaw?.trim());
        return (
          <span className={cn("flex items-baseline", bebasNeue.className)}>
            <span className="text-2xl sm:text-3xl font-black text-slate-900">
              {sys}
            </span>
            <span
              className={cn(
                "text-slate-400 font-light mx-1 text-lg",
                poppins.className,
              )}
            >
              /
            </span>
            <span className="text-xl sm:text-2xl font-bold text-slate-500">
              {dia}
            </span>
          </span>
        );
      }
      return (
        <span
          className={cn(
            "text-2xl sm:text-3xl font-black text-slate-900 leading-none",
            bebasNeue.className,
          )}
        >
          {formatNumberWithCommas(valStr)}
        </span>
      );
    } catch {
      return (
        <span
          className={cn(
            "text-2xl font-black text-slate-900",
            bebasNeue.className,
          )}
        >
          0
        </span>
      );
    }
  };

  return (
    <div className={cn("w-full", poppins.className)}>
      {/* ─── Header ─────────────────────────────────────── */}
      <div className="flex flex-col gap-3 mb-5 pb-4 border-b border-slate-100">
        {/* Row 1: eyebrow + unit pill */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-1 h-3.5 rounded-full bg-emerald-500 shrink-0"
              aria-hidden
            />
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-[0.18em] truncate">
              Activity History
            </span>
          </div>
          {activeUnit && (
            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
              {activeUnit}
            </span>
          )}
        </div>

        {/* Row 2: title + latest value */}
        <div className="flex items-end justify-between gap-3">
          <h3 className="text-base sm:text-lg md:text-xl font-bold text-slate-900 tracking-tight leading-tight">
            {activeLabel} Overview
          </h3>
          {latestEntry && (
            <div className="flex flex-col items-end shrink-0">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Latest
              </span>
              {renderTerminalValue(latestEntry)}
            </div>
          )}
        </div>

        {/* BP legend (only for blood pressure) */}
        {isBP && enrichedChartData.length > 0 && (
          <div className="flex items-center gap-4 pt-1">
            <LegendDot color={CHART.primary} label="Systolic" />
            <LegendDot color={CHART.secondary} label="Diastolic" />
          </div>
        )}
      </div>

      {/* ─── Chart canvas ───────────────────────────────── */}
      <div className="w-full h-[240px] sm:h-[280px] md:h-[320px] relative select-none">
        {enrichedChartData.length === 0 ? (
          <ChartEmpty />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={enrichedChartData}
              margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient
                  id="colorMetricPrimary"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={CHART.primary}
                    stopOpacity={0.2}
                  />
                  <stop
                    offset="95%"
                    stopColor={CHART.primary}
                    stopOpacity={0}
                  />
                </linearGradient>
                <linearGradient
                  id="colorMetricSecondary"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={CHART.secondary}
                    stopOpacity={0.18}
                  />
                  <stop
                    offset="95%"
                    stopColor={CHART.secondary}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="4 4"
                vertical={false}
                stroke={CHART.grid}
              />

              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{
                  fill: CHART.axis,
                  fontSize: 10,
                  fontWeight: 600,
                  fontFamily: "Poppins",
                }}
                dy={8}
                minTickGap={20}
              />

              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{
                  fill: CHART.axis,
                  fontSize: 10,
                  fontWeight: 500,
                  fontFamily: "Poppins",
                }}
                dx={-2}
                width={40}
                tickFormatter={(value) => formatNumberWithCommas(value)}
              />

              <Tooltip
                content={<CustomChartTooltip unit={activeUnit} isBP={isBP} />}
                cursor={{
                  stroke: CHART.primary,
                  strokeWidth: 1.25,
                  strokeDasharray: "4 4",
                }}
                isAnimationActive={false}
              />

              {isBP ? (
                <>
                  <Area
                    type="monotone"
                    dataKey="systolic"
                    stroke={CHART.primary}
                    strokeWidth={2.5}
                    fill="url(#colorMetricPrimary)"
                    isAnimationActive
                    animationDuration={350}
                  />
                  <Area
                    type="monotone"
                    dataKey="diastolic"
                    stroke={CHART.secondary}
                    strokeWidth={2.5}
                    fill="url(#colorMetricSecondary)"
                    isAnimationActive
                    animationDuration={350}
                  />
                </>
              ) : (
                <Area
                  type="monotone"
                  dataKey="numericValue"
                  stroke={CHART.primary}
                  strokeWidth={2.5}
                  fill="url(#colorMetricPrimary)"
                  isAnimationActive
                  animationDuration={300}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

// ─── Legend dot ────────────────────────────────────────────
function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <span className="text-xs font-semibold text-slate-600">{label}</span>
    </div>
  );
}

// ─── Empty state ───────────────────────────────────────────
function ChartEmpty() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200 p-6 text-center">
      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 inline-flex items-center justify-center mb-2.5">
        <Activity size={18} className="text-slate-500" aria-hidden />
      </div>
      <p className="text-sm font-semibold text-slate-700 mb-0.5">
        No readings yet
      </p>
      <p className="text-xs text-slate-500 max-w-[220px] leading-relaxed">
        Add your first reading to see trends over time.
      </p>
    </div>
  );
}

// ─── Tooltip ───────────────────────────────────────────────
interface CustomChartTooltipProps {
  active?: boolean;
  payload?: Array<{ value: any; dataKey: string | number; payload: any }>;
  unit: string;
  isBP: boolean;
}

function CustomChartTooltip({
  active,
  payload,
  unit,
  isBP,
}: CustomChartTooltipProps) {
  const fmt = (val: any) => {
    if (val === null || val === undefined) return "0";
    const num = typeof val === "number" ? val : Number(val);
    return !isNaN(num)
      ? num.toLocaleString("en-US", { maximumFractionDigits: 0 })
      : String(val);
  };

  if (!active || !payload || payload.length === 0) return null;

  const node = payload[0]?.payload;
  const sysPayload = payload.find((p) => p.dataKey === "systolic");
  const diaPayload = payload.find((p) => p.dataKey === "diastolic");
  const sysVal = fmt(sysPayload?.value ?? node?.systolic ?? 0);
  const diaVal = fmt(diaPayload?.value ?? node?.diastolic ?? 0);
  const nodeVal = fmt(node?.displayValue ?? node?.numericValue ?? 0);

  return (
    <div className="bg-slate-900 text-white px-3 py-2.5 rounded-xl shadow-2xl border border-slate-800 min-w-[120px]">
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
        {node?.date ?? ""}
      </p>
      <div className="flex items-baseline gap-1.5">
        {isBP ? (
          <span className={cn("flex items-baseline", bebasNeue.className)}>
            <span className="text-xl font-black text-white">{sysVal}</span>
            <span
              className={cn(
                "text-slate-500 font-light mx-0.5 text-sm",
                poppins.className,
              )}
            >
              /
            </span>
            <span className="text-base font-bold text-slate-300">{diaVal}</span>
          </span>
        ) : (
          <span
            className={cn("text-xl font-black text-white", bebasNeue.className)}
          >
            {nodeVal}
          </span>
        )}
        {unit && (
          <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}
