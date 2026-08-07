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
import {
  metricConfig,
  MetricType,
  ChartDataPoint,
  HealthRecord,
} from "@/app/types/healthtracker";
import { formatDisplayValue } from "../../panels/HealthTrackerPanel";
import { poppins, bebasNeue } from "@/app/constants";
import { cn } from "@/app/utils/utils";

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

  // Helper function to format numbers safely with thousand separators
  const formatNumberWithCommas = (val: any) => {
    if (val === null || val === undefined) return "0";
    if (typeof val === "number") {
      return val.toLocaleString("en-US", { maximumFractionDigits: 0 });
    }
    const parsed = Number(val);
    if (!isNaN(parsed)) {
      return parsed.toLocaleString("en-US", { maximumFractionDigits: 0 });
    }
    return String(val);
  };

  // Safe mapping for chart data to prevent any missing property crashes
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
    return {
      ...point,
      numericValue: point?.numericValue ?? 0,
    };
  });

  // Terminal value display matching your exact design language safely
  const renderTerminalValue = (record: HealthRecord) => {
    try {
      const valStr = formatDisplayValue(record);
      if (isBP && typeof valStr === "string" && valStr.includes("/")) {
        const [sysRaw, diaRaw] = valStr.split("/");
        const sys = formatNumberWithCommas(sysRaw?.trim());
        const dia = formatNumberWithCommas(diaRaw?.trim());
        return (
          <span
            className={cn(
              "flex items-baseline tracking-wide text-slate-900",
              bebasNeue.className,
            )}
          >
            <span className="text-2xl sm:text-3xl font-black">{sys}</span>
            <span
              className={cn(
                "text-slate-300 font-light mx-0.5 text-lg",
                poppins.className,
              )}
            >
              /
            </span>
            <span className="text-xl sm:text-2xl font-bold text-slate-400">
              {dia}
            </span>
          </span>
        );
      }
      return (
        <span
          className={cn(
            "text-2xl sm:text-3xl font-black text-slate-900 leading-none tracking-wide",
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
    <div
      className={cn(
        "w-full bg-white p-5 sm:p-6 rounded-2xl shadow-xs",
        poppins.className,
      )}
    >
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2 mb-4 sm:mb-5 border-b border-slate-100/80 pb-3">
        <div className="space-y-0.5">
          <p className="text-[9px] font-extrabold text-emerald-600 uppercase tracking-[0.25em] block">
            Activity History
          </p>
          <h3 className="font-extrabold text-lg sm:text-xl text-slate-900 uppercase tracking-tight leading-none font-poppins">
            {activeLabel} Overview
          </h3>
        </div>

        {latestEntry && (
          <div className="text-left sm:text-right w-full sm:w-auto shrink-0">
            <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-[0.25em] mb-0.5">
              Latest Value
            </p>
            <div className="flex items-baseline justify-start sm:justify-end gap-1">
              {renderTerminalValue(latestEntry)}
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-0.5 select-none shrink-0">
                {activeUnit}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Chart Canvas with border removed */}
      <div className="w-full h-[220px] sm:h-[260px] md:h-[300px] min-w-0 shrink-0 relative select-none text-[9px]">
        {enrichedChartData.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-[9px] font-bold uppercase tracking-wider bg-slate-50/50 rounded-xl border border-dashed border-slate-200 p-4 text-center">
            No history recorded yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={enrichedChartData}
              margin={{ top: 5, right: 5, left: -32, bottom: 0 }}
            >
              <defs>
                <linearGradient
                  id="colorMetricPrimary"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient
                  id="colorMetricSecondary"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.14} />
                  <stop offset="95%" stopColor="#34d399" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="4"
                vertical={false}
                stroke="#f8fafc"
              />

              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{
                  fill: "#94a3b8",
                  fontSize: 8.5,
                  fontWeight: 700,
                  fontFamily: "Poppins",
                }}
                dy={8}
              />

              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{
                  fill: "#94a3b8",
                  fontSize: 8.5,
                  fontWeight: 600,
                  fontFamily: "Poppins",
                }}
                dx={-2}
                tickFormatter={(value) => formatNumberWithCommas(value)}
              />

              <Tooltip
                content={<CustomChartTooltip unit={activeUnit} isBP={isBP} />}
                cursor={{
                  stroke: "#059669",
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
                    stroke="#059669"
                    strokeWidth={2.5}
                    fill="url(#colorMetricPrimary)"
                    isAnimationActive={true}
                    animationDuration={350}
                  />
                  <Area
                    type="monotone"
                    dataKey="diastolic"
                    stroke="#34d399"
                    strokeWidth={2.5}
                    fill="url(#colorMetricSecondary)"
                    isAnimationActive={true}
                    animationDuration={350}
                  />
                </>
              ) : (
                <Area
                  type="monotone"
                  dataKey="numericValue"
                  stroke="#059669"
                  strokeWidth={2.5}
                  fill="url(#colorMetricPrimary)"
                  isAnimationActive={true}
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

interface CustomChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: any;
    dataKey: string | number;
    payload: any;
  }>;
  unit: string;
  isBP: boolean;
}

function CustomChartTooltip({
  active,
  payload,
  unit,
  isBP,
}: CustomChartTooltipProps) {
  const formatNumberWithCommas = (val: any) => {
    if (val === null || val === undefined) return "0";
    if (typeof val === "number") {
      return val.toLocaleString("en-US", { maximumFractionDigits: 0 });
    }
    const parsed = Number(val);
    if (!isNaN(parsed)) {
      return parsed.toLocaleString("en-US", { maximumFractionDigits: 0 });
    }
    return String(val);
  };

  if (active && payload && payload.length > 0) {
    const node = payload[0]?.payload;
    const sysPayload = payload.find((p) => p.dataKey === "systolic");
    const diaPayload = payload.find((p) => p.dataKey === "diastolic");

    const sysVal = formatNumberWithCommas(
      sysPayload?.value ?? node?.systolic ?? "0",
    );
    const diaVal = formatNumberWithCommas(
      diaPayload?.value ?? node?.diastolic ?? "0",
    );
    const formattedNodeVal = formatNumberWithCommas(
      node?.displayValue ?? node?.numericValue ?? "0",
    );

    return (
      <div className="bg-slate-900 text-white p-3 rounded-xl shadow-2xl border border-slate-800 font-poppins min-w-[120px] backdrop-blur-md">
        <p className="text-[8px] font-extrabold text-slate-400 uppercase tracking-[0.25em] mb-1">
          {node?.date ?? ""}
        </p>
        <div className="flex items-baseline gap-1">
          {isBP ? (
            <span
              className={cn(
                "flex items-baseline tracking-wide",
                bebasNeue.className,
              )}
            >
              <span className="text-xl font-black text-white">{sysVal}</span>
              <span
                className={cn(
                  "text-slate-500 font-light mx-0.5 text-sm select-none",
                  poppins.className,
                )}
              >
                /
              </span>
              <span className="text-base font-bold text-slate-300">
                {diaVal}
              </span>
            </span>
          ) : (
            <span
              className={cn(
                "text-xl font-black text-white tracking-wide",
                bebasNeue.className,
              )}
            >
              {formattedNodeVal}
            </span>
          )}
          <span className="text-[8px] font-extrabold text-emerald-400 uppercase tracking-widest ml-1 select-none font-poppins">
            {unit}
          </span>
        </div>
      </div>
    );
  }
  return null;
}
