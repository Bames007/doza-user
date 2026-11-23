"use client";
import { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Share2,
  Check,
  Loader2,
  MapPin,
  Clock,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/app/utils/utils";
import type { WorkoutSnapshot } from "@/app/dashboard/hooks/useWorkoutTracker";
import { WorkoutMap } from "./WorkoutMap";
import ShareWorkoutModal from "./ShareWorkoutModal";

function fmtDuration(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${m}:${String(sec).padStart(2, "0")}`;
}

function fmtPace(secPerKm: number | null) {
  if (!secPerKm || !isFinite(secPerKm)) return "—";
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, "0")} /km`;
}

function fmtTime(ms: number) {
  return new Date(ms).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function WorkoutSummary({
  session,
  challengeName,
  isSaving,
  onSave,
  onDiscard,
}: {
  session: WorkoutSnapshot;
  challengeName: string;
  isSaving: boolean;
  onSave: (session: WorkoutSnapshot, points: number) => Promise<void>;
  onDiscard: () => void;
}) {
  const captureRef = useRef<HTMLDivElement>(null);
  const [shareImage, setShareImage] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);

  const km = (session.distanceMeters / 1000).toFixed(2);
  const maxKmh = (session.maxSpeedMps * 3.6).toFixed(1);
  const minKmh = (session.minSpeedMps * 3.6).toFixed(1);
  const avgKmh = (session.avgSpeedMps * 3.6).toFixed(1);
  const dateLabel = new Date(session.startedAt).toLocaleDateString(undefined, {
    dateStyle: "medium",
  });

  const caption = useMemo(
    () =>
      `Just finished a ${km} km ${session.activity} on ${challengeName} — paced ${fmtPace(
        session.avgPaceSecPerKm,
      )}, peak ${maxKmh} km/h. Logged with Doza 💚`,
    [km, session, challengeName, maxKmh],
  );

  const handleShare = async () => {
    if (!captureRef.current) return;
    setCapturing(true);
    setCaptureError(null);
    try {
      // Give tiles time to paint before html2canvas runs.
      await new Promise((r) => setTimeout(r, 1200));
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(captureRef.current, {
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#020617",
        scale: 2,
        logging: false,
        imageTimeout: 20000,
      });
      setShareImage(canvas.toDataURL("image/png"));
    } catch (err) {
      console.error("[summary] capture failed", err);
      setCaptureError(
        "Couldn't capture the map image. Try again — or take a screenshot manually.",
      );
    } finally {
      setCapturing(false);
    }
  };

  const handleSave = async () => {
    await onSave(session, Math.floor(session.distanceMeters * 0.01));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-slate-950 flex flex-col"
    >
      <div ref={captureRef} className="relative flex-1 min-h-0 bg-slate-950">
        <WorkoutMap
          route={session.route}
          current={session.route[session.route.length - 1]}
          frozen
        />

        <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl">
          <img src="/logo.png" alt="Doza" className="w-5 h-5 object-contain" />
          <span className="text-white font-black text-[11px] tracking-widest">
            DOZA
          </span>
        </div>

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent pt-16 pb-6 px-5">
          <div className="flex items-center gap-2 text-emerald-400 text-[10px] font-bold uppercase tracking-widest mb-1">
            <MapPin className="w-3 h-3" /> {session.activity} · {dateLabel}
          </div>
          <h2 className="text-white text-2xl font-black tracking-tight mb-3">
            {challengeName}
          </h2>

          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <CaptureStat label="Distance" value={km} unit="km" big />
            <CaptureStat
              label="Time"
              value={fmtDuration(session.activeMs)}
              unit=""
              big
            />
            <CaptureStat
              label="Avg Pace"
              value={fmtPace(session.avgPaceSecPerKm)}
              unit=""
            />
            <CaptureStat label="Avg Speed" value={avgKmh} unit="km/h" />
            <CaptureStat label="Top Speed" value={maxKmh} unit="km/h" />
            <CaptureStat label="Slowest" value={minKmh} unit="km/h" />
          </div>

          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-white/10 text-[10px] text-slate-400 font-medium">
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3 text-emerald-400" />
              Started {fmtTime(session.startedAt)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Check className="w-3 h-3 text-emerald-400" />
              Finished {fmtTime(session.endedAt)}
            </span>
          </div>
        </div>
      </div>

      <div className="shrink-0 bg-slate-900 border-t border-white/10 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-2">
        {captureError && (
          <div className="flex items-start gap-2 bg-rose-500/15 border border-rose-500/40 rounded-xl px-3 py-2">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-rose-200 leading-snug">
              {captureError}
            </p>
          </div>
        )}
        <button
          onClick={handleShare}
          disabled={capturing}
          className="w-full min-h-12 inline-flex items-center justify-center gap-2 bg-white text-slate-900 text-xs font-black uppercase tracking-wider rounded-xl hover:bg-slate-100 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-wait"
        >
          {capturing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Share2 className="w-4 h-4" />
          )}
          {capturing ? "Preparing image…" : "Share Workout"}
        </button>
        <div className="flex gap-2">
          <button
            onClick={onDiscard}
            disabled={isSaving}
            className="flex-1 min-h-11 bg-white/5 hover:bg-white/10 text-white text-[11px] font-bold uppercase tracking-wider rounded-xl transition-colors disabled:opacity-50"
          >
            Discard
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-[2] min-h-11 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black uppercase tracking-wider rounded-xl transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <TrendingUp className="w-3.5 h-3.5" />
            )}
            {isSaving ? "Saving…" : "Save to Challenge"}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {shareImage && (
          <ShareWorkoutModal
            imageDataUrl={shareImage}
            caption={caption}
            onClose={() => setShareImage(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function CaptureStat({
  label,
  value,
  unit,
  big,
}: {
  label: string;
  value: string;
  unit: string;
  big?: boolean;
}) {
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">
        {label}
      </p>
      <p
        className={cn(
          "font-black text-white tabular-nums",
          big ? "text-2xl" : "text-lg",
        )}
      >
        {value}
        {unit && (
          <span className="text-[11px] font-semibold text-slate-400 ml-1">
            {unit}
          </span>
        )}
      </p>
    </div>
  );
}
