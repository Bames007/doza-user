import { motion } from "framer-motion";
import { Globe, Users, UserPlus, Plus, Activity, KeyRound } from "lucide-react";
import { cn } from "@/app/utils/utils";
import { bebasNeue } from "@/app/constants";

const tabs = [
  { id: "discover", label: "Discover", shortLabel: "Discover", icon: Globe },
  { id: "my", label: "Active Rounds", shortLabel: "Rounds", icon: Users },
  { id: "requests", label: "Inbox", shortLabel: "Inbox", icon: UserPlus },
] as const;

export function ChallengeToolbar({
  activeTab,
  onTabChange,
  onCreate,
  onJoinCode,
  pendingCount,
}: {
  activeTab: string;
  onTabChange: (tab: "my" | "discover" | "requests") => void;
  onCreate: () => void;
  onJoinCode: () => void;
  pendingCount: number;
}) {
  return (
    <div className="sticky top-2 sm:top-4 z-40 bg-white/95 backdrop-blur-xl p-3.5 sm:p-6 rounded-[22px] sm:rounded-[28px] border border-slate-200/80 shadow-[0_12px_40px_rgba(0,0,0,0.05)] space-y-3 sm:space-y-5 transition-all">
      {/* Upper Navigation Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 px-0.5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-11 sm:h-11 bg-slate-100 rounded-2xl border border-slate-200 flex items-center justify-center shadow-xs shrink-0">
            <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
          </div>
          <div className="flex flex-col">
            <h2
              className={cn(
                "text-xl sm:text-2xl tracking-wide text-slate-900 leading-none",
                bebasNeue.className,
              )}
            >
              Challenge Hub
            </h2>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1 sm:mt-1.5">
              Dashboard Overview
            </span>
          </div>
        </div>

        {/* Action Panel Group */}
        <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={onJoinCode}
            className="group flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-50 border border-slate-200/80 text-slate-600 rounded-[14px] sm:rounded-[18px] hover:bg-slate-100 hover:text-slate-900 hover:border-slate-300 active:scale-95 transition-all shadow-2xs text-[11px] sm:text-xs font-bold uppercase tracking-wider"
            title="Enter Join Code"
          >
            <KeyRound className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 transition-colors shrink-0" />
            <span className="truncate">Join Code</span>
          </button>

          <button
            onClick={onCreate}
            className="flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2.5 sm:py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[14px] sm:rounded-[18px] text-[11px] sm:text-xs font-bold uppercase tracking-wider shadow-md shadow-emerald-600/20 transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3] shrink-0" />
            <span>Create</span>
          </button>
        </div>
      </div>

      {/* Segmented Controller Tab Bar */}
      <div className="bg-slate-100/80 backdrop-blur-md p-1.5 rounded-[16px] sm:rounded-[20px] grid grid-cols-3 gap-1 border border-slate-200/60 shadow-inner">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "relative flex items-center justify-center gap-1 sm:gap-2 py-2.5 sm:py-3 px-1 sm:px-4 rounded-[12px] sm:rounded-[16px] text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all duration-300 outline-none truncate",
                isActive
                  ? "text-slate-900"
                  : "text-slate-400 hover:text-slate-600",
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTabPill"
                  className="absolute inset-0 bg-white border border-slate-200/80 shadow-[0_4px_16px_rgba(0,0,0,0.06)] rounded-[12px] sm:rounded-[16px]"
                  transition={{ type: "spring", bounce: 0.12, duration: 0.4 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1 sm:gap-2 truncate">
                <Icon
                  className={cn(
                    "w-3.5 h-3.5 sm:w-4 sm:h-4 transition-colors shrink-0",
                    isActive ? "text-emerald-600" : "text-slate-400",
                  )}
                />
                <span className="truncate hidden xs:inline sm:inline">
                  {tab.label}
                </span>
                <span className="truncate inline xs:hidden sm:hidden">
                  {tab.shortLabel}
                </span>
                {tab.id === "requests" && pendingCount > 0 && (
                  <span className="inline-flex items-center justify-center px-1.5 py-0.5 min-w-[16px] sm:min-w-[18px] rounded-full bg-rose-500 text-white text-[8px] sm:text-[9px] font-black tracking-tight shadow-sm shrink-0">
                    {pendingCount}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
