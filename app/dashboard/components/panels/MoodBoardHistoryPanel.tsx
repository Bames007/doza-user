"use client";

import React, { useState, useEffect, useMemo, useRef, Activity } from "react";
import useSWR from "swr";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Mic,
  MicOff,
  MessageCircle,
  Flame,
  TrendingUp,
  Inbox,
  ChevronDown,
  ChevronUp,
  Edit3,
  Loader2,
  Check,
  PenLine,
  Heart,
  AlertCircle,
  BookOpen,
  Notebook,
  Quote,
  History,
  ArrowRight,
  ActivityIcon,
} from "lucide-react";
import { useDashboard } from "../../DashboardContext";
import { useUserContext } from "../../UserContext";
import { authFetcher } from "@/app/utils/client-auth";
import { cn } from "@/app/utils/utils";
import { poppins, bebasNeue } from "@/app/constants";

// ─── Constants ────────────────────────────────────────
const MAX_JOURNAL_LENGTH = 2000;

const MOODS = [
  {
    score: 1,
    emoji: "😞",
    label: "Very low",
    bg: "bg-rose-500",
    soft: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    ring: "ring-rose-400",
    accent: "#f43f5e",
  },
  {
    score: 2,
    emoji: "😟",
    label: "Low",
    bg: "bg-orange-500",
    soft: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-200",
    ring: "ring-orange-400",
    accent: "#f97316",
  },
  {
    score: 3,
    emoji: "😐",
    label: "Okay",
    bg: "bg-amber-500",
    soft: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    ring: "ring-amber-400",
    accent: "#f59e0b",
  },
  {
    score: 4,
    emoji: "🙂",
    label: "Good",
    bg: "bg-lime-500",
    soft: "bg-lime-50",
    text: "text-lime-700",
    border: "border-lime-200",
    ring: "ring-lime-400",
    accent: "#84cc16",
  },
  {
    score: 5,
    emoji: "😊",
    label: "Happy",
    bg: "bg-emerald-500",
    soft: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    ring: "ring-emerald-400",
    accent: "#10b981",
  },
  {
    score: 6,
    emoji: "😄",
    label: "Great",
    bg: "bg-teal-500",
    soft: "bg-teal-50",
    text: "text-teal-700",
    border: "border-teal-200",
    ring: "ring-teal-400",
    accent: "#14b8a6",
  },
];

const QUICK_PROMPTS = [
  "What made me smile today?",
  "What drained my energy?",
  "One thing I'm grateful for…",
  "A small win I had today…",
];

type FilterKey = "all" | "positive" | "negative" | "journal" | "medic";
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "positive", label: "Good days" },
  { key: "negative", label: "Tough days" },
  { key: "journal", label: "With reflection" },
  { key: "medic", label: "Therapist" },
];

interface MoodRecord {
  id: string;
  date: string;
  moodScore: number;
  comment?: string;
  talkedToMedic?: boolean;
  createdAt?: number;
}

// ─── Helpers ───────────────────────────────────────────
function calculateStreak(moods: MoodRecord[]): number {
  if (!moods.length) return 0;
  const dates = new Set(moods.map((m) => m.date));
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const startOffset = dates.has(todayStr) ? 0 : 1;
  let streak = 0;
  for (let i = startOffset; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    if (dates.has(dateStr)) streak++;
    else break;
  }
  return streak;
}

function formatEntryDate(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  if (dateStr === today) return "Today";
  if (dateStr === yesterday) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function getMoodCfg(score: number) {
  return MOODS[Math.min(Math.max(score - 1, 0), 5)];
}

// ─── Speech-to-text hook ──────────────────────────────
function useSpeechToText() {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
      return;
    }
    setSupported(true);
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let finalT = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalT += event.results[i][0].transcript;
        }
      }
      if (finalT.trim()) {
        setTranscript((prev) => (prev ? `${prev} ${finalT}` : finalT).trim());
      }
    };

    recognition.onerror = (e: any) => {
      if (e.error !== "no-speech" && e.error !== "aborted") {
        setError(e.error || "Microphone error");
      }
      setListening(false);
    };

    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.abort();
      } catch {}
    };
  }, []);

  const start = () => {
    if (!recognitionRef.current || listening) return;
    setError(null);
    setTranscript("");
    try {
      recognitionRef.current.start();
      setListening(true);
    } catch {
      setError("Could not start microphone");
    }
  };

  const stop = () => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch {}
    setListening(false);
  };

  const reset = () => {
    setTranscript("");
    setError(null);
  };

  return { supported, listening, transcript, error, start, stop, reset };
}

