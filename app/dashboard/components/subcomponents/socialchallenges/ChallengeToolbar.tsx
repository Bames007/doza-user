// app/dashboard/components/subcomponents/socialchallenges/ChallengeToolbar.tsx
import { motion } from "framer-motion";
import { Globe, Users, UserPlus, Plus, KeyRound } from "lucide-react";
import { cn } from "@/app/utils/utils";

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2";

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
    <div className="sticky top-2 sm:top-4 z-40 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-xs">
      {/* Main row — tabs + actions */}
      <div className="flex flex-col md:flex-row md:items-center md:gap-3 p-2 md:p-2.5">
        {/* Tabs — segmented control */}
        <div className="flex items-center gap-1 p-1 bg-slate-100/80 rounded-xl flex-1 min-w-0">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "relative flex items-center justify-center gap-1.5 flex-1 min-h-9 px-2 sm:px-3 rounded-lg text-[11px] sm:text-xs font-semibold transition-colors duration-200 outline-none min-w-0",
                  isActive
                    ? "text-slate-900"
                    : "text-slate-500 hover:text-slate-700",
                  FOCUS,
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="challenge-tab-pill"
                    className="absolute inset-0 bg-white rounded-lg shadow-xs"
                    transition={{
                      type: "spring",
                      bounce: 0.12,
                      duration: 0.35,
                    }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5 min-w-0">
                  <Icon
                    className={cn(
                      "w-3.5 h-3.5 shrink-0 transition-colors",
                      isActive ? "text-emerald-600" : "text-slate-400",
                    )}
                  />
                  <span className="truncate hidden sm:inline">{tab.label}</span>
                  <span className="truncate sm:hidden">{tab.shortLabel}</span>
                  {tab.id === "requests" && pendingCount > 0 && (
                    <span
                      className={cn(
                        "inline-flex items-center justify-center px-1.5 min-w-[16px] h-[16px] rounded-full text-[9px] font-bold shrink-0 transition-colors",
                        isActive
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-rose-100 text-rose-700",
                      )}
                    >
                      {pendingCount}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 md:flex md:items-center gap-2 mt-2 md:mt-0 shrink-0">
          <button
            onClick={onJoinCode}
            className={cn(
              "group inline-flex items-center justify-center gap-1.5 min-h-9 md:min-h-10 px-3 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 text-[11px] sm:text-xs font-semibold transition-colors",
              FOCUS,
            )}
            title="Enter join code"
          >
            <KeyRound className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-600 transition-colors shrink-0" />
            <span className="truncate">Join Code</span>
          </button>

          <button
            onClick={onCreate}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 min-h-9 md:min-h-10 px-3.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-[11px] sm:text-xs font-bold shadow-sm shadow-emerald-600/20 transition-colors",
              FOCUS,
            )}
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
            <span>Create</span>
          </button>
        </div>
      </div>
    </div>
  );
}
