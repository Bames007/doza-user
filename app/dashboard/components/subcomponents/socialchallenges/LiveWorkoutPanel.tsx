"use client";
import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Play, Pause, Square, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/app/utils/utils";
import {
  useWorkoutTracker,
  type WorkoutSnapshot,
} from "@/app/dashboard/hooks/useWorkoutTracker";
import { useVoiceCoach } from "./workout/useVoiceCoach";

const WorkoutMap = dynamic(
  () => import("./workout/WorkoutMap").then((m) => m.WorkoutMap),
  {
    ssr: false,
    loading: () => <div className="w-full h-full bg-slate-800 animate-pulse" />,
  },
);

export function LiveWorkoutPanel({
  activity,
  challengeName,
  onStop,
  voiceEnabled,
  onToggleVoice,
}: {
  activity: string;
  challengeName: string;
  onStop: (session: WorkoutSnapshot) => void;
  voiceEnabled: boolean;
  onToggleVoice: () => void;
}) {
  const tracker = useWorkoutTracker({ activity, autoPause: true });
  const { speak } = useVoiceCoach({ enabled: voiceEnabled });
  const lastKmRef = useRef(0);

  // Voice milestones — fire on each new km
  useEffect(() => {
    if (tracker.state !== "active") return;
    const km = Math.floor(tracker.distanceMeters / 1000);
    if (km > 0 && km !== lastKmRef.current) {
      lastKmRef.current = km;
      speak(`${km} kilometer${km > 1 ? "s" : ""} down. Keep it going!`);
    }
  }, [tracker.distanceMeters, tracker.state, speak]);

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
      : `${m}:${String(sec).padStart(2, "0")}`;
  };

  const formatPace = (secPerKm: number | null) => {
    if (!secPerKm || !isFinite(secPerKm)) return "—";
    const m = Math.floor(secPerKm / 60);
    const s = Math.round(secPerKm % 60);
    return `${m}:${String(s).padStart(2, "0")} /km`;
  };

  const km = (tracker.distanceMeters / 1000).toFixed(2);

  const handleStop = () => {
    const snapshot = tracker.stop();
    onStop(snapshot);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-slate-950 flex flex-col"
    >
      <div className="relative flex-1 min-h-0">
        <WorkoutMap
          route={tracker.route}
          current={tracker.route[tracker.route.length - 1]}
        />

        <div className="absolute top-0 left-0 right-0 p-4 flex items-start justify-between bg-gradient-to-b from-slate-950/80 to-transparent z-[1000] pointer-events-none">
          <div className="pointer-events-auto">
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
              {challengeName}
            </p>
            <h2 className="text-white text-lg font-bold capitalize">
              {activity}
            </h2>
          </div>
          <button
            onClick={onToggleVoice}
            aria-label={voiceEnabled ? "Mute coach" : "Unmute coach"}
            className="pointer-events-auto w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-colors"
          >
            {voiceEnabled ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
          </button>
        </div>

        {tracker.error && (
          <div className="absolute top-20 left-4 right-4 bg-rose-500/90 text-white text-xs font-semibold px-3 py-2 rounded-xl z-[1000]">
            {tracker.error}
          </div>
        )}
      </div>

      <div className="shrink-0 bg-slate-900/95 backdrop-blur-xl rounded-t-[28px] border-t border-white/10 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-5 z-[1000]">
        <div className="grid grid-cols-3 gap-3 text-center">
          <Stat label="Distance" value={km} unit="km" />
          <Stat
            label="Time"
            value={formatTime(tracker.elapsedMs)}
            unit=""
            large
          />
          <Stat
            label="Pace"
            value={formatPace(tracker.avgPaceSecPerKm)}
            unit=""
          />
        </div>

        <div className="flex justify-center gap-6 text-[11px] text-slate-400 font-medium">
          <span>
            Speed{" "}
            <b className="text-white">
              {(tracker.currentSpeedMps * 3.6).toFixed(1)} km/h
            </b>
          </span>
          <span>
            Status{" "}
            <b
              className={cn(
                tracker.state === "paused"
                  ? "text-amber-400"
                  : "text-emerald-400",
              )}
            >
              {tracker.state}
            </b>
          </span>
        </div>

        <div className="flex items-center justify-center gap-3">
          {tracker.state === "idle" && (
            <ControlButton
              onClick={tracker.start}
              icon={<Play className="w-6 h-6" />}
              label="Start"
              primary
            />
          )}
          {tracker.state === "active" && (
            <>
              <ControlButton
                onClick={tracker.pause}
                icon={<Pause className="w-6 h-6" />}
                label="Pause"
              />
              <ControlButton
                onClick={handleStop}
                icon={<Square className="w-6 h-6" />}
                label="Stop"
                danger
              />
            </>
          )}
          {tracker.state === "paused" && (
            <>
              <ControlButton
                onClick={tracker.resume}
                icon={<Play className="w-6 h-6" />}
                label="Resume"
                primary
              />
              <ControlButton
                onClick={handleStop}
                icon={<Square className="w-6 h-6" />}
                label="Stop"
                danger
              />
            </>
          )}
          {tracker.state === "completed" && (
            <p className="text-emerald-400 text-sm font-bold">
              Session saved. Generating scorecard…
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function Stat({
  label,
  value,
  unit,
  large,
}: {
  label: string;
  value: string;
  unit: string;
  large?: boolean;
}) {
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1">
        {label}
      </p>
      <p
        className={cn(
          "font-black text-white tabular-nums",
          large ? "text-3xl" : "text-2xl",
        )}
      >
        {value}
        <span className="text-sm font-semibold text-slate-400 ml-1">
          {unit}
        </span>
      </p>
    </div>
  );
}

function ControlButton({ onClick, icon, label, primary, danger }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-2 min-h-14 px-7 rounded-2xl font-black uppercase tracking-wider text-xs transition-all active:scale-95",
        primary && "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30",
        danger && "bg-rose-600 text-white shadow-lg shadow-rose-600/30",
        !primary && !danger && "bg-white/10 text-white hover:bg-white/20",
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
