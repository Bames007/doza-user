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
  const activeLabel = metricConfig[currentMetric].label;
  const activeUnit = metricConfig[currentMetric].unit;
  const latestEntry = filteredRecords[filteredRecords.length - 1];
  const isBP = currentMetric === "bloodPressure";

  // Extract blood pressure values for dual-line charting
  const enrichedChartData = chartData.map((point) => {
    if (
      isBP &&
      point.originalRecord &&
      typeof point.originalRecord.value === "object" &&
      point.originalRecord.value !== null
    ) {
      const bp = point.originalRecord.value as {
        systolic: number;
        diastolic: number;
      };
      return {
        ...point,
        systolic: bp.systolic,
        diastolic: bp.diastolic,
      };
    }
    return point;
  });

  // Balanced responsive text scaling for blood pressure records
  const renderTerminalValue = (record: HealthRecord) => {
    const valStr = formatDisplayValue(record);
    if (isBP && valStr.length > 5) {
      const [sys, dia] = valStr.split("/");
      return (
        <span className="flex items-baseline font-bebas text-slate-900 tracking-wide">
          <span className="text-2xl sm:text-3xl font-black">{sys}</span>
          <span className="text-slate-300 font-poppins font-light mx-0.5 text-lg">
            /
          </span>
          <span className="text-xl sm:text-2xl font-bold text-slate-400">
            {dia}
          </span>
        </span>
      );
    }
    return (
      <span className="text-2xl sm:text-3xl font-black text-slate-900 leading-none font-bebas tracking-wide">
        {valStr}
      </span>
    );
  };

  return (
    <div className="font-poppins w-full">
      {/* Tightened Responsive Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2 mb-4 sm:mb-5 border-b border-slate-100 pb-3">
        <div className="space-y-0.5">
          <p className="text-[9px] font-black text-[#22C55E] uppercase tracking-widest block">
            Activity History
          </p>
          <h3 className="font-black text-lg sm:text-xl text-slate-900 uppercase tracking-tight leading-none">
            {activeLabel} Overview
          </h3>
        </div>

        {latestEntry && (
          <div className="text-left sm:text-right w-full sm:w-auto shrink-0">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
              Latest Value
            </p>
            <div className="flex items-baseline justify-start sm:justify-end gap-1">
              {renderTerminalValue(latestEntry)}
              <span className="text-[10px] font-bold text-slate-400 font-poppins uppercase tracking-wider mb-0.5 select-none shrink-0">
                {activeUnit}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Compact Data Visualization Canvas Frame with structural size safety wrappers */}
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
                  <stop offset="5%" stopColor="#22C55E" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#22C55E" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient
                  id="colorMetricSecondary"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#007BC5" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#007BC5" stopOpacity={0.0} />
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
              />

              <Tooltip
                content={<CustomChartTooltip unit={activeUnit} isBP={isBP} />}
                cursor={{
                  stroke: isBP ? "#007BC5" : "#22C55E",
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
                    stroke="#22C55E"
                    strokeWidth={2}
                    fill="url(#colorMetricPrimary)"
                    isAnimationActive={true}
                    animationDuration={350}
                  />
                  <Area
                    type="monotone"
                    dataKey="diastolic"
                    stroke="#007BC5"
                    strokeWidth={2}
                    fill="url(#colorMetricSecondary)"
                    isAnimationActive={true}
                    animationDuration={350}
                  />
                </>
              ) : (
                <Area
                  type="monotone"
                  dataKey="numericValue"
                  stroke="#22C55E"
                  strokeWidth={2}
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
    payload: ChartDataPoint;
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
  if (active && payload && payload.length) {
    const node = payload[0].payload;
    return (
      <div className="bg-slate-950 p-2.5 rounded-lg shadow-xl text-white border border-slate-800 font-poppins min-w-[110px] backdrop-blur-md bg-opacity-95">
        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
          {node.date}
        </p>
        <div className="flex items-baseline gap-1">
          {isBP ? (
            <span className="flex items-baseline font-bebas tracking-wide">
              <span className="text-xl font-black text-white">
                {payload.find((p) => p.dataKey === "systolic")?.value ?? "0"}
              </span>
              <span className="text-slate-500 font-poppins font-light mx-0.5 text-sm select-none">
                /
              </span>
              <span className="text-base font-bold text-slate-300">
                {payload.find((p) => p.dataKey === "diastolic")?.value ?? "0"}
              </span>
            </span>
          ) : (
            <span className="text-xl font-black text-white tracking-wide font-bebas">
              {node.displayValue}
            </span>
          )}
          <span className="text-[8px] font-black text-[#22C55E] uppercase tracking-wider ml-0.5 select-none">
            {unit}
          </span>
        </div>
      </div>
    );
  }
  return null;
}
