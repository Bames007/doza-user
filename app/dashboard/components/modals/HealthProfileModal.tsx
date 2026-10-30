"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import useSWR, { mutate } from "swr";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertCircle,
  Plus,
  Trash2,
  ShieldAlert,
  X,
  Loader2,
  Check,
  Pill,
  Apple,
  Leaf,
  Circle,
  HeartPulse,
  Droplets,
  Phone,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/app/utils/utils";
import { authFetcher, authPost } from "@/app/utils/client-auth";

// ─── Types (exported so the panel can reuse them) ────────────────────
export type Allergy = {
  id: string;
  name: string;
  type: "medication" | "food" | "environmental" | "other";
  severity: "mild" | "moderate" | "severe";
  reaction?: string | null;
  notes?: string | null;
  createdAt: string;
};

export type HealthProfile = {
  allergies: Allergy[];
  bloodType?: string | null;
  chronicConditions?: string[];
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  } | null;
};

// ─── Const / helpers ─────────────────────────────────────────────────
const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2";

const SWR_CONFIG = {
  revalidateOnFocus: false,
  dedupingInterval: 60_000,
  keepPreviousData: true,
} as const;

const allergySchema = z.object({
  name: z.string().min(1, "Allergy name is required"),
  type: z.enum(["medication", "food", "environmental", "other"]),
  severity: z.enum(["mild", "moderate", "severe"]),
  reaction: z.string().optional(),
  notes: z.string().optional(),
});
type AllergyForm = z.infer<typeof allergySchema>;

const TYPE_META: Record<
  AllergyForm["type"],
  { label: string; Icon: LucideIcon }
> = {
  medication: { label: "Medication", Icon: Pill },
  food: { label: "Food", Icon: Apple },
  environmental: { label: "Environmental", Icon: Leaf },
  other: { label: "Other", Icon: Circle },
};

const SEVERITY_META: Record<
  AllergyForm["severity"],
  { label: string; chip: string; dot: string }
