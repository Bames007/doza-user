import { useEffect } from "react";
import { z } from "zod";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2, Calendar, Shield, Mail, Layers } from "lucide-react";
import { cn } from "@/app/utils/utils";
import { bebasNeue } from "@/app/constants";
import { challengeSchema } from "@/app/types/schemas";
import { activityOptions } from "@/app/types/challengeConstant";

type FormValues = z.infer<typeof challengeSchema>;

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

  // Sync unit label when activity selection changes
  useEffect(() => {
    const activeOption = activityOptions.find((a) => a.value === watchActivity);
    if (activeOption) {
      // Fallback or map custom units based on chosen activity property safely
      setValue("targetUnit", (activeOption as any).unit || "pts");
    }
  }, [watchActivity, setValue]);

  const handleFormSubmit = async (data: FormValues) => {
    const success = await onSubmit(data);
    if (success) onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: 16 }}
        transition={{ type: "spring", damping: 25, stiffness: 350 }}
        className="bg-white rounded-[28px] max-w-xl w-full max-h-[92vh] flex flex-col shadow-[0_24px_60px_-15px_rgba(15,23,42,0.12)] border border-slate-200/60 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header Actions */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white/50 backdrop-blur-sm sticky top-0 z-10">
          <div>
            <h2
              className={cn(
                "text-2xl font-bold text-slate-800 tracking-wide",
                bebasNeue.className,
              )}
            >
              Forge New Challenge
            </h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
              Set the rules, invite members, unlock rank
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors border border-slate-100 shadow-3xs"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar"
        >
          <InputField
            label="Challenge Arena Title"
            error={errors.name?.message}
          >
            <input
              {...register("name")}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none font-semibold text-slate-800 placeholder:text-slate-400"
              placeholder="e.g., Crimson Peak Ultramarathon"
            />
          </InputField>

          <InputField
            label="Campaign Directive & Rules"
            error={errors.description?.message}
          >
            <textarea
              {...register("description")}
              rows={3}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none font-medium text-slate-800 placeholder:text-slate-400 resize-none"
              placeholder="Detail the metrics, completion conditions, and baseline milestones..."
            />
          </InputField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField
              label="Discipline Matrix"
              error={errors.activity?.message}
            >
              <div className="relative flex items-center">
                <Layers className="w-4 h-4 absolute left-3.5 text-slate-400 pointer-events-none" />
                <select
                  {...register("activity")}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none font-semibold text-slate-700 appearance-none"
                >
                  <option value="">Select Activity</option>
                  {activityOptions.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>
            </InputField>

            <InputField
              label="Performance Target"
              error={errors.targetValue?.message}
            >
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.1"
                  {...register("targetValue", { valueAsNumber: true })}
                  className="flex-1 px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none font-bold text-slate-800"
                  placeholder="0.0"
                />
                <input
                  {...register("targetUnit")}
                  className="w-20 px-2 py-2.5 text-center text-xs border border-slate-200 rounded-xl bg-slate-100 font-bold text-slate-500 uppercase tracking-wider select-none outline-none"
                  readOnly
                />
              </div>
            </InputField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField
              label="Deployment Window"
              error={errors.startDate?.message}
            >
              <div className="relative flex items-center">
                <Calendar className="w-4 h-4 absolute left-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="date"
                  {...register("startDate")}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 transition-all outline-none font-semibold text-slate-700"
                />
              </div>
            </InputField>

            <InputField
              label="Expiration Window"
              error={errors.endDate?.message}
            >
              <div className="relative flex items-center">
                <Calendar className="w-4 h-4 absolute left-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="date"
                  {...register("endDate")}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 transition-all outline-none font-semibold text-slate-700"
                />
              </div>
            </InputField>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200/60 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg border border-slate-200/40 shadow-3xs text-slate-500">
                <Shield className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-700 leading-none">
                  Visibility Status
                </span>
                <span className="text-[10px] text-slate-400 font-medium mt-0.5">
                  Public challenges populate global feeds
                </span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                {...register("isPublic")}
                className="sr-only peer"
              />
              <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500" />
            </label>
          </div>

          <InputField
            label="Direct Operative Transmissions"
            error={errors.invitedEmails?.message}
          >
            <div className="relative flex items-center">
              <Mail className="w-4 h-4 absolute left-3.5 text-slate-400 pointer-events-none" />
              <input
                {...register("invitedEmails")}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none font-medium text-slate-800 placeholder:text-slate-400"
                placeholder="allies@network.io, rival@domain.com"
              />
            </div>
          </InputField>
        </form>

        {/* Sticky Footer Area */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-700 rounded-xl hover:bg-slate-200/50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit(handleFormSubmit)}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md shadow-emerald-600/10 transition-all disabled:opacity-50 active:scale-98"
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              "Deploy Challenge"
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
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
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-0.5">
        {label}
      </label>
      {children}
      {error && (
        <p className="text-rose-500 text-[11px] font-semibold mt-1.5 flex items-center gap-1 ml-0.5 animate-headShake">
          <span className="w-1 h-1 bg-rose-500 rounded-full" />
          {error}
        </p>
      )}
    </div>
  );
}
