import { motion } from "framer-motion";
import { Medal, ArrowUpRight, Trophy, Flame } from "lucide-react";
import { cn } from "@/app/utils/utils";
import { bebasNeue } from "@/app/constants";

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

// 1. SKELETON LOADER COMPONENT
export function SkeletonLeaderboard() {
  return (
    <div className="relative bg-slate-950/90 backdrop-blur-2xl rounded-[32px] p-6 shadow-2xl h-full border border-slate-800/80 flex flex-col min-h-[480px] overflow-hidden">
      <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center justify-between mb-6 animate-pulse relative z-10">
        <div className="flex items-center gap-3.5">
          <div className="bg-slate-900/80 p-3 rounded-2xl w-11 h-11 border border-slate-800 shadow-inner" />
          <div className="space-y-1.5">
            <div className="h-5 w-32 bg-slate-900 rounded-lg border border-slate-800" />
            <div className="h-3 w-20 bg-slate-900/60 rounded-md" />
          </div>
        </div>
        <div className="w-9 h-9 bg-slate-900 rounded-xl border border-slate-800" />
      </div>

      <div className="space-y-3 flex-1 relative z-10">
        {[...Array(5)].map((_, idx) => (
          <div
            key={idx}
            className="flex items-center gap-4 p-3.5 rounded-2xl bg-slate-900/30 border border-slate-800/40 animate-pulse"
          >
            <div className="w-8 h-8 rounded-xl bg-slate-800/60 shrink-0" />
            <div className="w-11 h-11 rounded-full bg-slate-800 shrink-0 shadow-inner" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-28 bg-slate-800 rounded-md" />
              <div className="h-3 w-16 bg-slate-800/50 rounded-md" />
            </div>
            <div className="space-y-1 text-right">
              <div className="h-4 w-12 bg-slate-800 rounded-md ml-auto" />
              <div className="h-2.5 w-8 bg-slate-800/50 rounded-md ml-auto" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 2. MAIN LEADERBOARD COMPONENT
export function ChallengeLeaderboard({
  entries,
  currentUserId,
  isLoading,
}: ChallengeLeaderboardProps) {
  if (isLoading) return <SkeletonLeaderboard />;

  if (entries.length === 0) {
    return (
      <div className="relative bg-slate-950/90 backdrop-blur-2xl rounded-[32px] p-8 shadow-2xl h-full border border-slate-800/80 flex flex-col items-center justify-center text-center min-h-[380px] overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 p-4 bg-slate-900/80 rounded-2xl mb-4 border border-slate-800 shadow-inner">
          <Medal className="w-8 h-8 text-slate-500" />
        </div>
        <p className="relative z-10 text-base text-slate-200 font-bold tracking-wide">
          No rankings yet
        </p>
        <p className="relative z-10 text-xs text-slate-400 mt-1 max-w-[220px] leading-relaxed">
          Join active challenges and log your progress to claim your spot on the
          board.
        </p>
      </div>
    );
  }

  return (
    <div className="relative bg-slate-950/95 backdrop-blur-2xl rounded-[32px] p-6 shadow-2xl h-full border border-slate-800/80 flex flex-col overflow-hidden group">
      {/* Background ambient lighting accents */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-500/20 transition-all duration-700" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header section */}
      <div className="relative z-10 flex items-center justify-between mb-5 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3.5">
          <div className="bg-gradient-to-br from-emerald-500/20 to-teal-500/10 p-3 rounded-2xl border border-emerald-500/30 shadow-[0_0_25px_rgba(16,185,129,0.15)]">
            <Trophy className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3
                className={cn(
                  "text-2xl text-white tracking-wide leading-none",
                  bebasNeue.className,
                )}
              >
                Global Elite
              </h3>
            </div>
            <p className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase mt-1">
              Top performing challengers
            </p>
          </div>
        </div>
        <button
          aria-label="View Full Leaderboard"
          className="h-9 w-9 flex items-center justify-center rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all active:scale-95 shadow-inner"
        >
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>

      {/* Ranks list */}
      <div className="relative z-10 space-y-2.5 flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        {entries.map((entry, idx) => {
          const isMe = entry.uid === currentUserId;

          return (
            <motion.div
              key={entry.uid}
              whileHover={{
                x: 3,
                backgroundColor: isMe
                  ? "rgba(16, 185, 129, 0.15)"
                  : "rgba(255, 255, 255, 0.05)",
              }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className={cn(
                "flex items-center gap-3.5 p-3.5 rounded-2xl transition-all duration-300 border backdrop-blur-sm",
                isMe
                  ? "bg-emerald-500/10 border-emerald-500/40 shadow-[0_4px_24px_rgba(16,185,129,0.12)]"
                  : "bg-slate-900/40 border-slate-800/70 hover:border-slate-700/80 shadow-2xs",
              )}
            >
              {/* Placement Indicators */}
              <div className="w-8 flex justify-center shrink-0">
                {idx === 0 ? (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-yellow-200 flex items-center justify-center shadow-[0_0_16px_rgba(234,179,8,0.5)] text-slate-950 font-black text-xs tracking-tighter">
                    1
                  </div>
                ) : idx === 1 ? (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-slate-300 via-slate-200 to-white flex items-center justify-center shadow-[0_0_12px_rgba(203,213,225,0.3)] text-slate-950 font-black text-xs tracking-tighter">
                    2
                  </div>
                ) : idx === 2 ? (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-700 via-amber-600 to-amber-400 flex items-center justify-center shadow-[0_0_12px_rgba(180,83,9,0.3)] text-white font-black text-xs tracking-tighter">
                    3
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-center text-slate-400 font-extrabold text-xs shadow-inner">
                    {idx + 1}
                  </div>
                )}
              </div>

              {/* Avatar Frame */}
              <div
                className={cn(
                  "w-11 h-11 rounded-2xl overflow-hidden shrink-0 ring-2 shadow-md relative",
                  isMe
                    ? "ring-emerald-500 shadow-emerald-500/20"
                    : "ring-slate-800",
                )}
              >
                <img
                  className="w-full h-full object-cover"
                  src={
                    entry.photo ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(entry.name)}&background=0D9488&color=fff`
                  }
                  alt={`${entry.name}'s avatar`}
                />
              </div>

              {/* User Identity */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p
                    className={cn(
                      "text-sm font-bold truncate tracking-wide",
                      isMe
                        ? "text-emerald-400 font-extrabold"
                        : "text-slate-100",
                    )}
                  >
                    {entry.name}
                  </p>
                  {isMe && (
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[9px] font-black uppercase tracking-widest rounded-md border border-emerald-500/30 shadow-xs">
                      You
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-pulse" />
                  <span className="text-[10px] text-slate-400 font-bold tracking-wide uppercase">
                    Active Streak
                  </span>
                </div>
              </div>

              {/* Points Box */}
              <div className="text-right shrink-0 pl-2">
                <p
                  className={cn(
                    "text-lg font-black tracking-tight",
                    isMe ? "text-emerald-400" : "text-white",
                  )}
                >
                  {entry.totalPoints.toLocaleString()}
                </p>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest -mt-0.5">
                  Points
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
