"use client";
import { useEffect, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Play, Pause, Volume2, VolumeX, Check } from "lucide-react";
import { cn } from "@/app/utils/utils";
import {
  useWorkoutTracker,
  type WorkoutSnapshot,
} from "@/app/dashboard/hooks/useWorkoutTracker";
import { useVoiceCoach } from "./workout/useVoiceCoach";
import { getTrackerConfig } from "./workout/activityTrackerConfig";

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
  initialPosition,
}: {
  activity: string;
  challengeName: string;
  onStop: (session: WorkoutSnapshot) => void;
  voiceEnabled: boolean;
  onToggleVoice: () => void;
  initialPosition?: { lat: number; lng: number } | null;
}) {
  const tracker = useWorkoutTracker({ activity, autoPause: true });
  const { speak } = useVoiceCoach({ enabled: voiceEnabled });
  const lastMilestoneRef = useRef(0);
  const config = getTrackerConfig(activity);
  const ActivityIcon = config.icon;

  useEffect(() => {
    if (initialPosition) {
      tracker.seedPosition(initialPosition);
      return;
    }
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        tracker.seedPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      () => {},
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (tracker.state !== "active") return;
    const metres = tracker.distanceMeters;
    if (metres >= 100 && lastMilestoneRef.current < 100) {
      lastMilestoneRef.current = 100;
      speak("Great start. Keep it up!", { force: true });
      return;
    }
    const km = Math.floor(metres / 1000);
    if (km > 0 && km * 1000 > lastMilestoneRef.current) {
      lastMilestoneRef.current = km * 1000;
      const cue =
        activity === "cycling"
          ? `${km} kilometer${km > 1 ? "s" : ""} in. You're flying!`
          : activity === "walking"
            ? `${km} kilometer${km > 1 ? "s" : ""} walked. Keep stepping!`
            : activity === "swimming"
              ? `${km} kilometer${km > 1 ? "s" : ""} swum. Keep going!`
              : `${km} kilometer${km > 1 ? "s" : ""} down. Keep it going!`;
      speak(cue);
    }
  }, [tracker.distanceMeters, tracker.state, speak, activity]);

  const handleStart = () => {
    lastMilestoneRef.current = 0;
    tracker.start();
    speak(`${config.label} started. Let's go!`, { force: true });
  };

  const handleFinish = () => {
    const snapshot = tracker.stop();
    onStop(snapshot);
  };

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
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const km = (tracker.distanceMeters / 1000).toFixed(2);
  const steps = Math.round(tracker.distanceMeters / 0.762); // ~1.31 steps/m
  const laps = Math.round(tracker.distanceMeters / 25); // 25m pool
  const acc = tracker.accuracyM;

  // Third stat differs per activity
  const thirdStat = useMemo(() => {
    if (activity === "walking")
      return { label: "Steps", value: String(steps), unit: "" };
    if (activity === "swimming")
      return { label: "Laps", value: String(laps), unit: "25m" };
    if (activity === "cycling") {
      const kmh = tracker.avgPaceSecPerKm
        ? (3600 / tracker.avgPaceSecPerKm).toFixed(1)
        : "0.0";
      return { label: "Avg Speed", value: kmh, unit: "km/h" };
    }
    return {
      label: "Pace",
      value: formatPace(tracker.avgPaceSecPerKm),
      unit: "/km",
    };
  }, [activity, steps, laps, tracker.avgPaceSecPerKm]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-slate-950 flex flex-col"
    >
      <div className="relative flex-1 min-h-0">
        <WorkoutMap
          route={tracker.route}
          current={tracker.currentPosition ?? undefined}
          trackingState={tracker.state}
          error={tracker.error}
          onRetry={tracker.retry}
        />

        <div className="absolute top-0 left-0 right-0 p-4 flex items-start justify-between bg-gradient-to-b from-slate-950/80 to-transparent z-[1000] pointer-events-none">
          <div className="pointer-events-auto flex items-start gap-3">
            <div
              className={cn(
                "w-11 h-11 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white shadow-lg shrink-0",
                config.gradient,
              )}
            >
              <ActivityIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p
                className={cn(
                  "text-[10px] font-bold uppercase tracking-widest truncate",
                  config.accent,
                )}
              >
                {challengeName}
              </p>
              <h2 className="text-white text-lg font-bold">{config.label}</h2>
              {acc !== null && (
                <p className="text-[10px] text-white/60 font-medium mt-0.5">
                  GPS ±{Math.round(acc)}m{acc > 50 && " · weak signal"}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onToggleVoice}
            aria-label={voiceEnabled ? "Mute coach" : "Unmute coach"}
            className="pointer-events-auto w-10 h-10 shrink-0 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-colors"
          >
            {voiceEnabled ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
          </button>
        </div>
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
            label={thirdStat.label}
            value={thirdStat.value}
            unit={thirdStat.unit}
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
              onClick={handleStart}
              icon={<Play className="w-6 h-6" />}
              label="Start"
              primary
              gradient={config.gradient}
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
                onClick={handleFinish}
                icon={<Check className="w-6 h-6" />}
                label="Finish"
                success
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
                gradient={config.gradient}
              />
              <ControlButton
                onClick={handleFinish}
                icon={<Check className="w-6 h-6" />}
                label="Finish"
                success
              />
            </>
          )}
          {tracker.state === "completed" && (
            <p className="text-emerald-400 text-sm font-bold">
              Session saved. Generating summary…
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

function ControlButton({
  onClick,
  icon,
  label,
  primary,
  success,
  danger,
  gradient,
}: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-2 min-h-14 px-7 rounded-2xl font-black uppercase tracking-wider text-xs transition-all active:scale-95",
        primary &&
          (gradient
            ? `bg-gradient-to-r ${gradient} text-white shadow-lg shadow-emerald-500/30`
            : "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"),
        success && "bg-emerald-600 text-white shadow-lg shadow-emerald-600/40",
        danger && "bg-rose-600 text-white shadow-lg shadow-rose-600/30",
        !primary &&
          !success &&
          !danger &&
          "bg-white/10 text-white hover:bg-white/20",
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
