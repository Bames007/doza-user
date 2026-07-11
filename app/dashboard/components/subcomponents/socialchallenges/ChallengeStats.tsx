import { motion } from "framer-motion";
import { Crown, Target, Activity, Trophy, Users } from "lucide-react";
import { cn } from "@/app/utils/utils";
import { bebasNeue } from "@/app/constants";
import { SkeletonStatCard } from "./SkeletonCard";
import { UserInfo } from "@/app/dashboard/hooks/useProfile";

const statCards = [
  {
    icon: Target,
    label: "Points",
    color: "text-emerald-600",
    border: "border-emerald-100/70",
    bg: "bg-emerald-50/40",
  },
  {
    icon: Activity,
    label: "Active",
    color: "text-blue-600",
    border: "border-blue-100/70",
    bg: "bg-blue-50/40",
  },
  {
    icon: Trophy,
    label: "Created",
    color: "text-amber-600",
    border: "border-amber-100/70",
    bg: "bg-amber-50/40",
  },
  {
    icon: Users,
    label: "Joined",
    color: "text-purple-600",
    border: "border-purple-100/70",
    bg: "bg-purple-50/40",
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
      <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-xl shadow-slate-100/40">
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
      className="relative bg-white rounded-[24px] p-6 sm:p-8 border border-slate-200/60 shadow-[0_12px_40px_rgba(0,0,0,0.03)] overflow-hidden group"
    >
      {/* Background Graphic Blend */}
      <div className="absolute top-[-20px] right-[-20px] w-44 h-44 opacity-20 group-hover:opacity-35 group-hover:scale-105 transition-all duration-500 pointer-events-none mix-blend-multiply">
        {trophy}
      </div>

      <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8">
        {/* Avatar Presentation Wrapper */}
        <div className="relative shrink-0">
          <div className="w-20 h-20 rounded-[22px] bg-gradient-to-tr from-slate-100 to-slate-50 p-1 border border-slate-200 shadow-md overflow-hidden flex items-center justify-center group-hover:border-slate-300 transition-colors">
            {user.avatar ? (
              <img
                src={user.avatar}
                className="w-full h-full object-cover rounded-[18px]"
                alt="Profile"
              />
            ) : (
              <span
                className={cn(
                  "text-3xl text-emerald-600 font-bold",
                  bebasNeue.className,
                )}
              >
                {user.fullName?.charAt(0) || "U"}
              </span>
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 bg-slate-900 text-white p-1.5 rounded-lg shadow-md border border-white">
            <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          </div>
        </div>

        {/* Profile Details Content */}
        <div className="flex-1 w-full text-center md:text-left">
          <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-2 mb-5">
            <h2
              className={cn(
                "text-3xl font-bold text-slate-800 tracking-tight",
                bebasNeue.className,
              )}
            >
              {user.fullName}
            </h2>
            <span className="px-2.5 py-0.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-sm">
              PRO LEVEL
            </span>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            {statCards.map((stat, i) => {
              const value =
                i === 0
                  ? stats.points
                  : i === 1
                    ? stats.ongoing
                    : i === 2
                      ? stats.created
                      : stats.joined;
              return (
                <div
                  key={i}
                  className={cn(
                    "p-3.5 rounded-2xl border flex flex-col items-center md:items-start transition-all hover:translate-y-[-2px] hover:shadow-sm",
                    stat.bg,
                    stat.border,
                  )}
                >
                  <div className="p-1.5 bg-white rounded-lg border border-slate-200/40 shadow-2xs mb-2">
                    <stat.icon className={cn("w-4 h-4", stat.color)} />
                  </div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">
                    {stat.label}
                  </span>
                  <span className="text-xl font-bold text-slate-800 tracking-tight">
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
