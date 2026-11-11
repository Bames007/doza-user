// app/dashboard/components/chat/ClinicalBubbles.tsx
"use client";

import React from "react";
import { Pill, FlaskConical, FileText } from "lucide-react";
import { cn } from "@/app/utils/utils";
import type { PrescriptionData, TestsData, NoteData } from "./ClinicalPads";

const CATEGORY_LABEL: Record<NoteData["category"], string> = {
  general: "General",
  diagnosis: "Diagnosis",
  "follow-up": "Follow-up",
  advice: "Advice",
};

const PRIORITY_STYLE: Record<TestsData["tests"][number]["priority"], string> = {
  routine: "bg-blue-50 text-blue-700 border-blue-200",
  urgent: "bg-amber-50 text-amber-700 border-amber-200",
  stat: "bg-rose-50 text-rose-700 border-rose-200",
};

export function PrescriptionBubble({ data }: { data: PrescriptionData }) {
  return (
    <div className="w-[260px] sm:w-[300px] max-w-full rounded-xl border border-emerald-200 bg-emerald-50 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white">
        <Pill size={14} />
        <span className="text-xs font-bold uppercase tracking-wider">
          Prescription
        </span>
      </div>
      <div className="p-3 space-y-2 max-h-72 overflow-y-auto">
        {data.drugs.map((d, i) => (
          <div
            key={i}
            className="bg-white rounded-lg border border-emerald-100 p-2"
          >
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
        ))}
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

export function TestsBubble({ data }: { data: TestsData }) {
  return (
    <div className="w-[260px] sm:w-[300px] max-w-full rounded-xl border border-blue-200 bg-blue-50 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white">
        <FlaskConical size={14} />
        <span className="text-xs font-bold uppercase tracking-wider">
          Lab Tests Recommended
        </span>
      </div>
      <div className="p-3 space-y-2 max-h-72 overflow-y-auto">
        {data.tests.map((t, i) => (
          <div
            key={i}
            className="bg-white rounded-lg border border-blue-100 p-2 flex items-start gap-2"
          >
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
            <span
              className={cn(
                "text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full border shrink-0",
                PRIORITY_STYLE[t.priority],
              )}
            >
              {t.priority}
            </span>
          </div>
        ))}
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
