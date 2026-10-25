// app/dashboard/components/panels/ProfilePanel.tsx
"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useProfile } from "../../hooks/useUserData";
import {
  Plus,
  Trash2,
  Loader2,
  Phone,
  User,
  ShieldCheck,
  Dna,
  Save,
  HeartPulse,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/app/utils/utils";
import { authPut } from "@/app/utils/client-auth";
import { poppins } from "@/app/constants";

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2";

// Avatar Assets
const AVATARS = [
  {
    id: "avatar_adult_transparent",
    src: "/assets/avatars/avatar_adult_transparent.png",
  },
  { id: "avatar_adult", src: "/assets/avatars/avatar_adult.jpg" },
  { id: "avatar_elderly", src: "/assets/avatars/avatar_elderly.jpg" },
  { id: "avatar_kid", src: "/assets/avatars/avatar_kid.jpg" },
  { id: "avatar_lady", src: "/assets/avatars/avatar_lady.jpg" },
  { id: "avatar_female_one", src: "/assets/avatars/avatar-female-one.jpg" },
  { id: "avatar_user1", src: "/assets/avatars/avatar-user1.png" },
  { id: "avatar_default", src: "/assets/avatars/avatar.jpg" },
];

const emergencyContactSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Required"),
  phone: z.string().min(1, "Required"),
  relationship: z.string().min(1, "Required"),
});

