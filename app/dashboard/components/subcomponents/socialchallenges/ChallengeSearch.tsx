// app/dashboard/components/subcomponents/socialchallenges/ChallengeSearch.tsx
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
import { activityOptions } from "@/app/types/challengeConstant";

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2";

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
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", damping: 22, stiffness: 300 }}
      className="space-y-2"
    >
      {/* Controls bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-2">
        <div className="flex flex-col lg:flex-row lg:items-center gap-2">
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search challenges…"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className={cn(
                "w-full h-11 pl-9 pr-3 text-base sm:text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none transition-all text-slate-900 placeholder:text-slate-400 font-medium",
                "focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15",
                FOCUS,
              )}
            />
          </div>

          {/* Filters + desktop reset */}
          <div className="grid grid-cols-2 lg:flex lg:items-center gap-2">
            <CustomSelectFilter
              icon={<Activity className="w-4 h-4 text-emerald-600" />}
              label="Activity"
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
              icon={<Calendar className="w-4 h-4 text-slate-500" />}
              label="Month"
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

            <button
              onClick={onReset}
              className={cn(
                "hidden lg:inline-flex items-center justify-center gap-1.5 h-11 px-4 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 transition-colors shrink-0 shadow-xs",
                FOCUS,
              )}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Sub-bar */}
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] sm:text-xs text-slate-500 font-medium">
          <span className="font-bold text-slate-900">{resultCount}</span>{" "}
          {resultCount === 1 ? "challenge" : "challenges"} found
        </span>

        <button
          onClick={onReset}
          className={cn(
            "lg:hidden inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-emerald-700 transition-colors h-8 px-2 rounded-lg",
            FOCUS,
          )}
        >
          <RotateCcw className="w-3 h-3" />
          Reset
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
    <div className="relative lg:w-44" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={cn(
          "w-full flex items-center gap-2 h-11 px-3 bg-slate-50 border rounded-xl transition-colors text-left",
          isOpen
            ? "bg-white border-emerald-500 ring-2 ring-emerald-500/15"
            : "border-slate-200 hover:bg-white hover:border-slate-300",
          FOCUS,
        )}
      >
        <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
          {displayIcon || icon}
        </div>

        <div className="flex flex-col min-w-0 flex-1 leading-none">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
            {label}
          </span>
          <span className="text-xs font-semibold text-slate-900 truncate">
            {displayLabel}
          </span>
        </div>

        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200",
            isOpen && "rotate-180 text-emerald-600",
          )}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            role="listbox"
            className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg p-1 z-50 max-h-64 overflow-y-auto custom-emerald-scrollbar"
          >
            {options.map((opt: any) => {
              const isSelected = opt.value === value;
              const optIcon =
                isActivity && opt.value ? getActivityIcon(opt.value) : null;

              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold text-left transition-colors",
                    isSelected
                      ? "bg-emerald-600 text-white"
                      : "text-slate-700 hover:bg-emerald-50 hover:text-emerald-900",
                    FOCUS,
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {optIcon && (
                      <div
                        className={cn(
                          "w-5 h-5 rounded flex items-center justify-center shrink-0",
                          isSelected ? "text-white" : "text-emerald-600",
                        )}
                      >
                        {optIcon}
                      </div>
                    )}
                    <span className="truncate">{opt.label}</span>
                  </div>

                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-white shrink-0" />
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
