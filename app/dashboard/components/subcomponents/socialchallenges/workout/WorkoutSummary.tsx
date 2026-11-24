"use client";
import { forwardRef, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Share2,
  Check,
  Loader2,
  MapPin,
  Clock,
  TrendingUp,
  AlertTriangle,
  Flame,
  Camera,
  Upload,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/app/utils/utils";
import type { WorkoutSnapshot } from "@/app/dashboard/hooks/useWorkoutTracker";
import { WorkoutMap } from "./WorkoutMap";
import ShareWorkoutModal from "./ShareWorkoutModal";
import { getTrackerConfig } from "./activityTrackerConfig";
import { getChallengeImage } from "../challengeImages";

/* ── formatters ─────────────────────────────────────────── */
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

/* ── activity → hex pair (html2canvas-safe) ─────────────── */
const GRADIENT_HEX: Record<string, [string, string]> = {
  running: ["#10b981", "#14b8a6"],
  jogging: ["#14b8a6", "#06b6d4"],
  walking: ["#0ea5e9", "#3b82f6"],
  cycling: ["#f59e0b", "#f97316"],
  swimming: ["#06b6d4", "#2563eb"],
  pushups: ["#8b5cf6", "#7c3aed"],
  sitps: ["#f43f5e", "#db2777"],
  situps: ["#f43f5e", "#db2777"],
  squats: ["#f59e0b", "#eab308"],
  pullups: ["#6366f1", "#2563eb"],
};

function getAccentHex(activity: string): string {
  const [from] = GRADIENT_HEX[activity?.toLowerCase() ?? ""] ?? [
    "#10b981",
    "#14b8a6",
  ];
  return from;
}

/* ──────────────────────────────────────────────────────────
   REP SHARE CARD — Tinder portrait card w/ photo background
   ────────────────────────────────────────────────────────── */
const RepShareCard = forwardRef<
  HTMLDivElement,
  {
    config: ReturnType<typeof getTrackerConfig>;
    reps: number;
    sets: number;
    activeMs: number;
    dateLabel: string;
    challengeName: string;
    activity: string;
    backgroundImage: string;
  }
>(function RepShareCard(
  {
    config,
    reps,
    sets,
    activeMs,
    dateLabel,
    challengeName,
    activity,
    backgroundImage,
  },
  ref,
) {
  const Icon = config.icon;
  const accent = getAccentHex(activity);

  return (
    <div
      ref={ref}
      style={{
        width: "360px",
        aspectRatio: "4 / 5",
        maxWidth: "calc(100vw - 2rem)",
      }}
      className="relative rounded-3xl overflow-hidden shadow-2xl text-white shrink-0 bg-slate-900"
    >
      {/* Photo background */}
      <img
        data-bg
        src={backgroundImage}
        alt=""
        crossOrigin="anonymous"
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />

      {/* Gradient tint: dark at top → activity colour at bottom */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, rgba(0,0,0,0.30) 0%, rgba(0,0,0,0.55) 45%, ${accent}ee 100%)`,
        }}
      />

      {/* Decorative rings (tinder-style depth) */}
      <div className="absolute -top-32 -right-32 w-64 h-64 rounded-full border-2 border-white/15 pointer-events-none" />
      <div className="absolute -top-20 -right-20 w-44 h-44 rounded-full border-2 border-white/15 pointer-events-none" />

      <div className="relative h-full flex flex-col p-6">
        {/* Header — logo.png + DOZA MEDIC */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center p-1 shadow-sm">
              <img
                src="/logo.png"
                alt="Doza Medic"
                className="w-full h-full object-contain"
                crossOrigin="anonymous"
              />
            </div>
            <span className="text-white font-black text-[11px] tracking-[0.18em]">
              DOZA MEDIC
            </span>
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-white/80" />
        </div>

        {/* Activity icon + label */}
        <div className="flex-1 flex flex-col items-center justify-center text-center py-2">
          <Icon className="w-14 h-14 mb-3 text-white/95" strokeWidth={1.5} />
          <p className="text-white text-xs font-black uppercase tracking-[0.3em] mb-1">
            {config.label}
          </p>
          {config.muscleGroup && (
            <p className="text-white/85 text-[9px] font-bold tracking-wider">
              {config.muscleGroup}
            </p>
          )}
        </div>

        {/* Big reps */}
        <div className="text-center mb-5">
          <p
            className="text-white font-black tabular-nums leading-[0.8] tracking-tighter drop-shadow-lg"
            style={{ fontSize: "88px" }}
          >
            {reps}
          </p>
          <p className="text-white text-[10px] font-black uppercase tracking-[0.3em] mt-1">
            {config.repLabel}
          </p>
        </div>

        {/* Secondary stats */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-white/25 backdrop-blur-sm rounded-xl px-3 py-2 border border-white/20">
            <p className="text-white/80 text-[8px] font-bold uppercase tracking-widest">
              Sets
            </p>
            <p className="text-white text-xl font-black tabular-nums leading-tight">
              {sets}
            </p>
          </div>
          <div className="bg-white/25 backdrop-blur-sm rounded-xl px-3 py-2 border border-white/20">
            <p className="text-white/80 text-[8px] font-bold uppercase tracking-widest">
              Time
            </p>
            <p className="text-white text-xl font-black tabular-nums leading-tight">
              {fmtDuration(activeMs)}
            </p>
          </div>
        </div>

        {/* Challenge + branding footer */}
        <div className="border-t border-white/30 pt-3">
          <p className="text-white/70 text-[8px] font-bold uppercase tracking-widest mb-0.5">
            Challenge
          </p>
          <p className="text-white text-sm font-black leading-tight line-clamp-1 mb-1">
            {challengeName}
          </p>
          <div className="flex items-center justify-between text-white/75 text-[9px] font-medium">
            <span>{dateLabel}</span>
            <span className="font-black tracking-widest">DOZAMEDIC.COM</span>
          </div>
        </div>
      </div>
    </div>
  );
});

/* ──────────────────────────────────────────────────────────
   MAIN COMPONENT
   ────────────────────────────────────────────────────────── */
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
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const [shareImage, setShareImage] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);

  /** User-chosen selfie/photo (data URL). `null` → use activity default. */
  const [cardImage, setCardImage] = useState<string | null>(null);

  const config = getTrackerConfig(session.activity);
  const isRep = config.kind === "reps";

  const defaultBg = getChallengeImage({ activity: session.activity });
  const effectiveBg = cardImage ?? defaultBg;

  const km = (session.distanceMeters / 1000).toFixed(2);
  const maxKmh = (session.maxSpeedMps * 3.6).toFixed(1);
  const minKmh = (session.minSpeedMps * 3.6).toFixed(1);
  const avgKmh = (session.avgSpeedMps * 3.6).toFixed(1);
  const reps = session.reps ?? 0;
  const sets = session.sets ?? 0;

  const dateLabel = new Date(session.startedAt).toLocaleDateString(undefined, {
    dateStyle: "medium",
  });

  const caption = useMemo(() => {
    if (isRep) {
      return `Just crushed ${reps} ${config.repLabel} on "${challengeName}" in ${fmtDuration(
        session.activeMs,
      )}. Logged with Doza Medic`;
    }
    return `Just finished a ${km} km ${session.activity} on ${challengeName} — paced ${fmtPace(
      session.avgPaceSecPerKm,
    )}, peak ${maxKmh} km/h. Logged with Doza Medic`;
  }, [isRep, reps, session, challengeName, km, maxKmh, config.repLabel]);

  /* ── File picker (selfie OR upload) ────────────────────── */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset so the same file can be picked again
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setCaptureError("Please choose an image file.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setCaptureError("Image is too large — please use one under 8 MB.");
      return;
    }

    setCaptureError(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === "string") setCardImage(result);
    };
    reader.onerror = () => setCaptureError("Couldn't read that image.");
    reader.readAsDataURL(file);
  };

  /* ── Capture ───────────────────────────────────────────── */
  const handleShare = async () => {
    if (!captureRef.current) return;
    setCapturing(true);
    setCaptureError(null);

    try {
      // Wait for every <img> inside the capture to finish loading
      const images = Array.from(
        captureRef.current.querySelectorAll<HTMLImageElement>("img"),
      );
      await Promise.all(
        images.map((img) =>
          img.complete
            ? Promise.resolve()
            : new Promise<void>((resolve) => {
                const done = () => resolve();
                img.addEventListener("load", done, { once: true });
                img.addEventListener("error", done, { once: true });
                setTimeout(done, 4000);
              }),
        ),
      );

      // One extra paint tick
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      await new Promise((r) => setTimeout(r, isRep ? 250 : 1200));

      const html2canvas = (await import("html2canvas-pro")).default;

      const canvas = await html2canvas(captureRef.current, {
        useCORS: true,
        allowTaint: false,
        backgroundColor: isRep ? null : "#020617",
        scale: 2,
        logging: false,
        imageTimeout: 20000,
      });

      setShareImage(canvas.toDataURL("image/png"));
    } catch (err) {
      console.error("[summary] capture failed", err);
      const msg = err instanceof Error ? err.message : "unknown error";
      setCaptureError(
        `Couldn't capture the share card (${msg}). You can still save the workout or take a screenshot.`,
      );
    } finally {
      setCapturing(false);
    }
  };

  const handleSave = async () => {
    const points = isRep ? reps : Math.floor(session.distanceMeters * 0.01);
    await onSave(session, points);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-slate-950 flex flex-col"
    >
      {/* Hidden file inputs — capture="user" opens the front camera */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleFileSelect}
        className="hidden"
      />
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* ── BODY ──────────────────────────────────────────── */}
      {isRep ? (
        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 min-h-0 overflow-auto gap-3">
          {/* Photo controls — outside the card, never captured */}
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 min-h-9 px-3 bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold uppercase tracking-wider rounded-full transition-colors active:scale-95"
            >
              <Camera className="w-3.5 h-3.5" /> Selfie
            </button>
            <button
              type="button"
              onClick={() => uploadInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 min-h-9 px-3 bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold uppercase tracking-wider rounded-full transition-colors active:scale-95"
            >
              <Upload className="w-3.5 h-3.5" /> Upload
            </button>
            {cardImage && (
              <button
                type="button"
                onClick={() => setCardImage(null)}
                className="inline-flex items-center gap-1.5 min-h-9 px-3 bg-white/5 hover:bg-white/15 text-white/70 text-[11px] font-bold uppercase tracking-wider rounded-full transition-colors active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>
            )}
          </div>

          <RepShareCard
            ref={captureRef}
            config={config}
            reps={reps}
            sets={sets}
            activeMs={session.activeMs}
            dateLabel={dateLabel}
            challengeName={challengeName}
            activity={session.activity}
            backgroundImage={effectiveBg}
          />
        </div>
      ) : (
        <div ref={captureRef} className="relative flex-1 min-h-0 bg-slate-950">
          <WorkoutMap
            route={session.route}
            current={session.route[session.route.length - 1]}
            frozen
          />

          <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-xl">
            <img
              src="/logo.png"
              alt="Doza"
              className="w-5 h-5 object-contain"
            />
            <span className="text-white font-black text-[11px] tracking-widest">
              DOZA MEDIC
            </span>
          </div>

          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent pt-16 pb-6 px-5">
            <div
              className={cn(
                "flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest mb-1",
                config.accent,
              )}
            >
              <MapPin className="w-3 h-3" /> {config.label} · {dateLabel}
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
      )}

      {/* ── FOOTER ────────────────────────────────────────── */}
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
            disabled={isSaving || (isRep && reps === 0)}
            className="flex-[2] min-h-11 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black uppercase tracking-wider rounded-xl transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : isRep ? (
              <Flame className="w-3.5 h-3.5" />
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
