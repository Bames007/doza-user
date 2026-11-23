"use client";
import { useMemo } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import {
  Trophy,
  Target,
  Timer,
  Footprints,
  Loader2,
  TrendingUp,
  MapPin,
  Calendar,
} from "lucide-react";
import { cn } from "@/app/utils/utils";
import { computeScore } from "./computeScore";
import type { WorkoutSnapshot } from "@/app/dashboard/hooks/useWorkoutTracker";

// Lazy load the map so Leaflet doesn't run on the server
const WorkoutMap = dynamic(
  () => import("./WorkoutMap").then((m) => m.WorkoutMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-emerald-50 animate-pulse rounded-2xl" />
    ),
  },
);

interface Props {
  session: WorkoutSnapshot;
  challengeName: string;
  isSaving: boolean;
  onSave: (session: WorkoutSnapshot, points: number) => Promise<void>;
  onDiscard: () => void;
}

export function WorkoutScorecard({
  session,
  challengeName,
  isSaving,
  onSave,
  onDiscard,
}: Props) {
  const km = session.distanceMeters / 1000;
  const activeMinutes = session.activeMs / 60000;
  const avgPaceSecPerKm = km > 0 ? session.activeMs / 1000 / km : null;
  const avgSpeedKmh =
    session.activeMs > 0 ? km / (session.activeMs / 3_600_000) : null;

  const { points, met } = useMemo(
    () =>
      computeScore({
        activity: session.activity,
        activeMinutes,
        avgPaceSecPerKm,
        avgSpeedKmh,
      }),
    [session.activity, activeMinutes, avgPaceSecPerKm, avgSpeedKmh],
  );

  const formatDuration = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0
      ? `${h}h ${String(m).padStart(2, "0")}m ${String(sec).padStart(2, "0")}s`
      : `${m}m ${String(sec).padStart(2, "0")}s`;
  };

  const formatPace = (secPerKm: number | null) => {
    if (!secPerKm || !isFinite(secPerKm)) return "—";
    const m = Math.floor(secPerKm / 60);
    const s = Math.round(secPerKm % 60);
    return `${m}:${String(s).padStart(2, "0")} /km`;
  };

  const startedLocal = new Date(session.startedAt);
  const endedLocal = new Date(session.endedAt);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center sm:p-4"
    >
      <motion.div
        initial={{ y: "8%", scale: 0.98, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: "8%", scale: 0.98, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="bg-white rounded-t-[28px] sm:rounded-[32px] max-w-md w-full max-h-[94dvh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Hero header with trophy + points */}
        <div className="relative shrink-0 bg-gradient-to-br from-emerald-600 via-emerald-600 to-teal-500 text-white p-6 pb-8 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center mb-3 shadow-lg">
            <Trophy className="w-8 h-8" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-100 line-clamp-1">
            {challengeName}
          </p>
          <h2 className="text-2xl font-black capitalize mt-1">
            {session.activity}
          </h2>
          <p className="text-xs text-emerald-100 mt-1">Session complete</p>

          <div className="mt-5 inline-flex flex-col items-center px-6 py-3 bg-white/15 backdrop-blur-md rounded-2xl border border-white/20">
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-100">
              Fitness Points
            </span>
            <motion.span
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, type: "spring", stiffness: 300 }}
              className="text-4xl font-black tabular-nums"
            >
              +{points}
            </motion.span>
            <span className="text-[10px] text-emerald-100 mt-0.5">
              MET {met.toFixed(1)}
            </span>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="p-5 space-y-4">
            {/* 3-up metrics */}
            <div className="grid grid-cols-3 gap-2">
              <MetricCard
                icon={<Footprints className="w-4 h-4" />}
                label="Distance"
                value={km.toFixed(2)}
                unit="km"
              />
              <MetricCard
                icon={<Timer className="w-4 h-4" />}
                label="Active"
                value={formatDuration(session.activeMs)}
              />
              <MetricCard
                icon={<Target className="w-4 h-4" />}
                label="Avg Pace"
                value={formatPace(avgPaceSecPerKm)}
              />
            </div>

            {/* Route preview */}
            {session.route.length > 1 && (
              <div className="rounded-2xl overflow-hidden border border-emerald-100 bg-emerald-50">
                <div className="h-36 w-full">
                  <WorkoutMap
                    route={session.route}
                    current={session.route[session.route.length - 1]}
                  />
                </div>
                <div className="px-3 py-2 flex items-center justify-between text-[10px] font-bold text-emerald-700 bg-white border-t border-emerald-100">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Route captured
                  </span>
                  <span>{session.route.length} GPS points</span>
                </div>
              </div>
            )}

            {/* Session details */}
            <div className="bg-slate-50 rounded-2xl p-3.5 text-[11px] text-slate-600 font-medium space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" /> Started
                </span>
                <span className="font-bold text-slate-900 tabular-nums">
                  {startedLocal.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" /> Ended
                </span>
                <span className="font-bold text-slate-900 tabular-nums">
                  {endedLocal.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="inline-flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-slate-400" /> Avg speed
                </span>
                <span className="font-bold text-slate-900 tabular-nums">
                  {avgSpeedKmh ? `${avgSpeedKmh.toFixed(1)} km/h` : "—"}
                </span>
              </div>
            </div>

            {/* Points explanation */}
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-3.5 py-2.5 text-[10px] text-emerald-700 font-medium leading-relaxed">
              <b className="font-black">How points are calculated:</b>{" "}
              {activeMinutes.toFixed(1)} active minutes × {met.toFixed(1)} MET ={" "}
              {points} points. Points are added to your leaderboard total when
              you save.
            </div>
          </div>
        </div>

        {/* Sticky footer */}
        <div className="shrink-0 border-t border-slate-100 bg-white px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex gap-2">
          <button
            type="button"
            onClick={onDiscard}
            disabled={isSaving}
            className="flex-1 min-h-12 text-xs font-black uppercase tracking-wider text-slate-500 hover:text-slate-800 rounded-2xl bg-slate-100 hover:bg-slate-200/60 transition-all disabled:opacity-50 active:scale-[0.98]"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={() => onSave(session, points)}
            disabled={isSaving}
            className="flex-[2] flex items-center justify-center gap-2 min-h-12 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50 active:scale-[0.98]"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving…
              </>
            ) : (
              `Save +${points} pts`
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  unit,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 text-center">
      <div className="flex items-center justify-center text-emerald-600 mb-1">
        {icon}
      </div>
      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
        {label}
      </p>
      <p className="text-sm font-black text-slate-900 tabular-nums mt-0.5 leading-tight">
        {value}
        {unit && (
          <span className="text-[10px] text-slate-400 ml-0.5 font-bold">
            {unit}
          </span>
        )}
      </p>
    </div>
  );
}
