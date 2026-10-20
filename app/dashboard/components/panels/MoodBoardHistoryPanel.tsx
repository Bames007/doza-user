"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import {
  ArrowLeft,
  MessageCircle,
  Flame,
  Calendar as CalendarIcon,
  Inbox,
  TrendingUp,
} from "lucide-react";
import { useDashboard } from "../../DashboardContext";
import { authFetcher } from "@/app/utils/client-auth";
import { cn } from "@/app/utils/utils";
import { poppins, bebasNeue } from "@/app/constants";

const MOODS = [
  {
    score: 1,
    emoji: "😞",
    label: "Very low",
    bg: "bg-rose-500",
    text: "text-rose-700",
    light: "bg-rose-50",
    border: "border-rose-200",
  },
  {
    score: 2,
    emoji: "😟",
    label: "Low",
    bg: "bg-orange-500",
    text: "text-orange-700",
    light: "bg-orange-50",
    border: "border-orange-200",
  },
  {
    score: 3,
    emoji: "😐",
    label: "Okay",
    bg: "bg-amber-500",
    text: "text-amber-700",
    light: "bg-amber-50",
    border: "border-amber-200",
  },
  {
    score: 4,
    emoji: "🙂",
    label: "Good",
    bg: "bg-lime-500",
    text: "text-lime-700",
    light: "bg-lime-50",
    border: "border-lime-200",
  },
  {
    score: 5,
    emoji: "😊",
    label: "Happy",
    bg: "bg-emerald-500",
    text: "text-emerald-700",
    light: "bg-emerald-50",
    border: "border-emerald-200",
  },
  {
    score: 6,
    emoji: "😄",
    label: "Great",
    bg: "bg-teal-500",
    text: "text-teal-700",
    light: "bg-teal-50",
    border: "border-teal-200",
  },
];

type FilterKey = "all" | "positive" | "negative" | "medic";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All days" },
  { key: "positive", label: "Good days" },
  { key: "negative", label: "Tough days" },
  { key: "medic", label: "Spoke to medic" },
];

interface MoodRecord {
  id: string;
  date: string;
  moodScore: number;
  comment?: string;
  talkedToMedic?: boolean;
  createdAt?: number;
}

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

