import { motion } from "framer-motion";
import {
  Crown,
  Target,
  Activity,
  Trophy,
  Users,
  Medal,
  MedalIcon,
} from "lucide-react";
import { cn } from "@/app/utils/utils";
import { bebasNeue } from "@/app/constants";
import { SkeletonStatCard } from "./SkeletonCard";
import { UserInfo } from "@/app/dashboard/hooks/useProfile";

const statCards = [
  {
    icon: Target,
    label: "Points",
    color: "text-emerald-600",
    border: "border-emerald-200/60",
    bg: "bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/30",
    accent: "group-hover:border-emerald-300",
  },
  {
    icon: Activity,
    label: "Active",
    color: "text-blue-600",
    border: "border-blue-200/60",
    bg: "bg-gradient-to-br from-blue-50/80 via-white to-blue-50/30",
    accent: "group-hover:border-blue-300",
  },
  {
    icon: Trophy,
    label: "Created",
    color: "text-amber-600",
    border: "border-amber-200/60",
    bg: "bg-gradient-to-br from-amber-50/80 via-white to-amber-50/30",
    accent: "group-hover:border-amber-300",
  },
  {
    icon: Users,
    label: "Joined",
    color: "text-purple-600",
    border: "border-purple-200/60",
    bg: "bg-gradient-to-br from-purple-50/80 via-white to-purple-50/30",
    accent: "group-hover:border-purple-300",
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
      <div className="bg-white/95 backdrop-blur-2xl rounded-[32px] p-6 sm:p-8 border border-slate-200/80 shadow-[0_16px_48px_rgba(0,0,0,0.04)]">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {statCards.map((_, i) => (
            <SkeletonStatCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative bg-white/95 backdrop-blur-2xl rounded-[32px] p-6 sm:p-8 border border-slate-200/80 shadow-[0_16px_48px_rgba(0,0,0,0.04)] overflow-hidden group"
    >
      {/* Background Graphic Blend Accent */}
      <div className="absolute top-[-30px] right-[-30px] w-52 h-52 opacity-15 group-hover:opacity-30 group-hover:scale-110 transition-all duration-700 pointer-events-none mix-blend-multiply">
        {trophy}
      </div>

      <div className="relative z-10 flex flex-col md:flex-row items-center md:items-center gap-6 sm:gap-8">
        {/* Avatar Presentation Wrapper */}
        <div className="relative shrink-0">
          <div className="w-22 h-22 sm:w-24 sm:h-24 rounded-[26px] bg-gradient-to-tr from-slate-100 to-white p-1.5 border border-slate-200/80 shadow-lg overflow-hidden flex items-center justify-center group-hover:border-emerald-500/40 transition-all duration-300">
            {user.avatar ? (
              <img
                src={user.avatar}
                className="w-full h-full object-cover rounded-[20px]"
                alt="Profile"
              />
            ) : (
              <span
                className={cn(
                  "text-4xl text-emerald-600 font-extrabold",
                  bebasNeue.className,
                )}
              >
                {user.fullName?.charAt(0) || "U"}
              </span>
            )}
          </div>
          <div className="absolute -bottom-1.5 -right-1.5 bg-slate-900 text-white p-2 rounded-xl shadow-lg border-2 border-white flex items-center justify-center">
            <Crown className="w-4 h-4 text-amber-400 fill-amber-400 animate-pulse" />
          </div>
        </div>

        {/* Profile Details Content */}
        <div className="flex-1 w-full text-center md:text-left">
          <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-2.5 mb-5">
            <h2
              className={cn(
                "text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-wide leading-none",
                bebasNeue.className,
              )}
            >
              {user.fullName}
            </h2>
            <div className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-md shadow-emerald-600/20">
              <MedalIcon className="w-3 h-3" />
              <span>Pro Level</span>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            {statCards.map((stat, i) => {
              const value =
                i === 0
                  ? stats?.points
                  : i === 1
                    ? stats?.ongoing
                    : i === 2
                      ? stats?.created
                      : stats?.joined;
              return (
                <div
                  key={i}
                  className={cn(
                    "group/card p-4 rounded-[22px] border flex flex-col items-center md:items-start transition-all duration-300 hover:-translate-y-1 hover:shadow-md",
                    stat.bg,
                    stat.border,
                    stat.accent,
                  )}
                >
                  <div className="p-2 bg-white rounded-xl border border-slate-100 shadow-xs mb-3 group-hover/card:scale-110 transition-transform">
                    <stat.icon className={cn("w-4 h-4", stat.color)} />
                  </div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                    {stat.label}
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {value?.toLocaleString() || 0}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
