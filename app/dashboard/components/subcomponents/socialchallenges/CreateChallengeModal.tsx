// app/dashboard/components/subcomponents/socialchallenges/CreateChallengeModal.tsx
import { useEffect, useState, useRef } from "react";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  X,
  Loader2,
  Calendar,
  Globe,
  Mail,
  Layers,
  ChevronDown,
  Check,
  Footprints,
  Bike,
  Dumbbell,
  Waves,
  Trophy,
  Target,
  MedalIcon,
} from "lucide-react";
import { cn } from "@/app/utils/utils";
import { bebasNeue } from "@/app/constants";
import { challengeSchema } from "@/app/types/schemas";
import { activityOptions } from "@/app/types/challengeConstant";
import { getChallengeImage } from "./challengeImages";

type FormValues = z.infer<typeof challengeSchema>;

const getActivityIcon = (value: string) => {
  const props = {
    className:
      "w-4 h-4 text-emerald-500 transition-transform group-hover:scale-110",
  };
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
      return <MedalIcon {...props} />;
  }
};

export function CreateChallengeModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (data: FormValues) => Promise<boolean>;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(challengeSchema) as any,
    defaultValues: {
      isPublic: true,
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
      targetValue: 0,
      activity: "",
      description: "",
      name: "",
      imageUrl: "",
      targetUnit: "",
      invitedEmails: "",
    },
  });

  const watchActivity = watch("activity");
  const watchName = watch("name");
  const watchDescription = watch("description");
  const watchImageUrl = watch("imageUrl");

  useEffect(() => {
    const activeOption = activityOptions.find((a) => a.value === watchActivity);
    if (activeOption) {
      setValue("targetUnit", (activeOption as any).unit || "pts");
    }
  }, [watchActivity, setValue]);

  const handleFormSubmit = async (data: FormValues) => {
    const success = await onSubmit(data);
    if (success) onClose();
  };

  const previewImage = getChallengeImage({
    imageUrl: watchImageUrl,
    activity: watchActivity,
  });

  const activityLabel =
    activityOptions.find((a) => a.value === watchActivity)?.label ||
    "Your Challenge";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-end sm:items-center justify-center z-50 sm:p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "10%", scale: 0.98, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: "10%", scale: 0.98, opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        className="bg-white rounded-t-[28px] sm:rounded-[32px] max-w-xl w-full max-h-[94dvh] sm:max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
        <div
          className="sm:hidden flex justify-center pt-3 shrink-0"
          aria-hidden
        >
          <div className="w-10 h-1 rounded-full bg-slate-300" />
        </div>

        {/* ─── SCROLLABLE BODY ─────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* Live banner preview */}
          <div className="relative aspect-[16/9] overflow-hidden bg-slate-900">
            <img
              src={previewImage}
              alt="Preview"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

            {/* Close on top of banner */}
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/95 backdrop-blur-md shadow-lg flex items-center justify-center text-slate-700 hover:bg-white active:scale-95 transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Top-left banner chip */}
            <div className="absolute top-3 left-3">
              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-white px-2.5 py-1 rounded-full shadow-md backdrop-blur-md inline-flex items-center gap-1">
                <Trophy className="w-3 h-3" /> New Challenge
              </span>
            </div>

            {/* Title overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5 space-y-1">
              <h2
                className={cn(
                  "text-2xl sm:text-3xl text-white tracking-tight leading-tight line-clamp-1",
                  bebasNeue.className,
                )}
              >
                {watchName || "Name your challenge…"}
              </h2>
              <p className="text-[11px] sm:text-xs text-white/80 font-medium line-clamp-1">
                {watchDescription || activityLabel}
              </p>
            </div>
          </div>

          {/* Form */}
          <form
            id="create-challenge-form"
            onSubmit={handleSubmit(handleFormSubmit)}
            className="p-4 sm:p-7 space-y-4 sm:space-y-5"
          >
            <InputField label="Challenge Name" error={errors.name?.message}>
              <input
                {...register("name")}
                className="w-full px-4 py-3 text-base sm:text-sm bg-slate-50/80 border border-slate-200/80 rounded-2xl focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none font-semibold text-slate-900 placeholder:text-slate-400 shadow-2xs"
                placeholder="e.g., 7-Day Morning Run Challenge"
              />
            </InputField>

            <InputField
              label="Description & Rules"
              error={errors.description?.message}
            >
              <textarea
                {...register("description")}
                rows={3}
                className="w-full px-4 py-3 text-base sm:text-sm bg-slate-50/80 border border-slate-200/80 rounded-2xl focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none font-medium text-slate-900 placeholder:text-slate-400 resize-none shadow-2xs"
                placeholder="What's this challenge about and what are the rules?"
              />
            </InputField>

            {/* Activity */}
            <InputField label="Activity Type" error={errors.activity?.message}>
              <CustomDropdownSelect
                value={watchActivity}
                onChange={(val: string) =>
                  setValue("activity", val, { shouldValidate: true })
                }
                options={[
                  { value: "", label: "Select Activity" },
                  ...activityOptions.map((a) => ({
                    value: a.value,
                    label: a.label,
                  })),
                ]}
                icon={<Layers className="w-4 h-4 text-emerald-500" />}
              />
            </InputField>

            {/* Target */}
            <InputField label="Target Goal" error={errors.targetValue?.message}>
              <div className="flex gap-2.5">
                <div className="relative flex-1 flex items-center">
                  <Target className="w-4 h-4 absolute left-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="number"
                    step="0.1"
                    {...register("targetValue", { valueAsNumber: true })}
                    className="w-full pl-10 pr-4 py-3 text-base sm:text-sm bg-slate-50/80 border border-slate-200/80 rounded-2xl focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none font-bold text-slate-900 shadow-2xs"
                    placeholder="0.0"
                  />
                </div>
                <input
                  {...register("targetUnit")}
                  className="w-20 px-2 py-3 text-center text-xs border border-slate-200/80 rounded-2xl bg-slate-100/70 font-bold text-slate-500 uppercase tracking-wider select-none outline-none shadow-2xs"
                  readOnly
                />
              </div>
            </InputField>

            {/* Dates — stacked on mobile, side-by-side on sm+ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField label="Start Date" error={errors.startDate?.message}>
                <div className="relative flex items-center">
                  <Calendar className="w-4 h-4 absolute left-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="date"
                    {...register("startDate")}
                    className="w-full pl-10 pr-4 py-3 text-base sm:text-sm bg-slate-50/80 border border-slate-200/80 rounded-2xl focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none font-semibold text-slate-700 shadow-2xs"
                  />
                </div>
              </InputField>
              <InputField label="End Date" error={errors.endDate?.message}>
                <div className="relative flex items-center">
                  <Calendar className="w-4 h-4 absolute left-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="date"
                    {...register("endDate")}
                    className="w-full pl-10 pr-4 py-3 text-base sm:text-sm bg-slate-50/80 border border-slate-200/80 rounded-2xl focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none font-semibold text-slate-700 shadow-2xs"
                  />
                </div>
              </InputField>
            </div>

            {/* Custom cover image */}
            <InputField
              label="Custom Cover Image (optional)"
              error={errors.imageUrl?.message}
            >
              <input
                {...register("imageUrl")}
                className="w-full px-4 py-3 text-base sm:text-sm bg-slate-50/80 border border-slate-200/80 rounded-2xl focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none font-medium text-slate-900 placeholder:text-slate-400 shadow-2xs"
                placeholder="https://… (leave blank to auto-use activity image)"
              />
            </InputField>

            {/* Public toggle */}
            <div className="p-4 bg-slate-50/80 border border-slate-200/60 rounded-2xl flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 bg-white rounded-xl border border-slate-200/60 shadow-xs flex items-center justify-center text-slate-500 shrink-0">
                  <Globe className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-slate-800 leading-tight">
                    Public Challenge
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium mt-0.5">
                    Anyone on Doza can discover and join
                  </span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                <input
                  type="checkbox"
                  {...register("isPublic")}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 shadow-inner" />
              </label>
            </div>

            <InputField
              label="Invite Friends by Email"
              error={errors.invitedEmails?.message}
            >
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 absolute left-3.5 text-slate-400 pointer-events-none" />
                <input
                  {...register("invitedEmails")}
                  className="w-full pl-10 pr-4 py-3 text-base sm:text-sm bg-slate-50/80 border border-slate-200/80 rounded-2xl focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none font-medium text-slate-900 placeholder:text-slate-400 shadow-2xs"
                  placeholder="friend1@email.com, friend2@email.com"
                />
              </div>
            </InputField>
          </form>
        </div>

        {/* ─── STICKY FOOTER ────────────────────────────────────── */}
        <div className="shrink-0 px-4 sm:px-7 py-3 sm:py-4 bg-white/95 backdrop-blur-md border-t border-slate-100 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-4">
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 min-h-12 text-xs font-black uppercase tracking-wider text-slate-500 hover:text-slate-800 rounded-2xl bg-slate-100 hover:bg-slate-200/60 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="create-challenge-form"
              disabled={isSubmitting}
              className="flex-[2] flex items-center justify-center gap-2 min-h-12 px-6 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50 active:scale-[0.98]"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Create Challenge"
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Dropdown ─────────────────────────────────────────────── */
function CustomDropdownSelect({ value, onChange, options, icon }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o: any) => o.value === value);
  const displayLabel = selectedOption?.label || "Select Activity";
  const displayIcon = value ? getActivityIcon(value) : icon;

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
    <div className="relative w-full" ref={dropdownRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative flex items-center gap-3 px-3.5 py-3 bg-slate-50/80 border rounded-2xl transition-all duration-300 cursor-pointer shadow-2xs group",
          isOpen
            ? "bg-white border-emerald-500 ring-4 ring-emerald-500/10 shadow-md"
            : "border-slate-200/80 hover:bg-white hover:border-slate-300",
        )}
      >
        <div className="w-8 h-8 bg-white rounded-xl border border-slate-200/60 shadow-xs flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:border-emerald-500/30 transition-all">
          {displayIcon}
        </div>
        <span className="flex-1 text-sm font-semibold text-slate-900 truncate">
          {displayLabel}
        </span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-transform duration-300 shrink-0",
            isOpen && "rotate-180 text-emerald-600",
          )}
        />
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 4, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute left-0 right-0 top-full mt-2 bg-white/95 backdrop-blur-2xl border border-slate-200/80 rounded-2xl shadow-2xl p-2 z-50 max-h-56 overflow-y-auto"
          >
            <div className="space-y-1">
              {options.map((opt: any) => {
                const isSelected = opt.value === value;
                const optIcon = opt.value ? getActivityIcon(opt.value) : icon;
                return (
                  <div
                    key={opt.value}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all duration-200",
                      isSelected
                        ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20"
                        : "text-slate-700 hover:bg-emerald-50 hover:text-emerald-900",
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={cn(
                          "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                          isSelected
                            ? "bg-white/20 text-white"
                            : "bg-emerald-100/60 text-emerald-700",
                        )}
                      >
                        {optIcon}
                      </div>
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

function InputField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col w-full">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
        {label}
      </label>
      {children}
      {error && (
        <p className="text-rose-500 text-[11px] font-semibold mt-1.5 flex items-center gap-1.5 ml-1">
          <span className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
          {error}
        </p>
      )}
    </div>
  );
}
