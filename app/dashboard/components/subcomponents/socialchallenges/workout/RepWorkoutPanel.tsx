"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Check, Volume2, VolumeX, Plus, Flag } from "lucide-react";
import { cn } from "@/app/utils/utils";
import type { WorkoutSnapshot } from "@/app/dashboard/hooks/useWorkoutTracker";
import { useVoiceCoach } from "./useVoiceCoach";
import { getTrackerConfig } from "./activityTrackerConfig";

export function RepWorkoutPanel({
  activity,
  challengeName,
  voiceEnabled,
  onToggleVoice,
  onStop,
}: {
  activity: string;
  challengeName: string;
  voiceEnabled: boolean;
  onToggleVoice: () => void;
  onStop: (session: WorkoutSnapshot) => void;
}) {
  const config = getTrackerConfig(activity);
  const Icon = config.icon;

  const [state, setState] = useState<"idle" | "active" | "completed">("idle");
  const [reps, setReps] = useState(0);
  const [sets, setSets] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const startedAtRef = useRef<number | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMilestoneRef = useRef(0);
  const { speak } = useVoiceCoach({ enabled: voiceEnabled });

  useEffect(() => {
    if (state !== "active") return;
    tickRef.current = setInterval(() => setElapsedMs((p) => p + 1000), 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      tickRef.current = null;
    };
  }, [state]);

  useEffect(() => {
    if (state !== "active") return;
    const milestone = Math.floor(reps / 10) * 10;
    if (milestone > 0 && milestone > lastMilestoneRef.current) {
      lastMilestoneRef.current = milestone;
      speak(`${milestone} ${config.repLabel}. Strong!`);
    }
  }, [reps, state, speak, config.repLabel]);

  const handleStart = () => {
    startedAtRef.current = Date.now();
    setElapsedMs(0);
    setReps(0);
    setSets(0);
    lastMilestoneRef.current = 0;
    setState("active");
    speak(`${config.label} session started. Let's go!`, { force: true });
  };

  const handleAdd = (amount: number) => {
    if (state !== "active") return;
    setReps((p) => p + amount);
  };

  const handleCompleteSet = () => {
    if (state !== "active" || reps === 0) return;
    setSets((p) => p + 1);
    speak(`Set ${sets + 1} done. ${reps} total ${config.repLabel}.`);
  };

  const handleFinish = () => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
    const endedAt = Date.now();
    const activeMs = startedAtRef.current
      ? endedAt - startedAtRef.current
      : elapsedMs;
    const snapshot: WorkoutSnapshot = {
      startedAt: startedAtRef.current ?? endedAt,
      endedAt,
      activeMs,
      distanceMeters: 0,
      route: [],
      activity,
      maxSpeedMps: 0,
      minSpeedMps: 0,
      avgSpeedMps: 0,
      avgPaceSecPerKm: null,
      reps,
      sets,
    };
    setState("completed");
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-slate-950 flex flex-col"
    >
      {/* Header */}
      <div
        className={cn(
          "relative px-5 pt-5 pb-5 bg-gradient-to-br",
          config.gradient,
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/80 truncate">
              {challengeName}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <Icon className="w-6 h-6 text-white" />
              <h2 className="text-white text-2xl font-black capitalize tracking-tight">
                {config.label}
              </h2>
            </div>
            {config.muscleGroup && (
              <p className="text-xs text-white/80 font-medium mt-1">
                {config.muscleGroup}
              </p>
            )}
          </div>
          <button
            onClick={onToggleVoice}
            aria-label={voiceEnabled ? "Mute coach" : "Unmute coach"}
            className="w-10 h-10 shrink-0 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/25 transition-colors"
          >
            {voiceEnabled ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 gap-8 -mt-4">
        <div className="text-center space-y-1">
          <AnimatePresence mode="popLayout">
            <motion.p
              key={reps}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.35, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="text-8xl font-black text-white tabular-nums leading-none"
            >
              {reps}
            </motion.p>
          </AnimatePresence>
          <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">
            {config.repLabel}
          </p>
          {sets > 0 && (
            <p className={cn("text-xs font-bold", config.accent)}>
              {sets} set{sets !== 1 ? "s" : ""} completed
            </p>
          )}
        </div>

        <div className="text-center">
          <p className="text-3xl font-black text-white tabular-nums">
            {formatTime(elapsedMs)}
          </p>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
            Elapsed
          </p>
        </div>

        {state === "active" && (
          <div className="flex items-center gap-3">
            {[1, 5, 10].map((amt) => (
              <button
                key={amt}
                onClick={() => handleAdd(amt)}
                className={cn(
                  "w-16 h-16 rounded-2xl bg-white/10 text-white font-black text-lg transition-all active:scale-90 hover:bg-white/20 flex items-center justify-center gap-0.5",
                  amt === (config.defaultIncrement ?? 1) &&
                    "ring-2 ring-white/50 bg-white/20",
                )}
              >
                <Plus className="w-4 h-4" />
                {amt}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="shrink-0 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] bg-slate-900/95 backdrop-blur-xl rounded-t-[28px] border-t border-white/10">
        <div className="flex items-center justify-center gap-3">
          {state === "idle" && (
            <button
              onClick={handleStart}
              className={cn(
                "flex items-center gap-2 min-h-14 px-8 rounded-2xl font-black uppercase tracking-wider text-xs text-white bg-gradient-to-r shadow-lg shadow-emerald-500/30 active:scale-95 transition-all",
                config.gradient,
              )}
            >
              <Play className="w-5 h-5" /> Start
            </button>
          )}
          {state === "active" && (
            <>
              <button
                onClick={handleCompleteSet}
                className="flex items-center gap-2 min-h-14 px-5 bg-white/10 text-white rounded-2xl font-black uppercase tracking-wider text-xs hover:bg-white/20 transition-colors active:scale-95"
              >
                <Flag className="w-4 h-4" /> Set Done
              </button>
              <button
                onClick={handleFinish}
                className="flex items-center gap-2 min-h-14 px-6 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-wider text-xs shadow-lg shadow-emerald-600/40 active:scale-95"
              >
                <Check className="w-5 h-5" /> Finish
              </button>
            </>
          )}
          {state === "completed" && (
            <p className="text-emerald-400 text-sm font-bold">
              Saving your session…
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
