import { motion } from "framer-motion";
import { Globe, Users, UserPlus, Lock, Plus, Activity } from "lucide-react";
import { cn } from "@/app/utils/utils";
import { bebasNeue } from "@/app/constants";

const tabs = [
  { id: "discover", label: "Discover", icon: Globe },
  { id: "my", label: "Active", icon: Users },
  { id: "requests", label: "Inbox", icon: UserPlus },
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
    <div className="space-y-5">
      {/* Upper Navigation Row */}
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-center shadow-2xs">
            <Activity className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex flex-col">
            <h2
              className={cn(
                "text-lg tracking-normal text-slate-800 leading-none",
                bebasNeue.className,
              )}
            >
              Challenge Hub
            </h2>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                Network Live
              </span>
            </div>
          </div>
        </div>

        {/* Action Panel Group */}
        <div className="flex items-center gap-2">
          <button
            onClick={onJoinCode}
            className="p-2.5 bg-white border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 hover:text-slate-700 active:scale-95 transition-all shadow-2xs"
            title="Enter Join Code"
          >
            <Lock className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onCreate}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Create</span>
          </button>
        </div>
      </div>

      {/* Segmented Controller Tab Bar */}
      <div className="bg-slate-200/50 backdrop-blur-md p-1 rounded-xl flex items-center border border-slate-200/30">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "relative flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-200 outline-none",
                isActive
                  ? "text-slate-900"
                  : "text-slate-400 hover:text-slate-600",
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTabPill"
                  className="absolute inset-0 bg-white border border-slate-200/60 shadow-xs rounded-lg"
                  transition={{ type: "spring", bounce: 0.12, duration: 0.4 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <Icon
                  className={cn(
                    "w-3.5 h-3.5",
                    isActive ? "text-emerald-600" : "text-slate-400",
                  )}
                />
                {tab.label}
                {tab.id === "requests" && pendingCount > 0 && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
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
