import { motion } from "framer-motion";
import {
  Search,
  Activity,
  Calendar,
  RotateCcw,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/app/utils/utils";
import { bebasNeue } from "@/app/constants";
import { activityOptions } from "@/app/types/challengeConstant";

export function ChallengeSearch({
  search,
  onSearchChange,
  activity,
  onActivityChange,
  month,
  onMonthChange,
  onReset,
  resultCount,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  activity: string;
  onActivityChange: (v: string) => void;
  month: string;
  onMonthChange: (v: string) => void;
  onReset: () => void;
  resultCount: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", damping: 20 }}
      className="relative z-20 mb-8 px-0.5"
    >
      <div className="bg-white rounded-[24px] p-2 border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="flex flex-col lg:flex-row items-stretch gap-2">
          {/* Main Search Input */}
          <div className="flex-1 relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search className="text-slate-400 group-focus-within:text-emerald-600 transition-colors w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search challenges..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-11 pr-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-[18px] focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all duration-300 outline-none text-slate-900 placeholder:text-slate-400 font-medium"
            />
          </div>

          {/* Filtering Dropdown Group */}
          <div className="flex flex-col sm:flex-row gap-2 flex-none lg:flex-initial">
            <SelectFilter
              icon={<Activity className="w-3.5 h-3.5 text-emerald-600" />}
              label="Activity"
              value={activity}
              onChange={onActivityChange}
              options={[
                { value: "", label: "All Activities" },
                ...activityOptions.map((a) => ({
                  value: a.value,
                  label: a.label,
                  icon: a.icon,
                })),
              ]}
            />
            <SelectFilter
              icon={<Calendar className="w-3.5 h-3.5 text-blue-600" />}
              label="Season"
              value={month}
              onChange={onMonthChange}
              options={[
                { value: "all", label: "Full Season" },
                ...Array.from({ length: 12 }, (_, i) => ({
                  value: i.toString(),
                  label: new Date(0, i).toLocaleString("default", {
                    month: "long",
                  }),
                })),
              ]}
            />
          </div>

          {/* Desktop Reset Button */}
          <button
            onClick={onReset}
            className="hidden lg:flex items-center gap-1.5 px-5 py-3 bg-slate-900 text-white rounded-[18px] text-[11px] font-bold uppercase tracking-wider hover:bg-emerald-600 active:scale-95 transition-all shadow-sm"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        </div>
      </div>

      {/* Sub-bar Indicators */}
      <div className="mt-3.5 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span
            className={cn(
              "text-[11px] font-bold text-slate-600 uppercase tracking-widest",
              bebasNeue.className,
            )}
          >
            Showing {resultCount} Active Rounds
          </span>
        </div>

        {/* Mobile Reset */}
        <button
          onClick={onReset}
          className="flex lg:hidden items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider hover:text-slate-900 transition-colors"
        >
          <RotateCcw className="w-2.5 h-2.5" />
          Clear Filters
        </button>
      </div>
    </motion.div>
  );
}

function SelectFilter({ icon, label, value, onChange, options }: any) {
  const selectedOption = options.find((o: any) => o.value === value);
  const displayLabel = selectedOption?.label || "All";
  const displayIcon = selectedOption?.icon;

  return (
    <div className="relative flex-1 lg:w-44 flex items-center gap-2.5 pl-3 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-[18px] hover:bg-white hover:border-slate-300 hover:shadow-sm transition-all duration-200 h-12 lg:h-auto overflow-visible group">
      {/* Icon Box */}
      <div className="p-1.5 bg-white rounded-lg border border-slate-100 shadow-sm flex items-center justify-center shrink-0">
        {icon}
      </div>

      {/* Label + Selected Value */}
      <div className="flex flex-col min-w-0 pointer-events-none flex-1">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-0.5">
          {label}
        </span>
        <span className="text-xs font-bold text-slate-900 truncate flex items-center gap-1">
          {displayIcon && (
            <span className="text-sm leading-none">{displayIcon}</span>
          )}
          {displayLabel}
        </span>
      </div>

      {/* Chevron Indicator */}
      <div className="pointer-events-none text-slate-400 group-hover:text-slate-600 transition-colors shrink-0">
        <ChevronDown className="w-3.5 h-3.5" />
      </div>

      {/* Native Select (invisible overlay for functionality) */}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-pointer appearance-none"
        aria-label={`Filter by ${label}`}
      >
        {options.map((opt: any) => (
          <option
            key={opt.value}
            value={opt.value}
            className="text-slate-900 bg-white"
          >
            {opt.icon ? `${opt.icon} ${opt.label}` : opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