> = {
  mild: {
    label: "Mild",
    chip: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  moderate: {
    label: "Moderate",
    chip: "bg-amber-50 text-amber-800 border-amber-200",
    dot: "bg-amber-500",
  },
  severe: {
    label: "Severe",
    chip: "bg-rose-50 text-rose-800 border-rose-200",
    dot: "bg-rose-500",
  },
};

async function authDelete(url: string): Promise<any> {
  const res = await fetch(url, {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    try {
      return await res.json();
    } catch {
      return { success: false };
    }
  }
  return res.json();
}

// ─── Inline form components ──────────────────────────────────────────
const FieldInput = ({ label, error, ...props }: any) => (
  <div className="space-y-1.5">
    {label && (
      <label className="block text-[11px] font-bold text-emerald-700/80 uppercase tracking-wider">
        {label}
      </label>
    )}
    <input
      {...props}
      className={cn(
        "w-full min-h-11 px-3 text-sm bg-emerald-50/40 border rounded-xl outline-none text-emerald-900 font-medium placeholder:text-emerald-700/40",
        error
          ? "border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
          : "border-emerald-100 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15",
      )}
    />
    {error && <p className="text-xs text-rose-700 font-semibold">{error}</p>}
  </div>
);

const FieldTextarea = ({ label, ...props }: any) => (
  <div className="space-y-1.5">
    {label && (
      <label className="block text-[11px] font-bold text-emerald-700/80 uppercase tracking-wider">
        {label}
      </label>
    )}
    <textarea
      {...props}
      className={cn(
        "w-full px-3 py-2 text-sm bg-emerald-50/40 border border-emerald-100 rounded-xl outline-none text-emerald-900 font-medium min-h-[72px] resize-y",
        "focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15",
      )}
    />
  </div>
);

// ─── Custom dropdown — same UI as MedicationPanel's SelectDropdown ──
const FieldSelect = ({
  label,
  value,
  onChange,
  options,
  placeholder = "Select...",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="space-y-1.5" ref={ref}>
      <label className="block text-[11px] font-bold text-emerald-700/80 uppercase tracking-wider">
        {label}
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={cn(
            "w-full min-h-11 flex items-center justify-between gap-2 text-left",
            "bg-emerald-50/40 border rounded-xl px-3 py-2",
            "text-sm font-semibold text-emerald-900 transition-colors",
            "border-emerald-100 hover:border-emerald-200",
            open && "bg-white border-emerald-500 ring-2 ring-emerald-500/15",
            "focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15",
          )}
        >
          <span
            className={cn(
              "truncate",
              !selected && "text-emerald-700/40 font-normal",
            )}
          >
            {selected?.label || placeholder}
          </span>
          <ChevronDown
            size={16}
            className={cn(
              "text-emerald-600 transition-transform shrink-0",
              open && "rotate-180",
            )}
          />
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              role="listbox"
              className="absolute top-full left-0 right-0 mt-2 bg-white border border-emerald-100 rounded-xl shadow-xl z-50 max-h-64 overflow-y-auto p-1.5 space-y-0.5 custom-emerald-scrollbar"
            >
              {options.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={cn(
                      "w-full min-h-10 flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-left transition-colors",
                      isSelected
                        ? "bg-emerald-50 text-emerald-900"
                        : "text-emerald-800 hover:bg-emerald-50/60",
                      FOCUS,
                    )}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && (
                      <Check
                        size={16}
                        className="text-emerald-700 shrink-0"
                        strokeWidth={3}
                      />
                    )}
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// ─── Main component ─────────────────────────────────────────────────
export default function HealthProfileModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const { data, isLoading } = useSWR(
    "/api/health-profile",
    authFetcher,
    SWR_CONFIG,
  );
  const profile: HealthProfile | null = data?.success ? data.data : null;

  const [showAddForm, setShowAddForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AllergyForm>({
    resolver: zodResolver(allergySchema),
    defaultValues: {
      name: "",
      type: "medication",
      severity: "moderate",
      reaction: "",
      notes: "",
    },
  });
  const watchType = watch("type");
  const watchSeverity = watch("severity");

  const addAllergy = async (formData: AllergyForm) => {
    setSaving(true);
    setFormError(null);
    try {
      const result = await authPost("/api/health-profile/allergies", {
        name: formData.name.trim(),
        type: formData.type,
        severity: formData.severity,
        reaction: formData.reaction?.trim() || null,
        notes: formData.notes?.trim() || null,
      });
      if (result.success) {
        await mutate("/api/health-profile");
        reset();
        setShowAddForm(false);
      } else {
        setFormError(result.error || "Could not save allergy");
      }
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const removeAllergy = async (allergyId: string) => {
    setDeletingId(allergyId);

    // Optimistic remove
    mutate(
      "/api/health-profile",
      (current: any) => {
        if (!current?.success) return current;
        return {
          ...current,
          data: {
            ...current.data,
            allergies: current.data.allergies.filter(
              (a: Allergy) => a.id !== allergyId,
            ),
          },
        };
      },
      false,
    );

    try {
      const result = await authDelete(
        `/api/health-profile/allergies/${allergyId}`,
      );
      if (result.success) {
        await mutate("/api/health-profile");
      } else {
        await mutate("/api/health-profile");
      }
    } catch {
      await mutate("/api/health-profile");
    } finally {
      setDeletingId(null);
    }
  };

  const allergies = profile?.allergies ?? [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-[100] sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "30%", scale: 0.98 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: "30%", scale: 0.98 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="bg-white rounded-t-3xl sm:rounded-2xl max-w-lg w-full max-h-[92dvh] sm:max-h-[90vh] flex flex-col shadow-2xl border border-emerald-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="health-profile-title"
      >
        <div
          className="sm:hidden flex justify-center pt-3 shrink-0"
          aria-hidden
        >
          <div className="w-10 h-1 rounded-full bg-emerald-200" />
        </div>

        {/* Header */}
        <div className="shrink-0 flex items-center justify-between gap-3 px-4 md:px-5 py-3 md:py-4 border-b border-emerald-100">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
            </div>
            <div className="min-w-0">
              <h2
                id="health-profile-title"
                className="text-base md:text-lg font-bold text-emerald-900 truncate"
              >
                Allergy Profile
              </h2>
              <p className="text-[11px] text-emerald-700/60">
                Allergies &amp; emergency info
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={cn(
              "shrink-0 min-h-10 min-w-10 inline-flex items-center justify-center rounded-xl text-emerald-600 hover:bg-emerald-50 transition-colors",
              FOCUS,
            )}
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain custom-emerald-scrollbar p-4 md:p-5 space-y-5">
          {/* Allergies section */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700/80">
                  Allergies
                </h3>
                {allergies.length > 0 && (
                  <span className="text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-100 px-1.5 py-0.5 rounded-md">
                    {allergies.length}
                  </span>
                )}
              </div>
              {!showAddForm && (
                <button
                  type="button"
                  onClick={() => setShowAddForm(true)}
                  className={cn(
                    "inline-flex items-center gap-1 min-h-9 px-3 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm",
                    FOCUS,
                  )}
                >
                  <Plus className="w-3.5 h-3.5" strokeWidth={3} />
                  Add
                </button>
              )}
            </div>

            {isLoading && allergies.length === 0 ? (
              <div className="flex items-center gap-2 py-6 text-sm text-emerald-700/60">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading…
              </div>
            ) : allergies.length === 0 && !showAddForm ? (
              <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/40 p-5 text-center">
                <ShieldAlert className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-emerald-900">
                  No allergies recorded
                </p>
                <p className="text-xs text-emerald-700/70 mt-1">
                  Adding them helps your care team avoid dangerous
                  prescriptions.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <AnimatePresence initial={false}>
                  {allergies.map((a) => {
                    const typeMeta = TYPE_META[a.type];
                    const sevMeta = SEVERITY_META[a.severity];
                    const TypeIcon = typeMeta.Icon;
                    return (
                      <motion.div
                        key={a.id}
                        layout
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="flex items-start gap-3 p-3 rounded-xl bg-white border border-emerald-100 shadow-xs"
                      >
                        <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                          <TypeIcon className="w-4 h-4 text-emerald-700" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="text-sm font-semibold text-emerald-900 truncate">
                              {a.name}
                            </p>
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md border",
                                sevMeta.chip,
                              )}
                            >
                              <span
                                className={cn(
                                  "w-1.5 h-1.5 rounded-full",
                                  sevMeta.dot,
                                )}
                              />
                              {sevMeta.label}
                            </span>
                          </div>
                          <p className="text-[11px] text-emerald-700/60">
                            {typeMeta.label}
                            {a.reaction ? ` · ${a.reaction}` : ""}
                          </p>
                          {a.notes && (
                            <p className="text-[11px] text-emerald-700/50 mt-0.5 italic">
                              {a.notes}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAllergy(a.id)}
                          disabled={deletingId === a.id}
                          aria-label={`Delete ${a.name}`}
                          className={cn(
                            "shrink-0 min-h-8 min-w-8 inline-flex items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-40",
                            FOCUS,
                          )}
                        >
                          {deletingId === a.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}

            {/* Add form */}
            <AnimatePresence>
              {showAddForm && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleSubmit(addAllergy)}
                  className="mt-3"
                  style={{ overflow: "visible" }}
                >
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 space-y-3">
                    <FieldInput
                      label="Name *"
                      placeholder="e.g. Penicillin, Peanuts"
                      error={errors.name?.message}
                      {...register("name")}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <FieldSelect
                        label="Type"
                        value={watchType}
                        onChange={(v) =>
                          setValue("type", v as AllergyForm["type"])
                        }
                        options={[
                          { value: "medication", label: "Medication" },
                          { value: "food", label: "Food" },
                          { value: "environmental", label: "Environmental" },
                          { value: "other", label: "Other" },
                        ]}
                      />
                      <FieldSelect
                        label="Severity"
                        value={watchSeverity}
                        onChange={(v) =>
                          setValue("severity", v as AllergyForm["severity"])
                        }
                        options={[
                          { value: "mild", label: "Mild" },
                          { value: "moderate", label: "Moderate" },
                          { value: "severe", label: "Severe" },
                        ]}
                      />
                    </div>
                    <FieldTextarea
                      label="Reaction (optional)"
                      placeholder="e.g. Hives, difficulty breathing"
                      {...register("reaction")}
                    />
                    <FieldInput
                      label="Notes (optional)"
                      placeholder="Any extra context"
                      {...register("notes")}
                    />

                    {formError && (
                      <div className="flex items-start gap-2 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-lg p-2">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>{formError}</span>
                      </div>
                    )}

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddForm(false);
                          reset();
                          setFormError(null);
                        }}
                        className={cn(
                          "flex-1 min-h-10 text-xs bg-white text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-50 font-semibold transition-colors",
                          FOCUS,
                        )}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className={cn(
                          "flex-[2] inline-flex items-center justify-center gap-1.5 min-h-10 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-semibold transition-colors shadow-sm",
                          FOCUS,
                        )}
                      >
                        {saving ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" strokeWidth={3} />
                        )}
                        Save allergy
                      </button>
                    </div>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </section>

          {/* Blood type + chronic conditions (read-only display for now) */}
          {(profile?.bloodType ||
            (profile?.chronicConditions &&
              profile.chronicConditions.length > 0)) && (
            <section className="pt-4 border-t border-emerald-100 space-y-2">
              {profile?.bloodType && (
                <div className="flex items-center gap-2 text-sm">
                  <Droplets className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="font-semibold text-emerald-900">
                    Blood type:
                  </span>
                  <span className="text-emerald-800">{profile.bloodType}</span>
                </div>
              )}
              {profile?.chronicConditions &&
                profile.chronicConditions.length > 0 && (
                  <div className="flex items-start gap-2 text-sm">
                    <HeartPulse className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-emerald-900">
                        Conditions:{" "}
                      </span>
                      <span className="text-emerald-800">
                        {profile.chronicConditions.join(", ")}
                      </span>
                    </div>
                  </div>
                )}
            </section>
          )}

          {/* Emergency contact */}
          {profile?.emergencyContact && (
            <section className="pt-4 border-t border-emerald-100">
              <div className="flex items-start gap-2 text-sm">
                <Phone className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="font-semibold text-emerald-900">
                    Emergency contact
                  </p>
                  <p className="text-xs text-emerald-700/80 mt-0.5">
                    {profile.emergencyContact.name} (
                    {profile.emergencyContact.relationship}) ·{" "}
                    <a
                      href={`tel:${profile.emergencyContact.phone}`}
                      className="text-emerald-700 underline underline-offset-2"
                    >
                      {profile.emergencyContact.phone}
                    </a>
                  </p>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-emerald-100 bg-white px-4 md:px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-4">
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "w-full min-h-11 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-colors shadow-sm",
              FOCUS,
            )}
          >
            Done
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
