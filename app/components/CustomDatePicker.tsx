// app/registration/components/DatePicker.tsx
"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import { createPortal } from "react-dom";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { cn } from "@/app/utils/utils";

interface DatePickerProps {
  value: string; // ISO "YYYY-MM-DD" or ""
  onChange: (value: string) => void;
  placeholder?: string;
  maxDate?: Date;
  minDate?: Date;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const DAYS_SHORT = ["S", "M", "T", "W", "T", "F", "S"];
const DAYS_FULL = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2";

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function toIso(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

function formatDisplay(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return `${pad(d)} ${MONTHS[m - 1].slice(0, 3)} ${y}`;
}

export default function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  maxDate,
  minDate,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const today = useMemo(() => new Date(), []);
  const initial = value ? new Date(value + "T00:00:00") : today;
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  useEffect(() => setMounted(true), []);

  // Detect mobile for popover vs bottom sheet
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Sync view when value changes
  useEffect(() => {
    if (!value) return;
    const d = new Date(value + "T00:00:00");
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }, [value]);

  // Position popover on desktop
  useEffect(() => {
    if (!open || isMobile) return;
    const update = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const popoverWidth = 344;
      const left = Math.min(rect.left, window.innerWidth - popoverWidth - 16);
      setCoords({ top: rect.bottom + 8, left: Math.max(16, left) });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, isMobile]);

  // Outside click (desktop) + Escape
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  // Return focus to trigger on close
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !open) {
      triggerRef.current?.focus();
    }
    wasOpen.current = open;
  }, [open]);

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const todayIso = toIso(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const maxIso = maxDate
    ? toIso(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate())
    : undefined;

  const minIso = minDate // ← new
    ? toIso(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())
    : undefined;

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else setViewMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else setViewMonth((m) => m + 1);
  };

  const pick = (day: number) => {
    const iso = toIso(viewYear, viewMonth, day);
    onChange(iso);
    setOpen(false);
  };

  // Arrow-key navigation between days
  const handleDayKey = (e: React.KeyboardEvent, day: number) => {
    let delta = 0;
    if (e.key === "ArrowLeft") delta = -1;
    else if (e.key === "ArrowRight") delta = 1;
    else if (e.key === "ArrowUp") delta = -7;
    else if (e.key === "ArrowDown") delta = 7;
    else return;

    e.preventDefault();
    const target = day + delta;
    if (target < 1) {
      prevMonth();
      // focus will land on first cell next render
    } else if (target > daysInMonth) {
      nextMonth();
    } else {
      const targetIso = toIso(viewYear, viewMonth, target);
      if (maxIso && targetIso > maxIso) return;
      const el = panelRef.current?.querySelector<HTMLButtonElement>(
        `[data-iso="${targetIso}"]`,
      );
      el?.focus();
    }
  };

  const calendarContent = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={prevMonth}
          aria-label="Previous month"
          className={cn(
            "min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 active:scale-95 transition-all",
            FOCUS,
          )}
        >
          <ChevronLeft size={20} aria-hidden />
        </button>

        <div className="text-center">
          <p className="text-sm font-bold text-slate-900 tracking-tight">
            {MONTHS[viewMonth]} {viewYear}
          </p>
          <p className="text-xs text-slate-500 font-medium">
            {maxIso ? "Past dates only" : "Select a date"}
          </p>
        </div>

        <button
          type="button"
          onClick={nextMonth}
          aria-label="Next month"
          className={cn(
            "min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 active:scale-95 transition-all",
            FOCUS,
          )}
        >
          <ChevronRight size={20} aria-hidden />
        </button>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 gap-1 mb-1.5">
        {DAYS_SHORT.map((d, i) => (
          <div
            key={`wd-${i}`}
            className="text-center text-xs font-bold uppercase tracking-wider text-slate-500 py-1"
            aria-label={DAYS_FULL[i]}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`e-${i}`} aria-hidden />;
          const iso = toIso(viewYear, viewMonth, day);
          const isSelected = iso === value;
          const isToday = iso === todayIso;
          const isDisabled =
            (maxIso ? iso > maxIso : false) || (minIso ? iso < minIso : false);

          return (
            <button
              key={iso}
              type="button"
              data-iso={iso}
              disabled={isDisabled}
              onClick={() => pick(day)}
              onKeyDown={(e) => handleDayKey(e, day)}
              aria-label={`${DAYS_FULL[new Date(iso + "T00:00:00").getDay()]}, ${MONTHS[viewMonth]} ${day}, ${viewYear}`}
              aria-selected={isSelected}
              aria-current={isToday ? "date" : undefined}
              className={cn(
                "min-h-11 aspect-square rounded-xl text-sm font-semibold transition-all",
                isSelected
                  ? "bg-emerald-600 text-white shadow-sm"
                  : isToday
                    ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 ring-1 ring-inset ring-emerald-200"
                    : "text-slate-700 hover:bg-slate-100",
                isDisabled &&
                  "opacity-30 cursor-not-allowed hover:bg-transparent",
                FOCUS,
              )}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => {
            onChange("");
            setOpen(false);
          }}
          className={cn(
            "min-h-11 inline-flex items-center justify-center px-3 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:scale-95 transition-all",
            FOCUS,
          )}
        >
          Clear
        </button>

        <button
          type="button"
          onClick={() => {
            const d = new Date();
            setViewYear(d.getFullYear());
            setViewMonth(d.getMonth());
            pick(d.getDate());
          }}
          disabled={maxIso ? todayIso > maxIso : false}
          className={cn(
            "min-h-11 inline-flex items-center justify-center px-4 rounded-xl text-sm font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed",
            FOCUS,
          )}
        >
          Today
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Trigger */}
      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="dialog"
          aria-expanded={open}
          className={cn(
            "w-full min-h-12 flex items-center pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-left text-sm font-semibold text-slate-900 outline-none transition-all",
            "focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20",
            open && "bg-white border-emerald-600 ring-2 ring-emerald-600/20",
          )}
        >
          <CalendarIcon
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
            size={18}
            aria-hidden
          />
          <span className={value ? "text-slate-900" : "text-slate-500"}>
            {value ? formatDisplay(value) : placeholder}
          </span>
        </button>
      </div>

      {/* Calendar — portal escapes overflow-y-auto parents */}
      {open &&
        mounted &&
        createPortal(
          <>
            {/* Mobile backdrop */}
            {isMobile && (
              <div
                className="fixed inset-0 z-[100] bg-slate-950/50 backdrop-blur-sm animate-in fade-in duration-150"
                onClick={() => setOpen(false)}
                aria-hidden
              />
            )}

            <div
              ref={panelRef}
              role="dialog"
              aria-modal={isMobile ? "true" : undefined}
              aria-label="Select date"
              className={cn(
                "fixed z-[101] bg-white shadow-2xl border border-slate-200",
                isMobile
                  ? "inset-x-0 bottom-0 rounded-t-3xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))] animate-in slide-in-from-bottom duration-200"
                  : "rounded-2xl p-4 w-[344px] animate-in fade-in zoom-in-95 duration-150",
              )}
              style={
                !isMobile ? { top: coords.top, left: coords.left } : undefined
              }
            >
              {/* Mobile drag handle + close */}
              {isMobile && (
                <div className="flex items-center justify-between mb-3">
                  <div
                    className="w-10 h-1 rounded-full bg-slate-300"
                    aria-hidden
                  />
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close date picker"
                    className={cn(
                      "min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100",
                      FOCUS,
                    )}
                  >
                    <X size={20} aria-hidden />
                  </button>
                </div>
              )}

              {calendarContent}
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
