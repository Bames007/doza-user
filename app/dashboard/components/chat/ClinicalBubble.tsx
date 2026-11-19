// app/dashboard/components/chat/ClinicalBubbles.tsx
"use client";

import React from "react";
import { Pill, FlaskConical, FileText, Search, Plus } from "lucide-react";
import { cn } from "@/app/utils/utils";
import type {
  PrescriptionData,
  PrescriptionDrug,
  TestsData,
  TestItem,
  NoteData,
} from "./ClinicalPads";

const CATEGORY_LABEL: Record<NoteData["category"], string> = {
  general: "General",
  diagnosis: "Diagnosis",
  "follow-up": "Follow-up",
  advice: "Advice",
};

const PRIORITY_STYLE: Record<TestItem["priority"], string> = {
  routine: "bg-blue-50 text-blue-700 border-blue-200",
  urgent: "bg-amber-50 text-amber-700 border-amber-200",
  stat: "bg-rose-50 text-rose-700 border-rose-200",
};

function TappableRow({
  onTap,
  ariaLabel,
  className,
  children,
}: {
  onTap?: () => void;
  ariaLabel?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const base = cn(
    "w-full text-left rounded-lg bg-white border p-2 transition-all",
    className,
  );
  if (!onTap) return <div className={base}>{children}</div>;
  return (
    <button
      type="button"
      onClick={onTap}
      aria-label={ariaLabel}
      className={cn(
        base,
        "cursor-pointer hover:bg-emerald-50 hover:border-emerald-300 active:scale-[0.99]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1",
      )}
    >
      {children}
    </button>
  );
}

export function PrescriptionBubble({
  data,
  onDrugTap,
  onAddDrugTap,
}: {
  data: PrescriptionData;
  onDrugTap?: (drug: PrescriptionDrug, index: number) => void;
  onAddDrugTap?: (drug: PrescriptionDrug, index: number) => void;
}) {
  return (
    <div className="w-[260px] sm:w-[300px] max-w-full rounded-xl border border-emerald-200 bg-emerald-50 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white">
        <Pill size={14} />
        <span className="text-xs font-bold uppercase tracking-wider">
          Prescription
        </span>
      </div>
      <div className="p-3 space-y-2 max-h-72 overflow-y-auto">
        {data.drugs.map((d, i) => {
          const canFind = !!onDrugTap && !!d.name?.trim();
          const canAdd = !!onAddDrugTap && !!d.name?.trim();

          const inner = (
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-bold text-slate-900 truncate">
                {d.name}
              </p>
              <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5 text-[11px] text-slate-600">
                {d.dosage && (
                  <span className="font-semibold text-emerald-700">
                    {d.dosage}
                  </span>
                )}
                {d.frequency && <span>· {d.frequency}</span>}
                {d.duration && <span>· {d.duration}</span>}
              </div>
              {d.notes && (
                <p className="text-[10px] text-slate-500 italic mt-1">
                  {d.notes}
                </p>
              )}
            </div>
          );

          // When we have a "+" action, render a split layout:
          //   [ tappable area for find ] [ + button for add ]
          // Otherwise keep the original single-tappable-row layout.
          if (canAdd) {
            return (
              <div
                key={i}
                className="flex items-stretch rounded-lg bg-white border border-emerald-100 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => canFind && onDrugTap!(d, i)}
                  disabled={!canFind}
                  aria-label={
                    canFind ? `Search pharmacies for ${d.name}` : undefined
                  }
                  className={cn(
                    "flex-1 p-2 flex items-start gap-2 text-left",
                    canFind
                      ? "hover:bg-emerald-50 active:scale-[0.995] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500"
                      : "cursor-default",
                  )}
                >
                  {inner}
                  {canFind && (
                    <Search
                      size={12}
                      className="text-emerald-600 shrink-0 mt-1"
                      aria-hidden
                    />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onAddDrugTap!(d, i)}
                  aria-label={`Add ${d.name} to my medications`}
                  title="Add to my medications"
                  className="shrink-0 w-9 border-l border-emerald-100 text-emerald-700 hover:bg-emerald-100 active:scale-[0.98] inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500"
                >
                  <Plus size={14} />
                </button>
              </div>
            );
          }

          return (
            <TappableRow
              key={i}
              onTap={canFind ? () => onDrugTap!(d, i) : undefined}
              ariaLabel={
                canFind ? `Search pharmacies for ${d.name}` : undefined
              }
              className="border-emerald-100"
            >
              <div className="flex items-start gap-2">
                {inner}
                {canFind && (
                  <Search
                    size={12}
                    className="text-emerald-600 shrink-0 mt-1"
                    aria-hidden
                  />
                )}
              </div>
            </TappableRow>
          );
        })}
        {data.instructions && (
          <div className="pt-2 border-t border-emerald-200">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700/70 mb-1">
              Instructions
            </p>
            <p className="text-[11px] text-emerald-900/80 leading-relaxed">
              {data.instructions}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function TestsBubble({
  data,
  onTestTap,
}: {
  data: TestsData;
  onTestTap?: (test: TestItem, index: number) => void;
}) {
  return (
    <div className="w-[260px] sm:w-[300px] max-w-full rounded-xl border border-blue-200 bg-blue-50 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white">
        <FlaskConical size={14} />
        <span className="text-xs font-bold uppercase tracking-wider">
          Lab Tests Recommended
        </span>
      </div>
      <div className="p-3 space-y-2 max-h-72 overflow-y-auto">
        {data.tests.map((t, i) => {
          const canTap = !!onTestTap && !!t.name?.trim();
          return (
            <TappableRow
              key={i}
              onTap={canTap ? () => onTestTap!(t, i) : undefined}
              ariaLabel={canTap ? `Search labs for ${t.name}` : undefined}
              className="border-blue-100"
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">
                    {t.name}
                  </p>
                  {t.notes && (
                    <p className="text-[10px] text-slate-500 italic mt-0.5">
                      {t.notes}
                    </p>
                  )}
                </div>
                {canTap && (
                  <Search
                    size={12}
                    className="text-blue-600 shrink-0 mt-1"
                    aria-hidden
                  />
                )}
                <span
                  className={cn(
                    "text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full border shrink-0",
                    PRIORITY_STYLE[t.priority],
                  )}
                >
                  {t.priority}
                </span>
              </div>
            </TappableRow>
          );
        })}
        {data.instructions && (
          <div className="pt-2 border-t border-blue-200">
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700/70 mb-1">
              Instructions
            </p>
            <p className="text-[11px] text-blue-900/80 leading-relaxed">
              {data.instructions}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function NoteBubble({ data }: { data: NoteData }) {
  return (
    <div className="w-[260px] sm:w-[300px] max-w-full rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-amber-600 text-white">
        <FileText size={14} />
        <span className="text-xs font-bold uppercase tracking-wider flex-1">
          Clinical Note
        </span>
        <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-white/20">
          {CATEGORY_LABEL[data.category]}
        </span>
      </div>
      <div className="p-3">
        <p className="text-sm font-bold text-slate-900 mb-1">{data.title}</p>
        <p className="text-[12px] text-slate-700 leading-relaxed whitespace-pre-wrap break-words max-h-64 overflow-y-auto">
          {data.body}
        </p>
      </div>
    </div>
  );
}
