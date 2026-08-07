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
  Mail,
  Phone,
  User,
  ShieldCheck,
  Dna,
  Save,
  Fingerprint,
  HeartPulse,
  ChevronRight,
  Sparkles,
  ShieldAlert,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/app/utils/utils";
import { authPut } from "@/app/utils/client-auth";
import { poppins } from "@/app/constants";

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

  if (isLoading)
    return (
      <div
        className={cn(
          "min-h-screen bg-[#F8FAFC] pb-44 pt-8",
          poppins.className,
        )}
      >
        <div className="max-w-6xl mx-auto px-4 md:px-6 space-y-10 animate-pulse">
          {/* Hero Skeleton */}
          <div className="h-64 rounded-[36px] bg-slate-200 w-full" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-8 space-y-10">
              <div className="h-48 rounded-[36px] bg-white border border-slate-200" />
              <div className="h-80 rounded-[36px] bg-white border border-slate-200" />
            </div>
            <div className="lg:col-span-4">
              <div className="h-96 rounded-[36px] bg-white border border-slate-200" />
            </div>
          </div>
        </div>
      </div>
    );

  return (
    <div
      className={cn(
        "min-h-screen bg-[#F8FAFC] pb-44 pt-8 selection:bg-emerald-500 selection:text-white",
        poppins.className,
      )}
    >
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        {/* --- HERO SECTION --- */}
        <section className="relative rounded-[36px] md:rounded-[48px] bg-slate-900 overflow-hidden mb-12 shadow-sm border border-slate-800">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-emerald-500/10 to-transparent pointer-events-none" />

          <div className="relative z-10 p-8 md:p-14 flex flex-col md:flex-row items-center gap-8">
            <div className="w-32 h-32 md:w-36 md:h-36 rounded-[32px] overflow-hidden border-4 border-slate-800 shadow-lg bg-slate-800 shrink-0">
              <img
                src={
                  AVATARS.find((a) => a.id === watchedAvatar)?.src ||
                  AVATARS[0].src
                }
                className="w-full h-full object-cover"
                alt="Profile"
              />
            </div>

            <div className="flex-1 text-center md:text-left space-y-2">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                Account Settings
              </span>
              <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                Profile & Information
              </h1>
              <p className="text-slate-400 text-sm max-w-lg font-medium leading-relaxed">
                Update your personal details, physical metrics, and emergency
                contacts.
              </p>
            </div>
          </div>
        </section>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* LEFT: PRIMARY DATA */}
            <div className="lg:col-span-8 space-y-10">
              {/* Avatar Selection */}
              <section className="bg-white rounded-[36px] p-8 md:p-10 border border-slate-200/80 shadow-sm">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-100/60">
                    <User className="text-emerald-600" size={22} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 leading-none mb-1">
                      Profile Picture
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">
                      Choose an avatar for your account
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 sm:gap-4">
                  {AVATARS.map((avatar) => (
                    <motion.button
                      key={avatar.id}
                      type="button"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() =>
                        reset({ ...watch(), avatarId: avatar.id } as any)
                      }
                      className={cn(
                        "aspect-square rounded-2xl overflow-hidden border-2 transition-all relative",
                        watchedAvatar === avatar.id
                          ? "border-emerald-500 ring-4 ring-emerald-500/10 shadow-md"
                          : "border-slate-100 opacity-60 hover:opacity-100",
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

              {/* Personal Information */}
              <section className="bg-white rounded-[36px] p-8 md:p-10 border border-slate-200/80 shadow-sm space-y-8">
                <div className="flex items-center gap-4 mb-2">
                  <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-100/60">
                    <ShieldCheck className="text-emerald-600" size={22} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 leading-none mb-1">
                      Personal Details
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">
                      Your primary identification information
                    </p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <InputGroup
                    label="Full Name"
                    error={errors.displayName?.message}
                  >
                    <User size={20} className="text-emerald-600 shrink-0" />
                    <input
                      {...register("displayName")}
                      placeholder="Enter your name"
                      className="bg-transparent outline-none w-full text-base font-medium text-slate-800 placeholder:text-slate-300"
                    />
                  </InputGroup>
                  <InputGroup label="Phone Number">
                    <Phone size={20} className="text-emerald-600 shrink-0" />
                    <input
                      {...register("phone")}
                      placeholder="Enter phone number"
                      className="bg-transparent outline-none w-full text-base font-medium text-slate-800 placeholder:text-slate-300"
                    />
                  </InputGroup>
                </div>

                <div className="bg-slate-900 rounded-[28px] p-7 flex items-center justify-between shadow-sm border border-slate-800">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
                      Email Address
                    </label>
                    <span className="text-lg md:text-xl font-medium text-white tracking-tight">
                      {profile?.email}
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <ShieldCheck className="text-emerald-400 w-6 h-6" />
                  </div>
                </div>
              </section>
            </div>

            {/* RIGHT: HEALTH METRICS */}
            <div className="lg:col-span-4">
              <section className="bg-white rounded-[36px] p-8 border border-slate-200/80 shadow-sm space-y-8 sticky top-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 leading-none mb-1">
                      Health Metrics
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">
                      Physical attributes
                    </p>
                  </div>
                  <div className="w-11 h-11 bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-100/60">
                    <Dna size={22} className="text-emerald-600" />
                  </div>
                </div>

                <div className="space-y-5">
                  <MetricInput label="Blood Group">
                    <HeartPulse className="w-4 h-4 text-rose-500 shrink-0" />
                    <input
                      {...register("bloodGroup")}
                      placeholder="e.g. O+"
                      className="bg-transparent outline-none w-full text-slate-900 font-bold text-center placeholder:text-slate-300"
                    />
                  </MetricInput>

                  <MetricInput label="Gender">
                    <select
                      {...register("gender")}
                      className="bg-transparent outline-none w-full text-xs font-bold text-slate-700 cursor-pointer appearance-none text-center"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="prefer-not-to-say">
                        Prefer not to say
                      </option>
                    </select>
                  </MetricInput>

                  <div className="grid grid-cols-2 gap-4">
                    <MetricInput label="Height (cm)">
                      <input
                        type="number"
                        {...register("height", { valueAsNumber: true })}
                        placeholder="175"
                        className="bg-transparent outline-none w-full font-bold text-sm text-center placeholder:text-slate-300"
                      />
                    </MetricInput>
                    <MetricInput label="Weight (kg)">
                      <input
                        type="number"
                        {...register("weight", { valueAsNumber: true })}
                        placeholder="70"
                        className="bg-transparent outline-none w-full font-bold text-sm text-center placeholder:text-slate-300"
                      />
                    </MetricInput>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 bg-slate-50/50 -mx-8 -mb-8 p-8 rounded-b-[36px]">
                  <p className="text-xs text-slate-400 font-medium leading-relaxed">
                    Your health information is kept private and secure.
                  </p>
                </div>
              </section>
            </div>
          </div>

          {/* EMERGENCY CONTACTS (Full Width) */}
          <section className="bg-rose-50/30 rounded-[40px] md:rounded-[48px] p-8 md:p-12 border border-rose-100 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
              <div className="space-y-1">
                <h3 className="text-3xl md:text-4xl font-bold text-rose-950 leading-none">
                  Emergency Contacts
                </h3>
                <p className="text-xs text-rose-600 font-medium mt-1">
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
                className="flex items-center justify-center gap-2 bg-rose-600 text-white px-6 py-3.5 rounded-2xl font-bold text-xs shadow-md transition-all"
              >
                <Plus size={18} /> Add Contact
              </motion.button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <AnimatePresence>
                {fields.map((field, index) => (
                  <motion.div
                    key={field.id}
                    initial={{ opacity: 0, y: 15, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white p-6 rounded-[28px] border border-rose-100 shadow-sm relative group transition-all hover:shadow-md"
                  >
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => remove(index)}
                      className="absolute top-4 right-4 w-9 h-9 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500 hover:text-white"
                    >
                      <Trash2 size={16} />
                    </motion.button>

                    <div className="space-y-4 pt-1">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                          Contact Name
                        </label>
                        <input
                          {...register(`emergencyContacts.${index}.name`)}
                          placeholder="Full Name"
                          className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl text-sm font-medium text-slate-800 outline-none focus:bg-white focus:border-rose-400 transition-all placeholder:text-slate-300"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                            Phone
                          </label>
                          <input
                            {...register(`emergencyContacts.${index}.phone`)}
                            placeholder="Mobile"
                            className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl text-sm font-medium text-slate-800 outline-none focus:bg-white focus:border-rose-400 transition-all placeholder:text-slate-300"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                            Relation
                          </label>
                          <input
                            {...register(
                              `emergencyContacts.${index}.relationship`,
                            )}
                            placeholder="e.g. Spouse"
                            className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl text-sm font-medium text-slate-800 outline-none focus:bg-white focus:border-rose-400 transition-all placeholder:text-slate-300"
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {fields.length === 0 && (
              <div className="text-center py-12 border-2 border-dashed border-rose-200 rounded-[28px] bg-white/50">
                <p className="text-rose-400 font-medium text-sm">
                  No emergency contacts added yet. Click &quot;Add Contact&quot;
                  to include one.
                </p>
              </div>
            )}
          </section>

          {/* FLOATING ACTION BAR */}
          <div className="fixed bottom-10 left-0 right-0 px-4 flex justify-center z-50 pointer-events-none">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="pointer-events-auto w-full max-w-sm p-2 bg-slate-900/95 backdrop-blur-xl rounded-[28px] shadow-xl border border-slate-800"
            >
              <motion.button
                type="submit"
                disabled={!isDirty || isSaving}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="w-full h-14 bg-emerald-500 text-slate-950 rounded-[20px] shadow-md flex items-center justify-center gap-3 disabled:opacity-40 disabled:grayscale transition-all font-bold cursor-pointer hover:bg-emerald-400"
              >
                {isSaving ? (
                  <Loader2 className="animate-spin text-slate-950" size={20} />
                ) : (
                  <Save className="text-slate-950" size={18} />
                )}
                <span className="text-xs uppercase tracking-wider font-extrabold">
                  {isSaving ? "Saving..." : "Save Changes"}
                </span>
              </motion.button>
            </motion.div>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- SUB-COMPONENTS ---

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
    <div className="space-y-2">
      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">
        {label}
      </label>
      <div
        className={cn(
          "h-16 px-5 rounded-[22px] border flex items-center gap-4 transition-all duration-200",
          error
            ? "border-rose-500 bg-rose-50/50"
            : "border-slate-200 bg-slate-50/60 focus-within:border-emerald-500 focus-within:bg-white focus-within:shadow-sm",
        )}
      >
        {children}
      </div>
      {error && (
        <p className="text-[10px] text-rose-600 font-bold ml-2 uppercase tracking-tight">
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
    <div className="space-y-2">
      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider ml-1">
        {label}
      </label>
      <div className="h-14 px-4 rounded-2xl bg-slate-50/80 border border-slate-200 flex items-center gap-3 focus-within:border-emerald-500 focus-within:bg-white transition-all">
        {children}
      </div>
    </div>
  );
}
