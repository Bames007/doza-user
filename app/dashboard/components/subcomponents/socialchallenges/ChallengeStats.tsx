// app/dashboard/components/subcomponents/socialchallenges/ChallengeStats.tsx
import { motion } from "framer-motion";
import {
  Crown,
  Target,
  Activity,
  Trophy,
  Users,
  MedalIcon,
} from "lucide-react";
import { cn } from "@/app/utils/utils";
import { SkeletonStatCard } from "./SkeletonCard";
import { UserInfo } from "@/app/dashboard/hooks/useProfile";

const statCards = [
  {
    icon: Target,
    label: "Points",
    color: "text-emerald-600",
    bg: "bg-emerald-50/70",
  },
  {
    icon: Activity,
    label: "Active",
    color: "text-blue-600",
    bg: "bg-blue-50/70",
  },
  {
    icon: Trophy,
    label: "Created",
    color: "text-amber-600",
    bg: "bg-amber-50/70",
  },
  {
    icon: Users,
    label: "Joined",
    color: "text-purple-600",
    bg: "bg-purple-50/70",
  },
];

export function ChallengeStats({
  user,
  stats,
  trophy,
}: {
  user: UserInfo;
  stats: any;
  trophy: React.ReactNode;
}) {
  if (!user) {
    return (
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-100" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-32 rounded-md bg-slate-200" />
            <div className="h-3 w-24 rounded-md bg-slate-100" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {statCards.map((_, i) => (
            <SkeletonStatCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden group"
    >
      {/* Ambient texture + brand wash */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1200&q=60&auto=format&fit=crop')] bg-cover bg-center mix-blend-multiply"
      />
      <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-emerald-50/30 pointer-events-none" />

      {/* Trophy */}
      <div className="absolute -top-6 -right-6 w-40 h-40 opacity-15 group-hover:opacity-25 transition-opacity duration-500 pointer-events-none mix-blend-multiply">
        {trophy}
      </div>

      <div className="relative z-10 p-4 sm:p-5 lg:p-6">
        {/* Profile row */}
        <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-5">
          <div className="relative shrink-0">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden flex items-center justify-center">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  className="w-full h-full object-cover"
                  alt="Profile"
                />
              ) : (
                <span className="text-xl sm:text-2xl font-bold text-emerald-600">
                  {user.fullName?.charAt(0) || "U"}
                </span>
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 bg-slate-900 p-1 rounded-md ring-2 ring-white flex items-center justify-center">
              <Crown className="w-3 h-3 text-amber-400 fill-amber-400" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 tracking-tight leading-tight truncate">
              {user.fullName}
            </h2>
            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold uppercase tracking-wider rounded-md">
                <MedalIcon className="w-2.5 h-2.5" />
                Pro Level
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                Challenger
              </span>
            </div>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {statCards.map((stat, i) => {
            const value =
              i === 0
                ? stats?.points
                : i === 1
                  ? stats?.ongoing
                  : i === 2
                    ? stats?.created
                    : stats?.joined;
            const Icon = stat.icon;
            return (
              <div
                key={i}
                className={cn(
                  "rounded-xl p-3 border border-slate-200/70 flex flex-col gap-2 transition-all duration-200 hover:border-slate-300",
                  stat.bg,
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="p-1.5 bg-white rounded-lg shadow-xs">
                    <Icon className={cn("w-3.5 h-3.5", stat.color)} />
                  </div>
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                    {stat.label}
                  </span>
                  <span className="block text-lg sm:text-xl font-bold text-slate-900 leading-none tracking-tight tabular-nums">
                    {value?.toLocaleString() || 0}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