const profileSchema = z.object({
  displayName: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(["male", "female", "other", "prefer-not-to-say"]).optional(),
  bloodGroup: z.string().optional(),
  height: z.number().positive().optional(),
  weight: z.number().positive().optional(),
  avatarId: z.string().optional(),
  emergencyContacts: z.array(emergencyContactSchema),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePanel() {
  const { profile, isLoading, mutateProfile } = useProfile();
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      gender: "prefer-not-to-say",
      avatarId: AVATARS[0].id,
      emergencyContacts: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "emergencyContacts",
  });

  const watchedAvatar = watch("avatarId");

  useEffect(() => {
    if (profile) {
      reset({
        ...profile,
        avatarId: profile.avatarId || AVATARS[0].id,
        gender: profile.gender || "prefer-not-to-say",
      } as any);
    }
  }, [profile, reset]);

  const onSubmit = async (data: ProfileFormValues) => {
    setIsSaving(true);
    try {
      const result = await authPut("/api/user/profile", data);
      if (result.success) {
        mutateProfile();
        reset(data);
      }
    } catch {
      alert("Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  /* ─── Skeleton ─────────────────────────────────────────── */
  if (isLoading)
    return (
      <div
        className={cn(
          "min-h-screen bg-[#F8FAFC] pb-28 pt-2 animate-pulse",
          poppins.className,
        )}
      >
        <div className="max-w-5xl mx-auto px-4 pt-3 sm:px-6 lg:px-8 space-y-4 lg:space-y-5">
          <div className="space-y-2">
            <div className="h-9 w-56 rounded-lg bg-emerald-100" />
            <div className="h-3.5 w-72 rounded-lg bg-emerald-100/70" />
          </div>
          <div className="h-40 rounded-2xl bg-emerald-100/50" />
          <div className="h-64 rounded-2xl bg-emerald-100/50" />
          <div className="h-56 rounded-2xl bg-emerald-100/50" />
        </div>
      </div>
    );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "min-h-screen bg-[#F8FAFC] pb-32 pt-2 text-slate-900",
        poppins.className,
      )}
    >
      <main className="mx-auto max-w-5xl px-4 pt-3 sm:px-6 lg:px-8 space-y-4 lg:space-y-5">
        {/* ─── HEADER ──────────────────────────────────────── */}
        <header className="pt-1 lg:pt-2 flex flex-col gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight leading-tight">
              Profile &amp; Information
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-lg">
              Update your personal details, physical metrics, and emergency
              contacts.
            </p>
          </div>
        </header>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 lg:space-y-5"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5">
            {/* ─── LEFT COLUMN ─────────────────────────────── */}
            <div className="lg:col-span-8 space-y-4 lg:space-y-5">
              {/* Avatar Picker */}
              <section className="bg-white rounded-2xl p-5 sm:p-6 border border-emerald-100 shadow-xs">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                    <User className="text-emerald-600" size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 leading-tight">
                      Profile Picture
                    </h3>
                    <p className="text-[11px] text-emerald-700/60 font-medium">
                      Choose an avatar for your account
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 sm:gap-2.5">
                  {AVATARS.map((avatar) => (
                    <motion.button
                      key={avatar.id}
                      type="button"
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() =>
                        reset({ ...watch(), avatarId: avatar.id } as any)
                      }
                      className={cn(
                        "aspect-square rounded-xl overflow-hidden border-2 transition-all relative",
                        watchedAvatar === avatar.id
                          ? "border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm"
                          : "border-emerald-100 opacity-70 hover:opacity-100 hover:border-emerald-200",
                        FOCUS,
                      )}
                    >
                      <img
                        src={avatar.src}
                        className="w-full h-full object-cover"
                        alt="avatar"
                      />
                    </motion.button>
                  ))}
                </div>
              </section>

              {/* Personal Details */}
              <section className="bg-white rounded-2xl p-5 sm:p-6 border border-emerald-100 shadow-xs space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                    <ShieldCheck className="text-emerald-600" size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 leading-tight">
                      Personal Details
                    </h3>
                    <p className="text-[11px] text-emerald-700/60 font-medium">
                      Your primary identification information
                    </p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <InputGroup
                    label="Full Name"
                    error={errors.displayName?.message}
                  >
                    <User size={18} className="text-emerald-600 shrink-0" />
                    <input
                      {...register("displayName")}
                      placeholder="Enter your name"
                      className="bg-transparent outline-none w-full text-base sm:text-sm font-medium text-emerald-900 placeholder:text-emerald-700/30"
                    />
                  </InputGroup>
                  <InputGroup label="Phone Number">
                    <Phone size={18} className="text-emerald-600 shrink-0" />
                    <input
                      {...register("phone")}
                      placeholder="Enter phone number"
                      className="bg-transparent outline-none w-full text-base sm:text-sm font-medium text-emerald-900 placeholder:text-emerald-700/30"
                    />
                  </InputGroup>
                </div>

                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block mb-0.5">
                      Email Address
                    </label>
                    <span className="text-sm sm:text-base font-bold text-emerald-900 truncate block">
                      {profile?.email}
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-white border border-emerald-100 flex items-center justify-center shrink-0">
                    <ShieldCheck className="text-emerald-600 w-5 h-5" />
                  </div>
                </div>
              </section>
            </div>

            {/* ─── RIGHT COLUMN ────────────────────────────── */}
            <div className="lg:col-span-4">
              <section className="bg-white rounded-2xl p-5 sm:p-6 border border-emerald-100 shadow-xs space-y-5 lg:sticky lg:top-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 leading-tight">
                      Health Metrics
                    </h3>
                    <p className="text-[11px] text-emerald-700/60 font-medium">
                      Physical attributes
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0">
                    <Dna size={18} className="text-emerald-600" />
                  </div>
                </div>

                <div className="space-y-3">
                  <MetricInput label="Blood Group">
                    <HeartPulse className="w-4 h-4 text-emerald-600 shrink-0" />
                    <input
                      {...register("bloodGroup")}
                      placeholder="e.g. O+"
                      className="bg-transparent outline-none w-full text-base sm:text-sm text-emerald-900 font-bold text-center placeholder:text-emerald-700/30"
                    />
                  </MetricInput>

                  <MetricInput label="Gender">
                    <select
                      {...register("gender")}
                      className="bg-transparent outline-none w-full text-base sm:text-sm font-bold text-emerald-900 cursor-pointer appearance-none text-center"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="prefer-not-to-say">
                        Prefer not to say
                      </option>
                    </select>
                  </MetricInput>

                  <div className="grid grid-cols-2 gap-3">
                    <MetricInput label="Height (cm)">
                      <input
                        type="number"
                        {...register("height", { valueAsNumber: true })}
                        placeholder="175"
                        className="bg-transparent outline-none w-full font-bold text-base sm:text-sm text-center text-emerald-900 placeholder:text-emerald-700/30"
                      />
                    </MetricInput>
                    <MetricInput label="Weight (kg)">
                      <input
                        type="number"
                        {...register("weight", { valueAsNumber: true })}
                        placeholder="70"
                        className="bg-transparent outline-none w-full font-bold text-base sm:text-sm text-center text-emerald-900 placeholder:text-emerald-700/30"
                      />
                    </MetricInput>
                  </div>
                </div>

                <p className="text-[11px] text-emerald-700/60 font-medium leading-relaxed pt-3 border-t border-emerald-100">
                  Your health information is kept private and secure.
                </p>
              </section>
            </div>
          </div>

          {/* ─── EMERGENCY CONTACTS ────────────────────────── */}
          <section className="bg-emerald-50/60 rounded-2xl p-5 sm:p-6 border border-emerald-100 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
              <div className="min-w-0">
                <h3 className="text-base font-bold text-emerald-900 leading-tight">
                  Emergency Contacts
                </h3>
                <p className="text-[11px] text-emerald-700/70 font-medium mt-0.5">
                  People to reach out to in case of an emergency
                </p>
              </div>
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() =>
                  append({
                    id: Date.now().toString(),
                    name: "",
                    phone: "",
                    relationship: "",
                  })
                }
                className={cn(
                  "inline-flex items-center justify-center gap-1.5 bg-emerald-600 text-white px-4 min-h-10 rounded-xl font-bold text-xs shadow-sm shadow-emerald-600/20 hover:bg-emerald-700 transition-all shrink-0",
                  FOCUS,
                )}
              >
                <Plus size={14} /> Add Contact
              </motion.button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              <AnimatePresence>
                {fields.map((field, index) => (
                  <motion.div
                    key={field.id}
                    initial={{ opacity: 0, y: 12, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    className="bg-white p-4 rounded-xl border border-emerald-100 shadow-xs relative group transition-shadow hover:shadow-sm"
                  >
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      aria-label="Remove contact"
                      className={cn(
                        "absolute top-3 right-3 w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-emerald-600 hover:text-white",
                        FOCUS,
                      )}
                    >
                      <Trash2 size={14} />
                    </button>

                    <div className="space-y-3 pt-0.5">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-emerald-700/70 uppercase tracking-wider ml-0.5">
                          Contact Name
                        </label>
                        <input
                          {...register(`emergencyContacts.${index}.name`)}
                          placeholder="Full Name"
                          className="w-full bg-emerald-50/40 border border-emerald-100 px-3 py-2.5 rounded-lg text-base sm:text-sm font-medium text-emerald-900 outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 transition-all placeholder:text-emerald-700/30"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-emerald-700/70 uppercase tracking-wider ml-0.5">
                            Phone
                          </label>
                          <input
                            {...register(`emergencyContacts.${index}.phone`)}
                            placeholder="Mobile"
                            className="w-full bg-emerald-50/40 border border-emerald-100 px-3 py-2.5 rounded-lg text-base sm:text-sm font-medium text-emerald-900 outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 transition-all placeholder:text-emerald-700/30"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-emerald-700/70 uppercase tracking-wider ml-0.5">
                            Relation
                          </label>
                          <input
                            {...register(
                              `emergencyContacts.${index}.relationship`,
                            )}
                            placeholder="Spouse"
                            className="w-full bg-emerald-50/40 border border-emerald-100 px-3 py-2.5 rounded-lg text-base sm:text-sm font-medium text-emerald-900 outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 transition-all placeholder:text-emerald-700/30"
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {fields.length === 0 && (
              <div className="text-center py-8 border-2 border-dashed border-emerald-200 rounded-xl bg-white/60">
                <p className="text-emerald-700/70 font-medium text-xs px-4">
                  No emergency contacts yet. Tap{" "}
                  <span className="font-bold text-emerald-700">
                    Add Contact
                  </span>{" "}
                  to include one.
                </p>
              </div>
            )}
          </section>
        </form>
      </main>

      {/* ─── FLOATING SAVE BAR ──────────────────────────── */}
      <div className="fixed bottom-24 sm:bottom-8 left-0 right-0 px-4 flex justify-center z-50 pointer-events-none">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="pointer-events-auto w-full max-w-sm p-2 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-emerald-100"
        >
          <button
            type="submit"
            form=""
            disabled={!isDirty || isSaving}
            onClick={handleSubmit(onSubmit)}
            className={cn(
              "w-full h-12 bg-emerald-600 text-white rounded-xl shadow-sm shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-bold text-xs uppercase tracking-wider hover:bg-emerald-700 active:scale-[0.98]",
              FOCUS,
            )}
          >
            {isSaving ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <Save size={16} />
            )}
            <span>{isSaving ? "Saving…" : "Save Changes"}</span>
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}

/* ─── Input wrapper ─────────────────────────────────────── */
function InputGroup({
  label,
  children,
  error,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider ml-0.5 block">
        {label}
      </label>
      <div
        className={cn(
          "h-12 px-4 rounded-xl border flex items-center gap-3 transition-all duration-200",
          error
            ? "border-rose-300 bg-rose-50/60"
            : "border-emerald-100 bg-emerald-50/40 focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-500/15",
        )}
      >
        {children}
      </div>
      {error && (
        <p className="text-[11px] text-rose-700 font-semibold ml-0.5">
          {error}
        </p>
      )}
    </div>
  );
}

function MetricInput({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider ml-0.5 block">
        {label}
      </label>
      <div className="h-11 px-3 rounded-xl bg-emerald-50/40 border border-emerald-100 flex items-center gap-2.5 focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-500/15 transition-all">
        {children}
      </div>
    </div>
  );
}
