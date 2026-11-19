// app/dashboard/components/chat/AddDrugToCabinetModal.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  X,
  Pill,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Users,
  Clock,
} from "lucide-react";
import { mutate } from "swr";
import { authFetcher, authPost } from "@/app/utils/client-auth";
import { cn } from "@/app/utils/utils";
import type { PrescriptionDrug } from "../chat/ClinicalPads";

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2";

// ─── Parsing helpers ────────────────────────────────────
function parseFrequency(freqStr: string): {
  kind: "once" | "twice" | "thrice" | "custom";
  defaultTimes: string[];
} {
  const s = (freqStr || "").replace(/×/g, "x").trim().toLowerCase();

  // Detect explicit times ("08:00" or "08:00, 14:00, 20:00")
  const timeMatches = s.match(/(\d{1,2}:\d{2})/g);
  if (timeMatches && timeMatches.length > 0) {
    const normalized = timeMatches.map((t) => {
      const [h, m] = t.split(":");
      return `${h.padStart(2, "0")}:${m}`;
    });
    if (normalized.length === 1) {
      return { kind: "once", defaultTimes: normalized };
    }
    return { kind: "custom", defaultTimes: normalized };
  }

  if (/\b(twice|2x|2 x|two times|bid)\b/.test(s)) {
    return { kind: "twice", defaultTimes: ["08:00", "20:00"] };
  }
  if (/\b(thrice|3x|3 x|three times|tid)\b/.test(s)) {
    return { kind: "thrice", defaultTimes: ["08:00", "14:00", "20:00"] };
  }
  // Default to once
  return { kind: "once", defaultTimes: ["08:00"] };
}

function parseDurationDays(duration: string | undefined | null): number {
  if (!duration) return 7;
  const s = String(duration).replace(/×/g, "x").toLowerCase();
  const match = s.match(/(\d+(?:\.\d+)?)/);
  if (!match) return 7;
  const n = parseFloat(match[1]);
  if (s.includes("week")) return Math.round(n * 7);
  return Math.max(1, Math.round(n));
}

function todayLocalISO(): string {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().split("T")[0];
}

type Dose = {
  id: string;
  scheduledTime: string;
  takenAt?: string;
  skipped?: boolean;
  reaction?: string;
};

function generateDoses(
  startDate: string,
  times: string[],
  durationDays: number,
): { doses: Dose[]; endDate: string } {
  const [y, m, d] = startDate.split("-").map(Number);
  if (!y || !m || !d) {
    return { doses: [], endDate: startDate };
  }
  const start = new Date(y, m - 1, d);
  const doses: Dose[] = [];

  for (let day = 0; day < durationDays; day++) {
    for (const time of times) {
      const [h, min] = time.split(":").map(Number);
      const dt = new Date(start);
      dt.setDate(start.getDate() + day);
      dt.setHours(h, min, 0, 0);
      doses.push({
        id: `dose-${doses.length}-${dt.getTime()}`,
        scheduledTime: dt.toISOString(),
      });
    }
  }

  const endDate =
    doses.length > 0
      ? new Date(doses[doses.length - 1].scheduledTime)
          .toISOString()
          .split("T")[0]
      : startDate;

  return { doses, endDate };
}

