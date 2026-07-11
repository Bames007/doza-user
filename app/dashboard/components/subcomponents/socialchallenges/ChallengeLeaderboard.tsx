import { motion } from "framer-motion";
import { Medal, ArrowUpRight, Star, TrendingUp } from "lucide-react";
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
    <div className="bg-slate-900 rounded-[32px] p-6 shadow-2xl h-full border border-slate-800 flex flex-col min-h-[450px]">
      <div className="flex items-center justify-between mb-8 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="bg-slate-800 p-2.5 rounded-xl w-10 h-10" />
          <div className="h-5 w-28 bg-slate-800 rounded-md" />
        </div>
        <div className="w-5 h-5 bg-slate-800 rounded-md" />
      </div>

      <div className="space-y-4 flex-1">
        {[...Array(5)].map((_, idx) => (
          <div
            key={idx}
            className="flex items-center gap-4 p-3 rounded-2xl bg-white/[0.02] border border-transparent animate-pulse"
          >
            <div className="w-8 h-4 bg-slate-800 rounded mx-auto" />
            <div className="w-10 h-10 rounded-full bg-slate-800 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-24 bg-slate-800 rounded" />
              <div className="h-3 w-16 bg-slate-800 rounded" />
            </div>
            <div className="space-y-1 text-right">
              <div className="h-4 w-10 bg-slate-800 rounded ml-auto" />
              <div className="h-2 w-6 bg-slate-800 rounded ml-auto" />
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
      <div className="bg-slate-900 rounded-[32px] p-8 shadow-2xl h-full border border-slate-800 flex flex-col items-center justify-center text-center min-h-[350px]">
        <div className="p-4 bg-slate-800/40 rounded-2xl mb-4 border border-slate-800">
          <Medal className="w-8 h-8 text-slate-500" />
        </div>
        <p className="text-sm text-slate-300 font-semibold tracking-wide">
          No rankings yet
        </p>
        <p className="text-xs text-slate-500 mt-1 max-w-[200px]">
          Join active challenges to claim your spot on the board.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-[32px] p-6 shadow-2xl h-full border border-slate-800 flex flex-col">
      {/* Header section */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
            <Medal className="w-5 h-5 text-emerald-400" />
          </div>
          <h3
            className={cn(
              "text-xl text-white tracking-wider",
              bebasNeue.className,
            )}
          >
            Global Elite
          </h3>
        </div>
        <ArrowUpRight className="w-4 h-4 text-slate-500 hover:text-white transition-colors cursor-pointer" />
      </div>

      {/* Ranks list */}
      <div className="space-y-3 flex-1 overflow-y-auto pr-1">
        {entries.map((entry, idx) => {
          const isMe = entry.uid === currentUserId;

          return (
            <motion.div
              key={entry.uid}
              whileHover={{
                x: 4,
                backgroundColor: "rgba(255, 255, 255, 0.05)",
              }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className={cn(
                "flex items-center gap-4 p-3 rounded-2xl transition-all border",
                isMe
                  ? "bg-emerald-500/10 border-emerald-500/30 shadow-[inset_0_1px_2px_rgba(16,185,129,0.05)]"
                  : "bg-white/[0.02] border-slate-800/40",
              )}
            >
              {/* Placement Badges */}
              <div className="w-8 flex justify-center font-black text-sm">
                {idx === 0 ? (
                  <Star className="w-5 h-5 text-yellow-400 fill-yellow-400 drop-shadow-[0_2px_5px_rgba(234,179,8,0.3)]" />
                ) : idx === 1 ? (
                  <div className="text-slate-300 drop-shadow">2</div>
                ) : idx === 2 ? (
                  <div className="text-amber-500 drop-shadow">3</div>
                ) : (
                  <div className="text-slate-600 text-xs font-bold">
                    {idx + 1}
                  </div>
                )}
              </div>

              {/* Avatar Frame */}
              <div
                className={cn(
                  "w-10 h-10 rounded-full overflow-hidden shrink-0 ring-2",
                  isMe ? "ring-emerald-500/50" : "ring-slate-800",
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
                <p
                  className={cn(
                    "text-sm font-bold truncate tracking-wide",
                    isMe ? "text-emerald-400" : "text-slate-100",
                  )}
                >
                  {entry.name}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  <TrendingUp className="w-3 h-3 text-emerald-400" />
                  <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider">
                    Hot Streak
                  </span>
                </div>
              </div>

              {/* Points Box */}
              <div className="text-right shrink-0">
                <p
                  className={cn(
                    "text-sm font-black tracking-tight",
                    isMe ? "text-emerald-400" : "text-white",
                  )}
                >
                  {entry.totalPoints.toLocaleString()}
                </p>
                <p className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest -mt-0.5">
                  Pts
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