export default function MoodboardHistoryPanel() {
  const { setActivePanel } = useDashboard();
  const [filter, setFilter] = useState<FilterKey>("all");

  const { data, isLoading } = useSWR("/api/mood-records", authFetcher);
  const moods: MoodRecord[] = data?.data || [];

  const stats = useMemo(() => {
    if (!moods.length) return null;
    const total = moods.length;
    const avg = moods.reduce((s, m) => s + m.moodScore, 0) / total;
    const medicCount = moods.filter((m) => m.talkedToMedic).length;
    const streak = calculateStreak(moods);
    return { total, avg, medicCount, streak };
  }, [moods]);

  const filtered = useMemo(() => {
    if (filter === "all") return moods;
    if (filter === "positive") return moods.filter((m) => m.moodScore >= 5);
    if (filter === "negative") return moods.filter((m) => m.moodScore <= 2);
    if (filter === "medic") return moods.filter((m) => m.talkedToMedic);
    return moods;
  }, [moods, filter]);

  const grouped = useMemo(() => {
    const order: string[] = [];
    const map: Record<string, MoodRecord[]> = {};
    filtered.forEach((m) => {
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
  }, [filtered]);

  return (
    <div className={cn("min-h-screen bg-[#F8FAFC] pb-28", poppins.className)}>
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3">
          <button
            onClick={() => setActivePanel("dashboard")}
            aria-label="Back to dashboard"
            className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors shrink-0"
          >
            <ArrowLeft size={20} className="text-slate-700" />
          </button>
          <div className="min-w-0 flex-1">
            <h1
              className={cn(
                "text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 truncate",
                bebasNeue.className,
              )}
            >
              Moodboard History
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 truncate">
              Your emotional journey
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-6 space-y-4 lg:space-y-6">
        {isLoading ? (
          <HistorySkeleton />
        ) : moods.length === 0 ? (
          <EmptyState onGoToDashboard={() => setActivePanel("dashboard")} />
        ) : (
          <>
            {stats && <StatsRow stats={stats} />}

            {/* Filters */}
            <div className="flex items-center gap-2 overflow-x-auto -mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0 lg:flex-wrap pb-1 scrollbar-none [&::-webkit-scrollbar]:hidden">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={cn(
                    "min-h-10 inline-flex items-center px-3.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 border transition-all",
                    filter === f.key
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
                  )}
                >
                  {f.label}
                  {f.key === "medic" && stats && stats.medicCount > 0 && (
                    <span
                      className={cn(
                        "ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold",
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

            {/* Grouped by month — 1 col mobile, 2 cols desktop */}
            {grouped.length === 0 ? (
              <div className="text-center py-12">
                <Inbox size={32} className="text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500 font-medium">
                  No moods match this filter.
                </p>
                <button
                  onClick={() => setFilter("all")}
                  className="mt-3 inline-flex items-center min-h-10 px-3 text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
                >
                  Show all moods
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                {grouped.map((group) => (
                  <section
                    key={group.month}
                    className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden"
                  >
                    <h2 className="px-4 py-3 bg-slate-50/50 border-b border-slate-100 text-[11px] font-bold uppercase tracking-widest text-slate-600">
                      {group.month}
                    </h2>
                    <div className="divide-y divide-slate-100">
                      {group.items.map((mood) => (
                        <MoodRow key={mood.id} mood={mood} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Stats ──────────────────────────────────────────────
function StatsRow({
  stats,
}: {
  stats: { total: number; avg: number; medicCount: number; streak: number };
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 lg:gap-4">
      <StatCard
        icon={TrendingUp}
        label="Average"
        value={stats.avg.toFixed(1)}
        unit="/ 6"
      />
      <StatCard
        icon={Flame}
        label="Streak"
        value={stats.streak.toString()}
        unit={stats.streak === 1 ? "day" : "days"}
      />
      <StatCard
        icon={CalendarIcon}
        label="Logged"
        value={stats.total.toString()}
        unit={stats.total === 1 ? "day" : "days"}
      />
      <StatCard
        icon={MessageCircle}
        label="Medic talks"
        value={stats.medicCount.toString()}
        unit={stats.medicCount === 1 ? "talk" : "talks"}
      />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  unit,
}: {
  icon: any;
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/70 p-3 lg:p-4">
      <div className="w-8 h-8 rounded-lg bg-emerald-50 inline-flex items-center justify-center mb-2">
        <Icon size={14} className="text-emerald-700" />
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

// ─── Mood row ────────────────────────────────────────────
function MoodRow({ mood }: { mood: MoodRecord }) {
  const cfg = MOODS[(mood.moodScore || 3) - 1];
  const d = new Date(mood.date);
  const dayLabel = d.toLocaleDateString(undefined, { weekday: "short" });
  const dateLabel = d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  const todayStr = new Date().toISOString().split("T")[0];
  const yesterdayStr = new Date(Date.now() - 86400000)
    .toISOString()
    .split("T")[0];
  const isToday = mood.date === todayStr;
  const isYesterday = mood.date === yesterdayStr;

  const whenLabel = isToday
    ? "Today"
    : isYesterday
      ? "Yesterday"
      : `${dayLabel} · ${dateLabel}`;

  return (
    <div className="flex items-start gap-3 p-3.5">
      <div
        className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0",
          cfg.light,
        )}
        aria-hidden
      >
        {cfg.emoji}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <div className="flex items-center gap-2 min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">
              {cfg.label}
            </p>
            <span
              className={cn(
                "shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border",
                cfg.light,
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

        {mood.comment ? (
          <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
            {mood.comment}
          </p>
        ) : (
          <p className="text-xs text-slate-400 italic">No note</p>
        )}

        {mood.talkedToMedic && (
          <div className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded-full">
            <MessageCircle size={10} className="text-emerald-700" />
            <span className="text-[10px] font-semibold text-emerald-800">
              Spoke to a medic
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Empty state ────────────────────────────────────────
function EmptyState({ onGoToDashboard }: { onGoToDashboard: () => void }) {
  return (
    <div className="text-center py-16 px-6">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
        <CalendarIcon size={24} className="text-slate-400" />
      </div>
      <h3 className="text-sm font-bold text-slate-900 mb-1">No moods yet</h3>
      <p className="text-xs text-slate-500 max-w-xs mx-auto mb-5">
        Log how you feel today from the dashboard. Your history will appear
        here.
      </p>
      <button
        onClick={onGoToDashboard}
        className="inline-flex items-center justify-center min-h-11 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition-colors"
      >
        Go to dashboard
      </button>
    </div>
  );
}

// ─── Loading skeleton ───────────────────────────────────
function HistorySkeleton() {
  const P = ({ c }: { c: string }) => (
    <div className={cn("animate-pulse bg-slate-200/80 rounded-xl", c)} />
  );
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 lg:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <P key={i} c="h-24" />
        ))}
      </div>
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <P key={i} c="h-10 w-24 rounded-full" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {[1, 2, 3, 4].map((i) => (
          <P key={i} c="h-40" />
        ))}
      </div>
    </div>
  );
}