// ─── Component ──────────────────────────────────────────
export default function AddDrugToCabinetModal({
  drug,
  onClose,
  onAdded,
}: {
  drug: PrescriptionDrug;
  onClose: () => void;
  onAdded?: () => void;
}) {
  const parsed = useMemo(
    () => parseFrequency(drug.frequency),
    [drug.frequency],
  );
  const durationDays = useMemo(
    () => parseDurationDays(drug.duration),
    [drug.duration],
  );

  const [startDate, setStartDate] = useState<string>(() => todayLocalISO());
  const [times, setTimes] = useState<string[]>(parsed.defaultTimes);
  const [assignedTo, setAssignedTo] = useState<string>("self");
  const [familyMembers, setFamilyMembers] = useState<
    { id: string; name: string; relationship: string }[]
  >([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch family members (fail silently — "self" is always available)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetcher("/api/family");
        if (!cancelled && res?.success && Array.isArray(res.data)) {
          setFamilyMembers(
            res.data.map((m: any) => ({
              id: m.id,
              name: m.name,
              relationship: m.relationship,
            })),
          );
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateTime = (idx: number, value: string) => {
    setTimes((prev) => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  };

  const addTimeSlot = () => {
    setTimes((prev) => [...prev, "12:00"]);
  };

  const removeTimeSlot = (idx: number) => {
    setTimes((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    setError(null);

    const cleanTimes = times
      .map((t) => t.trim())
      .filter((t) => /^\d{2}:\d{2}$/.test(t))
      .sort();

    if (cleanTimes.length === 0) {
      setError("Add at least one dose time");
      return;
    }
    if (!startDate) {
      setError("Pick a start date");
      return;
    }

    const qtyPerDose = 1;
    const intakesPerDay = cleanTimes.length;
    const totalQty = durationDays * qtyPerDose * intakesPerDay;
    const { doses, endDate } = generateDoses(
      startDate,
      cleanTimes,
      durationDays,
    );

    if (doses.length === 0) {
      setError("Could not generate doses — check the start date");
      return;
    }

    const payload = {
      name: drug.name.trim(),
      dosage: drug.dosage.trim(),
      quantityPerDose: qtyPerDose,
      totalQuantity: totalQty,
      durationDays,
      frequency:
        parsed.kind === "custom"
          ? "custom"
          : (parsed.kind as "once" | "twice" | "thrice"),
      times: cleanTimes,
      instructions: (drug.notes ?? "").trim() || null,
      startDate,
      endDate,
      assignedTo,
      status: "active",
      doses,
      prescriptionId: null,
      centerId: null,
      sourceType: null,
    };

    setSubmitting(true);
    try {
      const result = await authPost("/api/medications", payload);
      if (result?.success) {
        // Refresh every medication list so the new med appears regardless
        // of which family member page the user is currently on.
        mutate(
          (key) =>
            typeof key === "string" && key.startsWith("/api/medications"),
        );
        setSuccess(true);
        onAdded?.();
        setTimeout(() => onClose(), 1400);
      } else {
        setError(result?.error || "Could not save medication");
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[430] bg-slate-950/60 backdrop-blur-sm flex items-stretch sm:items-center justify-center sm:p-4"
      onClick={() => !submitting && !success && onClose()}
    >
      <motion.div
        initial={{ y: "6%", scale: 0.99, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: "6%", scale: 0.99, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
        className="bg-white w-full sm:max-w-lg sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col h-full sm:h-auto sm:max-h-[90vh] border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b bg-emerald-50 border-emerald-100">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center shrink-0">
              <Pill size={16} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-emerald-900 truncate">
                Add to My Medications
              </p>
              <p className="text-[10px] text-emerald-700/70 truncate">
                Schedule your doses
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => !submitting && !success && onClose()}
            disabled={submitting || success}
            aria-label="Close"
            className={cn(
              "min-h-9 min-w-9 inline-flex items-center justify-center rounded-lg text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 shrink-0",
              FOCUS,
            )}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Drug info (read-only) */}
          <div className="bg-emerald-50/40 border border-emerald-100 rounded-xl p-3 space-y-1">
            <p className="text-sm font-bold text-slate-900">{drug.name}</p>
            <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-slate-600">
              {drug.dosage && (
                <span className="font-semibold text-emerald-700">
                  {drug.dosage}
                </span>
              )}
              {drug.frequency && <span>· {drug.frequency}</span>}
              {drug.duration && <span>· {drug.duration}</span>}
            </div>
            {drug.notes && (
              <p className="text-[10px] text-slate-500 italic mt-1">
                {drug.notes}
              </p>
            )}
          </div>

          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-1.5">
              <AlertCircle size={12} className="shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {success ? (
            <div className="py-8 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-600 flex items-center justify-center mb-3">
                <CheckCircle2
                  size={24}
                  className="text-white"
                  strokeWidth={3}
                />
              </div>
              <p className="text-sm font-bold text-emerald-900">
                Added to your cabinet
              </p>
              <p className="text-xs text-slate-500 mt-1">
                You can view and adjust it in Medications.
              </p>
            </div>
          ) : (
            <>
              {/* Start date */}
              <div>
                <label className="flex items-center gap-1 block text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-1.5">
                  <Calendar size={11} /> Start date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={submitting}
                  className="w-full min-h-11 px-3 bg-emerald-50/40 border border-emerald-100 rounded-xl text-sm text-emerald-900 font-medium focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 disabled:opacity-50"
                />
              </div>

              {/* Dose times */}
              <div>
                <label className="flex items-center gap-1 block text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-1.5">
                  <Clock size={11} /> Dose times ({times.length}/day)
                </label>
                <div className="space-y-2">
                  {times.map((t, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="time"
                        value={t}
                        onChange={(e) => updateTime(i, e.target.value)}
                        disabled={submitting}
                        className="flex-1 min-h-11 px-3 bg-emerald-50/40 border border-emerald-100 rounded-xl text-sm text-emerald-900 font-medium focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 disabled:opacity-50"
                      />
                      {times.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTimeSlot(i)}
                          disabled={submitting}
                          aria-label="Remove time"
                          className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 disabled:opacity-50"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {times.length < 6 && (
                  <button
                    type="button"
                    onClick={addTimeSlot}
                    disabled={submitting}
                    className="mt-2 w-full py-2 rounded-xl border-2 border-dashed border-emerald-300 text-emerald-700 text-xs font-bold hover:bg-emerald-50 disabled:opacity-50"
                  >
                    + Add another time
                  </button>
                )}
                <p className="text-[10px] text-slate-500 mt-1.5">
                  Over {durationDays} day{durationDays === 1 ? "" : "s"} ={" "}
                  {durationDays * times.length} total doses.
                </p>
              </div>

              {/* Assigned to */}
              {familyMembers.length > 0 && (
                <div>
                  <label className="flex items-center gap-1 block text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-1.5">
                    <Users size={11} /> Who is this for?
                  </label>
                  <select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    disabled={submitting}
                    className="w-full min-h-11 px-3 bg-emerald-50/40 border border-emerald-100 rounded-xl text-sm text-emerald-900 font-medium focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 disabled:opacity-50"
                  >
                    <option value="self">Myself</option>
                    {familyMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.relationship})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div className="shrink-0 flex items-center justify-end gap-2 px-4 py-3 border-t border-slate-100 bg-white pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || times.length === 0 || !startDate}
              className={cn(
                "inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 transition-colors",
                FOCUS,
              )}
            >
              {submitting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <CheckCircle2 size={14} />
              )}
              {submitting ? "Adding…" : "Add to Cabinet"}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
