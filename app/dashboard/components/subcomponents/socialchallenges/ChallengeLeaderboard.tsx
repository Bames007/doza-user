// app/dashboard/components/subcomponents/socialchallenges/ChallengeLeaderboard.tsx
import { motion } from "framer-motion";
import { Medal, ArrowUpRight, Trophy } from "lucide-react";
import { cn } from "@/app/utils/utils";

interface LeaderboardEntry {
  uid: string;
  name: string;
  photo?: string;
  totalPoints: number;
}

interface ChallengeLeaderboardProps {
  entries: LeaderboardEntry[];
  currentUserId: string;
  isLoading?: boolean;
}

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2";

const rankStyles = (idx: number) => {
  if (idx === 0)
    return "w-8 h-8 bg-emerald-600 text-white shadow-sm shadow-emerald-600/30";
  if (idx === 1)
    return "w-7 h-7 bg-emerald-500 text-white shadow-sm shadow-emerald-500/20";
  if (idx === 2)
    return "w-7 h-7 bg-emerald-400 text-white shadow-sm shadow-emerald-400/20";
  return "w-7 h-7 bg-slate-100 text-slate-600";
};

/* ─── Skeleton ─────────────────────────────────────────── */
export function SkeletonLeaderboard() {
  return (
    <div className="h-full bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col overflow-hidden min-h-[320px] animate-pulse">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-slate-100" />
          <div className="space-y-1.5">
            <div className="h-3.5 w-24 bg-slate-200 rounded" />
            <div className="h-2 w-16 bg-slate-100 rounded" />
          </div>
        </div>
        <div className="w-8 h-8 rounded-lg bg-slate-100" />
      </div>
      <div className="flex-1 divide-y divide-slate-100">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <div className="w-7 h-7 rounded-lg bg-slate-100 shrink-0" />
            <div className="w-9 h-9 rounded-full bg-slate-100 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-24 bg-slate-200 rounded" />
            </div>
            <div className="space-y-1 text-right">
              <div className="h-3 w-10 bg-slate-200 rounded ml-auto" />
              <div className="h-2 w-6 bg-slate-100 rounded ml-auto" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main ─────────────────────────────────────────────── */
export function ChallengeLeaderboard({
  entries,
  currentUserId,
  isLoading,
}: ChallengeLeaderboardProps) {
  if (isLoading) return <SkeletonLeaderboard />;

  if (entries.length === 0) {
    return (
      <div className="h-full bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col overflow-hidden min-h-[280px]">
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
          <div className="w-12 h-12 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center mb-3">
            <Medal className="w-6 h-6 text-emerald-600" />
          </div>
          <p className="text-sm font-bold text-slate-900 mb-1">
            No rankings yet
          </p>
          <p className="text-[11px] text-slate-500 max-w-[200px] leading-relaxed">
            Join a challenge and log progress to claim your spot.
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      whileHover={{ y: -2 }}
      className="relative h-full bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-emerald-200/70 transition-[box-shadow,border-color] duration-300 flex flex-col overflow-hidden group/board"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover/board:scale-105">
            <Trophy className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-slate-900 leading-tight truncate">
              Global Elite
            </h3>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider leading-none mt-0.5 truncate">
              Top challengers
            </p>
          </div>
        </div>
        <button
          aria-label="View full leaderboard"
          className={cn(
            "shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 text-slate-500 border border-slate-200 transition-all duration-200",
            "hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 hover:-rotate-6 active:scale-95",
            FOCUS,
          )}
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 custom-emerald-scrollbar">
        {entries.map((entry, idx) => {
          const isMe = entry.uid === currentUserId;
          return (
            <motion.div
              key={entry.uid}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.04, duration: 0.2 }}
              className={cn(
                "group/row flex items-center gap-3 px-4 py-3 transition-colors duration-150 cursor-default",
                isMe ? "bg-emerald-50/60" : "hover:bg-slate-50",
              )}
            >
              {/* Rank badge — scales slightly when row is hovered */}
              <div className="shrink-0">
                <div
                  className={cn(
                    "rounded-lg flex items-center justify-center font-bold text-[11px] tabular-nums transition-transform duration-200 group-hover/row:scale-110",
                    rankStyles(idx),
                  )}
                >
                  {idx + 1}
                </div>
              </div>

              {/* Avatar */}
              <div
                className={cn(
                  "w-9 h-9 rounded-full overflow-hidden shrink-0 ring-2 transition-all duration-200 group-hover/row:ring-emerald-400",
                  isMe ? "ring-emerald-500" : "ring-slate-200",
                )}
              >
                <img
                  className="w-full h-full object-cover"
                  src={
                    entry.photo ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(entry.name)}&background=059669&color=fff`
                  }
                  alt={`${entry.name}'s avatar`}
                />
              </div>

              {/* Name + You pill */}
              <div className="flex-1 min-w-0 flex items-center gap-1.5">
                <p
                  className={cn(
                    "text-xs sm:text-sm truncate",
                    isMe
                      ? "text-emerald-700 font-bold"
                      : "text-slate-900 font-semibold",
                  )}
                >
                  {entry.name}
                </p>
                {isMe && (
                  <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] font-bold uppercase tracking-wider rounded shrink-0">
                    You
                  </span>
                )}
              </div>

              {/* Points — nudges right on row hover */}
              <div className="text-right shrink-0 transition-transform duration-200 group-hover/row:-translate-x-0.5">
                <p
                  className={cn(
                    "text-sm font-bold tabular-nums leading-none",
                    isMe ? "text-emerald-700" : "text-slate-900",
                  )}
                >
                  {entry.totalPoints.toLocaleString()}
                </p>
                <p className="text-[8px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
                  pts
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
