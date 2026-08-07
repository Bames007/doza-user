import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import {
  Search,
  Activity,
  Calendar,
  RotateCcw,
  ChevronDown,
  Footprints,
  Bike,
  Dumbbell,
  Waves,
  Zap,
  Check,
} from "lucide-react";
import { cn } from "@/app/utils/utils";
import { bebasNeue } from "@/app/constants";
import { activityOptions } from "@/app/types/challengeConstant";

// Helper map to replace string/emoji icons with high-end clean Lucide SVG icons
const getActivityIcon = (value: string) => {
  const props = { className: "w-3.5 h-3.5 text-emerald-600" };
  switch (value) {
    case "running":
    case "jogging":
    case "walking":
      return <Footprints {...props} />;
    case "cycling":
      return <Bike {...props} />;
    case "pushups":
    case "situps":
    case "squats":
    case "pullups":
      return <Dumbbell {...props} />;
    case "swimming":
      return <Waves {...props} />;
    default:
      return <Zap {...props} />;
  }
};

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
      className="relative z-50 mb-8 px-0.5"
    >
      <div className="bg-white/95 backdrop-blur-2xl rounded-[32px] p-3 border border-slate-200/80 shadow-[0_16px_48px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col lg:flex-row items-stretch gap-3">
          {/* Main Search Input */}
          <div className="flex-1 relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search className="text-slate-400 group-focus-within:text-emerald-600 transition-colors w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search challenges by name or keyword..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-11 pr-4 py-4 text-sm bg-slate-50/80 border border-slate-200/80 rounded-[22px] focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all duration-300 outline-none text-slate-900 placeholder:text-slate-400 font-medium shadow-2xs"
            />
          </div>

          {/* Filtering Custom Dropdown Group */}
          <div className="flex flex-col sm:flex-row gap-3 flex-none lg:flex-initial">
            <CustomSelectFilter
              icon={<Activity className="w-4 h-4 text-emerald-600" />}
              label="Activity Type"
              value={activity}
              onChange={onActivityChange}
              options={[
                { value: "", label: "All Activities" },
                ...activityOptions.map((a) => ({
                  value: a.value,
                  label: a.label,
                })),
              ]}
              isActivity={true}
            />
            <CustomSelectFilter
              icon={<Calendar className="w-4 h-4 text-blue-600" />}
              label="Season Month"
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
            className="hidden lg:flex items-center justify-center gap-2 px-6 py-4 bg-slate-900 text-white rounded-[22px] text-xs font-bold uppercase tracking-wider hover:bg-emerald-600 active:scale-95 transition-all shadow-sm hover:shadow-md hover:shadow-emerald-600/20 shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      </div>

      {/* Sub-bar Indicators */}
      <div className="mt-3.5 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          </span>
          <span
            className={cn(
              "text-xs font-bold text-slate-700 tracking-wider uppercase",
              bebasNeue.className,
            )}
          >
            Showing{" "}
            <span className="text-emerald-600 font-extrabold">
              {resultCount}
            </span>{" "}
            Active Rounds
          </span>
        </div>

        {/* Mobile Reset */}
        <button
          onClick={onReset}
          className="flex lg:hidden items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider hover:text-slate-900 transition-colors bg-white px-3 py-1.5 rounded-full border border-slate-200/80 shadow-2xs"
        >
          <RotateCcw className="w-3 h-3 text-emerald-600" />
          Clear Filters
        </button>
      </div>
    </motion.div>
  );
}

function CustomSelectFilter({
  icon,
  label,
  value,
  onChange,
  options,
  isActivity,
}: any) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o: any) => o.value === value);
  const displayLabel = selectedOption?.label || "All";
  const displayIcon = isActivity && value ? getActivityIcon(value) : null;

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <div className="relative flex-1 lg:w-56" ref={dropdownRef}>
      {/* Trigger Button */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative flex items-center gap-3.5 px-3.5 py-2.5 bg-slate-50/80 border rounded-[22px] transition-all duration-300 h-16 lg:h-auto cursor-pointer shadow-2xs group",
          isOpen
            ? "bg-white border-emerald-500 ring-4 ring-emerald-500/10 shadow-md"
            : "border-slate-200/80 hover:bg-white hover:border-slate-300 hover:shadow-md",
        )}
      >
        {/* Icon Box */}
        <div className="p-2.5 bg-white rounded-2xl border border-slate-200/60 shadow-xs flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:border-emerald-500/30 transition-all">
          {displayIcon || icon}
        </div>

        {/* Label + Selected Value */}
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
            {label}
          </span>
          <span className="text-xs font-extrabold text-slate-900 truncate tracking-tight">
            {displayLabel}
          </span>
        </div>

        {/* Chevron Indicator */}
        <div className="text-slate-400 group-hover:text-slate-700 transition-colors shrink-0 pr-1">
          <ChevronDown
            className={cn(
              "w-4 h-4 transition-transform duration-300",
              isOpen && "rotate-180 text-emerald-600",
            )}
          />
        </div>
      </div>

      {/* Styled Floating Options Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 4, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute left-0 right-0 top-full mt-2 bg-white/95 backdrop-blur-2xl border border-slate-200/80 rounded-[24px] shadow-2xl p-2 z-50 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent"
          >
            <div className="space-y-1">
              {options.map((opt: any) => {
                const isSelected = opt.value === value;
                const optIcon =
                  isActivity && opt.value ? getActivityIcon(opt.value) : null;

                return (
                  <div
                    key={opt.value}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold cursor-pointer transition-all duration-200",
                      isSelected
                        ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20"
                        : "text-slate-700 hover:bg-emerald-50 hover:text-emerald-900",
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {optIcon && (
                        <div
                          className={cn(
                            "p-1.5 rounded-lg shrink-0",
                            isSelected
                              ? "bg-white/20 text-white"
                              : "bg-emerald-100/60 text-emerald-700",
                          )}
                        >
                          {optIcon}
                        </div>
                      )}
                      <span className="truncate">{opt.label}</span>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-white shrink-0 ml-2" />
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