// ─── Main Panel ───────────────────────────────────────
export default function MoodJournalPanel() {
  const user = useUserContext();
  const userId = user?.id;
  const { setActivePanel } = useDashboard();

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  const {
    data,
    isLoading,
    mutate: mutateMoods,
  } = useSWR("/api/mood-records", authFetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 30_000,
    keepPreviousData: true,
  });

  const moods: MoodRecord[] = useMemo(() => data?.data || [], [data]);
  const todayEntry = useMemo(
    () => moods.find((m) => m.date === today),
    [moods, today],
  );

  const [moodValue, setMoodValue] = useState(4);
  const [journalText, setJournalText] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [showFilters, setShowFilters] = useState(false);

  const voice = useSpeechToText();
  const baselineRef = useRef("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (todayEntry) {
      setMoodValue(todayEntry.moodScore);
      setJournalText(todayEntry.comment || "");
      setIsEditing(false);
    } else {
      setIsEditing(true);
    }
  }, [todayEntry]);

  useEffect(() => {
    if (voice.transcript) {
      const combined = baselineRef.current
        ? `${baselineRef.current} ${voice.transcript}`
        : voice.transcript;
      setJournalText(combined.slice(0, MAX_JOURNAL_LENGTH));
    }
  }, [voice.transcript]);

  const handleMicToggle = () => {
    if (voice.listening) {
      voice.stop();
    } else {
      baselineRef.current = journalText;
      voice.start();
    }
  };

  const handlePromptInsert = (prompt: string) => {
    const insert = journalText ? `${journalText}\n\n${prompt} ` : `${prompt} `;
    setJournalText(insert.slice(0, MAX_JOURNAL_LENGTH));
    textareaRef.current?.focus();
  };

  const handleSave = async () => {
    if (!userId) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/mood-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          date: today,
          moodScore: moodValue,
          comment: journalText.trim(),
        }),
      });
      const json = await res.json();
      if (json.success) {
        await mutateMoods();
        setIsEditing(false);
        setSaveSuccess(true);
        voice.reset();
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert("Failed to save. Please try again.");
      }
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (todayEntry) {
      setMoodValue(todayEntry.moodScore);
      setJournalText(todayEntry.comment || "");
      setIsEditing(false);
    }
    voice.reset();
  };

  const handleTalkToTherapist = async () => {
    if (!userId) return;
    try {
      await fetch("/api/mood-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          date: today,
          moodScore: todayEntry?.moodScore ?? moodValue,
          comment: todayEntry?.comment ?? journalText,
          talkedToMedic: true,
        }),
      });
      mutateMoods();
    } catch {}
    setActivePanel("doza-therapist");
  };

  // ── Derived ──
  const stats = useMemo(() => {
    if (!moods.length) return null;
    const total = moods.length;
    const avg = moods.reduce((s, m) => s + m.moodScore, 0) / total;
    const medicCount = moods.filter((m) => m.talkedToMedic).length;
    const journalCount = moods.filter(
      (m) => m.comment && m.comment.trim().length > 0,
    ).length;
    const streak = calculateStreak(moods);
    return { total, avg, medicCount, journalCount, streak };
  }, [moods]);

  // Last 7 days strip
  const last7Days = useMemo(() => {
    const days: { date: string; label: string; mood: MoodRecord | null }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const label = d.toLocaleDateString(undefined, { weekday: "narrow" });
      days.push({
        date: dateStr,
        label,
        mood: moods.find((m) => m.date === dateStr) || null,
      });
    }
    return days;
  }, [moods]);

  const filteredMoods = useMemo(() => {
    let list = [...moods].sort((a, b) => b.date.localeCompare(a.date));
    if (filter === "positive") list = list.filter((m) => m.moodScore >= 5);
    else if (filter === "negative") list = list.filter((m) => m.moodScore <= 2);
    else if (filter === "journal")
      list = list.filter((m) => m.comment && m.comment.trim().length > 0);
    else if (filter === "medic") list = list.filter((m) => m.talkedToMedic);
    return list;
  }, [moods, filter]);

  const groupedMoods = useMemo(() => {
    const order: string[] = [];
    const map: Record<string, MoodRecord[]> = {};
    filteredMoods.forEach((m) => {
      const key = new Date(m.date).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
      });
      if (!map[key]) {
        map[key] = [];
        order.push(key);
      }
      map[key].push(m);
    });
    return order.map((month) => ({ month, items: map[month] }));
  }, [filteredMoods]);

  const moodCfg = getMoodCfg(moodValue);
  const charCount = journalText.length;
  const nearLimit = charCount > MAX_JOURNAL_LENGTH * 0.9;
  const showForm = isEditing || !todayEntry;

  // ── Render ──
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "min-h-screen bg-[#F8FAFC] pb-28 pt-2 text-slate-900",
        poppins.className,
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 space-y-4 lg:space-y-6">
        {/* ── Header (matches dashboard) ── */}
        <header className="pt-1 lg:pt-2">
          <button
            onClick={() => setActivePanel("dashboard")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-emerald-700 transition-colors min-h-9 -ml-1 px-1 rounded-lg"
          >
            <ArrowLeft size={14} />
            Dashboard
          </button>
          <div className="flex items-end justify-between gap-3 mt-1">
            <div className="min-w-0">
              <h1
                className={cn(
                  "text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight leading-tight",
                  bebasNeue.className,
                )}
              >
                Mood Journal
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                {new Date().toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            {stats && stats.streak > 0 && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full shrink-0 shadow-2xs">
                <Flame size={14} className="text-amber-600" />
                <span className="text-xs font-bold text-amber-800">
                  {stats.streak}d
                </span>
              </div>
            )}
          </div>
        </header>

        {/* ── 7-day strip ── */}
        <section
          className="bg-white rounded-2xl border border-slate-200/70 shadow-2xs p-3 sm:p-4"
          aria-label="Last 7 days"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Last 7 days
            </p>
            {stats && (
              <p className="text-[10px] font-semibold text-slate-400">
                {stats.total} total
              </p>
            )}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {last7Days.map((day) => {
              const cfg = day.mood ? getMoodCfg(day.mood.moodScore) : null;
              const isToday = day.date === today;
              return (
                <div
                  key={day.date}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 rounded-xl aspect-square transition-all border",
                    cfg
                      ? cn(cfg.soft, cfg.border)
                      : "bg-slate-50 border-slate-100",
                    isToday && "ring-2 ring-emerald-400/60 ring-offset-1",
                  )}
                >
                  <span
                    className={cn(
                      "text-[9px] font-bold uppercase tracking-wider",
                      cfg ? cfg.text : "text-slate-400",
                    )}
                  >
                    {day.label}
                  </span>
                  {cfg ? (
                    <span className="text-xl leading-none">{cfg.emoji}</span>
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-slate-200" />
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Today: edit form or saved display ── */}
        {isLoading && !todayEntry ? (
          <TodaySkeleton />
        ) : showForm ? (
          <motion.section
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/70 shadow-sm overflow-hidden"
          >
            {/* Mood picker */}
            <div className="p-4 sm:p-6 border-b border-slate-100">
              <div className="flex items-center gap-2 mb-3">
                <Notebook size={16} className="text-emerald-600 shrink-0" />
                <h2 className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-emerald-700">
                  {todayEntry ? "Update today" : "Today's check-in"}
                </h2>
              </div>
              <p className="text-sm sm:text-base text-slate-600 mb-4">
                How are you feeling right now?
              </p>

              <div
                className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-2"
                role="radiogroup"
                aria-label="Mood score"
              >
                {MOODS.map((m) => {
                  const active = m.score === moodValue;
                  return (
                    <button
                      key={m.score}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      aria-label={m.label}
                      onClick={() => setMoodValue(m.score)}
                      className={cn(
                        "relative rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-all duration-200 active:scale-95 py-2.5 sm:py-2",
                        "min-h-[64px] sm:min-h-[68px]",
                        active
                          ? cn(
                              "bg-white ring-2 scale-[1.02] shadow-md shadow-black/5",
                              m.ring,
                            )
                          : "bg-slate-50 hover:bg-slate-100",
                      )}
                    >
                      <span
                        className={cn(
                          "text-2xl sm:text-2xl leading-none transition-all",
                          active
                            ? "grayscale-0 opacity-100"
                            : "grayscale-[40%] opacity-70",
                        )}
                      >
                        {m.emoji}
                      </span>
                      <span
                        className={cn(
                          "text-[9px] sm:text-[10px] font-bold uppercase tracking-wider truncate px-1",
                          active ? m.text : "text-slate-500",
                        )}
                      >
                        {m.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-3">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border",
                    moodCfg.soft,
                    moodCfg.text,
                    moodCfg.border,
                  )}
                >
                  <ActivityIcon size={11} />
                  {moodCfg.label} · {moodValue}/6
                </span>
              </div>
            </div>

            {/* Journal */}
            <div className="p-4 sm:p-6 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <PenLine size={14} className="text-emerald-600 shrink-0" />
                  <h3 className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-emerald-700">
                    Your journal
                  </h3>
                </div>
                <span
                  className={cn(
                    "text-[10px] font-medium tabular-nums",
                    nearLimit ? "text-amber-600 font-bold" : "text-slate-400",
                  )}
                >
                  {charCount}/{MAX_JOURNAL_LENGTH}
                </span>
              </div>

              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={journalText}
                  onChange={(e) =>
                    setJournalText(e.target.value.slice(0, MAX_JOURNAL_LENGTH))
                  }
                  placeholder="What's on your mind? Write freely, or tap the mic to speak…"
                  rows={6}
                  className="w-full resize-none px-4 py-3 pr-14 text-base sm:text-sm bg-emerald-50/40 border border-emerald-100 rounded-2xl text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 outline-none transition min-h-[180px] sm:min-h-[160px] leading-relaxed"
                />
                <button
                  type="button"
                  onClick={handleMicToggle}
                  disabled={!voice.supported}
                  title={
                    voice.supported
                      ? voice.listening
                        ? "Stop dictating"
                        : "Speak your entry"
                      : "Voice input not supported in this browser"
                  }
                  aria-label={
                    voice.listening ? "Stop dictating" : "Speak your entry"
                  }
                  className={cn(
                    "absolute top-3 right-3 w-11 h-11 inline-flex items-center justify-center rounded-xl transition-all shadow-sm",
                    voice.listening
                      ? "bg-rose-500 text-white animate-pulse"
                      : voice.supported
                        ? "bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50 active:scale-95"
                        : "bg-slate-100 text-slate-400 cursor-not-allowed",
                  )}
                >
                  {voice.listening ? <MicOff size={18} /> : <Mic size={18} />}
                </button>
              </div>

              {/* Quick prompts */}
              {charCount === 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Need a starting point?
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_PROMPTS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handlePromptInsert(p)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-full text-[11px] font-semibold transition-colors min-h-8"
                      >
                        <Quote size={10} />
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {voice.listening && (
                <div className="flex items-center gap-2 text-xs text-rose-600 font-medium animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  Listening… speak clearly
                </div>
              )}
              {voice.error && (
                <div className="flex items-start gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2">
                  <AlertCircle size={12} className="shrink-0 mt-0.5" />
                  <span>
                    {voice.error === "not-allowed"
                      ? "Microphone permission denied. Please allow access."
                      : voice.error}
                  </span>
                </div>
              )}

              {/* Save row — full width on mobile */}
              <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1">
                {todayEntry && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="w-full sm:flex-1 min-h-12 text-sm bg-white text-slate-700 border border-slate-200 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving || voice.listening}
                  className="w-full sm:flex-[2] inline-flex items-center justify-center gap-2 min-h-12 text-sm bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Check size={16} strokeWidth={3} />
                      {todayEntry ? "Save changes" : "Save today's entry"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.section>
        ) : (
          <TodayDisplay
            entry={todayEntry!}
            onEdit={() => setIsEditing(true)}
            onTalkToTherapist={handleTalkToTherapist}
          />
        )}

        {/* Save success toast */}
        <AnimatePresence>
          {saveSuccess && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl shadow-lg text-sm font-semibold"
            >
              <Check size={16} strokeWidth={3} />
              Entry saved
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Therapist CTA ── */}
        <button
          onClick={handleTalkToTherapist}
          className="w-full bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl p-4 sm:p-5 text-white relative overflow-hidden shadow-sm hover:shadow-md transition-shadow text-left active:scale-[0.99]"
        >
          <div className="absolute -right-12 -top-12 w-40 h-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="relative flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
                <Heart size={20} className="text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm sm:text-base font-bold leading-tight">
                  Need to talk to someone?
                </p>
                <p className="text-xs text-emerald-100/90 mt-0.5 line-clamp-1">
                  Licensed therapists are here to listen.
                </p>
              </div>
            </div>
            <ArrowRight size={18} className="text-white/90 shrink-0 -mr-0.5" />
          </div>
        </button>

        {/* ── Stats ── */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 lg:gap-3">
            <StatCard
              icon={TrendingUp}
              label="Average"
              value={stats.avg.toFixed(1)}
              unit="/6"
              color="emerald"
            />
            <StatCard
              icon={Flame}
              label="Streak"
              value={stats.streak.toString()}
              unit={stats.streak === 1 ? "day" : "days"}
              color="amber"
            />
            <StatCard
              icon={BookOpen}
              label="Reflections"
              value={stats.journalCount.toString()}
              unit={stats.journalCount === 1 ? "entry" : "entries"}
              color="teal"
            />
            <StatCard
              icon={MessageCircle}
              label="Therapist"
              value={stats.medicCount.toString()}
              unit={stats.medicCount === 1 ? "talk" : "talks"}
              color="rose"
            />
          </div>
        )}

        {/* ── Filters (collapsible on mobile) ── */}
        {moods.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-slate-600 hover:text-emerald-700 transition-colors min-h-9"
              >
                <History size={12} />
                Past Entries
                <span className="text-[10px] font-medium text-slate-400 normal-case tracking-normal">
                  ({filteredMoods.length})
                </span>
                {showFilters ? (
                  <ChevronUp size={12} />
                ) : (
                  <ChevronDown size={12} />
                )}
              </button>
            </div>
            <AnimatePresence initial={false}>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-1.5 overflow-x-auto -mx-4 px-4 sm:-mx-0 sm:px-0 sm:flex-wrap pb-1 scrollbar-none [&::-webkit-scrollbar]:hidden">
                    {FILTERS.map((f) => (
                      <button
                        key={f.key}
                        onClick={() => setFilter(f.key)}
                        className={cn(
                          "min-h-9 inline-flex items-center px-3 rounded-full text-[11px] font-semibold whitespace-nowrap shrink-0 border transition-all",
                          filter === f.key
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
                        )}
                      >
                        {f.label}
                        {f.key === "medic" && stats && stats.medicCount > 0 && (
                          <span
                            className={cn(
                              "ml-1.5 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full text-[9px] font-bold",
                              filter === f.key
                                ? "bg-white text-emerald-700"
                                : "bg-emerald-100 text-emerald-800",
                            )}
                          >
                            {stats.medicCount}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ── History ── */}
        {isLoading ? (
          <HistorySkeleton />
        ) : moods.length === 0 ? (
          <EmptyState />
        ) : groupedMoods.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200/70">
            <Inbox size={32} className="text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500 font-medium">
              No entries match this filter.
            </p>
            <button
              onClick={() => setFilter("all")}
              className="mt-3 inline-flex items-center min-h-10 px-3 text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
            >
              Show all entries
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedMoods.map((group) => (
              <section key={group.month}>
                <div className="flex items-baseline justify-between mb-3 px-1">
                  <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                    {group.month}
                  </h2>
                  <span className="text-[10px] font-medium text-slate-400">
                    {group.items.length}{" "}
                    {group.items.length === 1 ? "entry" : "entries"}
                  </span>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden">
                  <div className="relative pl-10 sm:pl-12">
                    {/* Timeline spine */}
                    <div className="absolute left-4 sm:left-5 top-4 bottom-4 w-px bg-slate-200" />
                    {group.items.map((m) => (
                      <HistoryEntry key={m.id} mood={m} />
                    ))}
                  </div>
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Today's entry (saved state) ──────────────────────
function TodayDisplay({
  entry,
  onEdit,
  onTalkToTherapist,
}: {
  entry: MoodRecord;
  onEdit: () => void;
  onTalkToTherapist: () => void;
}) {
  const cfg = getMoodCfg(entry.moodScore);
  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/70 shadow-sm overflow-hidden"
    >
      <div className={cn("relative p-4 sm:p-6", cfg.soft)}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Check size={16} className={cfg.text} strokeWidth={3} />
            <span
              className={cn(
                "text-[10px] font-bold uppercase tracking-widest",
                cfg.text,
              )}
            >
              Today's Check-in
            </span>
          </div>
          <button
            onClick={onEdit}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 min-h-9 transition-colors shadow-2xs"
          >
            <Edit3 size={12} />
            Edit
          </button>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 sm:w-16 sm:h-16 rounded-2xl bg-white/70 flex items-center justify-center text-5xl sm:text-4xl shrink-0 shadow-2xs">
            {cfg.emoji}
          </div>
          <div className="min-w-0">
            <p className="text-xl sm:text-2xl font-bold text-slate-900">
              {cfg.label}
            </p>
            <p className="text-xs text-slate-600 mt-0.5">
              Mood score {entry.moodScore}/6
            </p>
          </div>
        </div>
      </div>

      {entry.comment && entry.comment.trim().length > 0 ? (
        <div className="px-4 sm:px-6 pt-5">
          <div className="flex items-center gap-2 mb-2">
            <PenLine size={12} className="text-slate-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Journal
            </span>
          </div>
          <p className="text-sm sm:text-base text-slate-700 leading-relaxed whitespace-pre-wrap italic">
            "{entry.comment}"
          </p>
        </div>
      ) : (
        <div className="px-4 sm:px-6 pt-5">
          <button
            onClick={onEdit}
            className="w-full text-left p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 hover:bg-slate-100 transition-colors"
          >
            <p className="text-xs font-semibold text-slate-600">
              You haven't journaled yet today.
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Tap to add a reflection →
            </p>
          </button>
        </div>
      )}

      <div className="px-4 sm:px-6 pt-4 pb-4 sm:pb-6">
        {entry.talkedToMedic && (
          <div className="inline-flex items-center gap-1.5 mb-3 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-full">
            <MessageCircle size={11} className="text-emerald-700" />
            <span className="text-[10px] font-semibold text-emerald-800">
              You talked to a therapist today
            </span>
          </div>
        )}
        <button
          onClick={onTalkToTherapist}
          className="w-full min-h-12 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 flex items-center justify-center gap-2 shadow-sm transition-colors"
        >
          <MessageCircle size={16} />
          Talk to a therapist
        </button>
      </div>
    </motion.section>
  );
}

// ─── History entry (timeline style) ───────────────────
function HistoryEntry({ mood }: { mood: MoodRecord }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = getMoodCfg(mood.moodScore);
  const journal = mood.comment?.trim() || "";
  const isLong = journal.length > 220;
  const preview = isLong && !expanded ? journal.slice(0, 220) + "…" : journal;
  const whenLabel = formatEntryDate(mood.date);

  return (
    <div className="relative py-4 pr-4 first:pt-4 border-b border-slate-100 last:border-b-0">
      {/* Timeline dot */}
      <div
        className={cn(
          "absolute left-[11px] sm:left-[15px] top-6 w-3 h-3 rounded-full border-2 border-white shadow-sm",
          cfg.bg,
        )}
        aria-hidden
      />
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center text-2xl shrink-0",
            cfg.soft,
          )}
          aria-hidden
        >
          {cfg.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <p className="text-sm font-bold text-slate-900 truncate">
                {cfg.label}
              </p>
              <span
                className={cn(
                  "shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border",
                  cfg.soft,
                  cfg.text,
                  cfg.border,
                )}
              >
                {mood.moodScore}/6
              </span>
            </div>
            <p className="text-[11px] font-semibold text-slate-500 shrink-0">
              {whenLabel}
            </p>
          </div>

          {journal ? (
            <>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-wrap italic">
                "{preview}"
              </p>
              {isLong && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800"
                >
                  {expanded ? (
                    <>
                      Show less <ChevronUp size={11} />
                    </>
                  ) : (
                    <>
                      Read more <ChevronDown size={11} />
                    </>
                  )}
                </button>
              )}
            </>
          ) : (
            <p className="text-xs text-slate-400 italic">No reflection added</p>
          )}

          {mood.talkedToMedic && (
            <div className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded-full">
              <MessageCircle size={10} className="text-emerald-700" />
              <span className="text-[10px] font-semibold text-emerald-800">
                Therapist session
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Stat card (color-aware) ──────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  unit,
  color,
}: {
  icon: any;
  label: string;
  value: string;
  unit: string;
  color: "emerald" | "amber" | "teal" | "rose";
}) {
  const colorMap = {
    emerald: { bg: "bg-emerald-50", text: "text-emerald-700" },
    amber: { bg: "bg-amber-50", text: "text-amber-700" },
    teal: { bg: "bg-teal-50", text: "text-teal-700" },
    rose: { bg: "bg-rose-50", text: "text-rose-700" },
  };
  const c = colorMap[color];
  return (
    <div className="bg-white rounded-2xl border border-slate-200/70 p-3 sm:p-4">
      <div
        className={cn(
          "w-8 h-8 rounded-lg inline-flex items-center justify-center mb-2",
          c.bg,
        )}
      >
        <Icon size={14} className={c.text} />
      </div>
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
        {label}
      </p>
      <p className="text-lg font-bold text-slate-900 leading-none">
        {value}{" "}
        <span className="text-[11px] font-medium text-slate-500">{unit}</span>
      </p>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────
function EmptyState() {
  return (
    <div className="text-center py-16 px-6 bg-white rounded-2xl border border-slate-200/70">
      <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
        <BookOpen size={24} className="text-emerald-600" />
      </div>
      <h3 className="text-base font-bold text-slate-900 mb-1">
        Your journal awaits
      </h3>
      <p className="text-xs text-slate-500 max-w-xs mx-auto">
        Save your first check-in above. Every entry becomes a page in your
        story, organized by month.
      </p>
    </div>
  );
}

// ─── Skeletons ────────────────────────────────────────
function TodaySkeleton() {
  const P = ({ c }: { c: string }) => (
    <div className={cn("animate-pulse bg-slate-200/80 rounded-xl", c)} />
  );
  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/70 p-4 sm:p-6 space-y-4">
      <P c="h-4 w-40" />
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <P key={i} c="h-16" />
        ))}
      </div>
      <P c="h-40 w-full" />
      <P c="h-12 w-full" />
    </div>
  );
}

function HistorySkeleton() {
  const P = ({ c }: { c: string }) => (
    <div className={cn("animate-pulse bg-slate-200/80 rounded-xl", c)} />
  );
  return (
    <div className="bg-white rounded-2xl border border-slate-200/70 p-4 space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-start gap-3">
          <P c="w-11 h-11 rounded-xl" />
          <div className="flex-1 space-y-2">
            <P c="h-3 w-1/3" />
            <P c="h-3 w-full" />
            <P c="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
