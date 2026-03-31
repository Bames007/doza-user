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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/app/utils/utils";
import { authPut } from "@/app/utils/client-auth";
import { poppins, bebasNeue } from "@/app/constants";

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
      alert("System Sync Failed");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading)
    return (
      <div className="h-screen bg-[#F8FAFC] flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-emerald-500" size={40} />
        <span
          className={cn(
            "text-2xl font-black text-slate-400 tracking-tighter uppercase",
            bebasNeue.className,
          )}
        >
          Decrypting Identity...
        </span>
      </div>
    );

  return (
    <div
      className={cn("min-h-screen bg-[#F8FAFC] pb-40 pt-6", poppins.className)}
    >
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        {/* --- HERO SECTION (Dashboard Style) --- */}
        <section className="relative rounded-[32px] md:rounded-[40px] bg-slate-900 overflow-hidden mb-12 shadow-2xl border border-white/5">
          <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-emerald-500/10 to-transparent" />
          <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-emerald-600/5 rounded-full blur-[100px]" />

          <div className="relative z-10 p-8 md:p-14 flex flex-col md:flex-row items-center gap-10">
            <div className="relative group">
              <div className="w-28 h-28 md:w-40 md:h-40 rounded-[35px] overflow-hidden border-4 border-emerald-500 shadow-2xl rotate-3 bg-white transition-transform group-hover:rotate-0 duration-500">
                <img
                  src={
                    AVATARS.find((a) => a.id === watchedAvatar)?.src ||
                    AVATARS[0].src
                  }
                  className="w-full h-full object-cover"
                  alt="Profile"
                />
              </div>
              <div className="absolute -bottom-3 -right-3 p-4 bg-emerald-500 rounded-2xl shadow-xl border-4 border-slate-900">
                <Fingerprint className="text-white w-6 h-6" />
              </div>
            </div>

            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center gap-2 mb-3 justify-center md:justify-start">
                <span className="h-[2px] w-8 bg-emerald-500" />
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.4em]">
                  Biometric Record
                </span>
              </div>
              <h1
                className={cn(
                  "text-5xl md:text-8xl text-white leading-[0.85] mb-4",
                  bebasNeue.className,
                )}
              >
                IDENTITY <span className="text-emerald-500">MATRIX</span>
              </h1>
              <p className="text-slate-400 text-sm max-w-md font-medium">
                Manage your clinical biometrics, authenticated identity, and
                emergency medical protocols.
              </p>
            </div>
          </div>
        </section>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* LEFT: PRIMARY DATA */}
            <div className="lg:col-span-8 space-y-10">
              {/* Avatar Matrix */}
              <section className="bg-white rounded-[32px] p-8 border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                    <User className="text-emerald-600" size={20} />
                  </div>
                  <h3
                    className={cn(
                      "text-3xl text-slate-900",
                      bebasNeue.className,
                    )}
                  >
                    Visual Identifier
                  </h3>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-8 gap-4">
                  {AVATARS.map((avatar) => (
                    <button
                      key={avatar.id}
                      type="button"
                      onClick={() =>
                        reset({ ...watch(), avatarId: avatar.id } as any)
                      }
                      className={cn(
                        "aspect-square rounded-2xl overflow-hidden border-2 transition-all active:scale-90",
                        watchedAvatar === avatar.id
                          ? "border-emerald-500 ring-4 ring-emerald-50 scale-105 shadow-lg shadow-emerald-500/10"
                          : "border-slate-100 opacity-50 grayscale hover:opacity-100 hover:grayscale-0",
                      )}
                    >
                      <img
                        src={avatar.src}
                        className="w-full h-full object-cover"
                        alt="avatar"
                      />
                    </button>
                  ))}
                </div>
              </section>

              {/* Registry Information */}
              <section className="bg-white rounded-[32px] p-8 border border-slate-200 shadow-sm space-y-8">
                <h3
                  className={cn(
                    "text-3xl text-slate-900 mb-2",
                    bebasNeue.className,
                  )}
                >
                  Registry Data
                </h3>
                <div className="grid md:grid-cols-2 gap-8">
                  <InputGroup
                    label="Full Display Name"
                    error={errors.displayName?.message}
                  >
                    <User size={20} className="text-emerald-600" />
                    <input
                      {...register("displayName")}
                      className="bg-transparent outline-none w-full text-base font-bold text-slate-800"
                    />
                  </InputGroup>
                  <InputGroup label="Emergency Mobile">
                    <Phone size={20} className="text-emerald-600" />
                    <input
                      {...register("phone")}
                      placeholder="+234..."
                      className="bg-transparent outline-none w-full text-base font-bold text-slate-800"
                    />
                  </InputGroup>
                </div>

                <div className="bg-slate-900 rounded-[24px] p-6 flex items-center justify-between group overflow-hidden relative">
                  <div className="absolute right-0 top-0 h-full w-32 bg-emerald-500/5 -skew-x-12 translate-x-10" />
                  <div className="relative z-10">
                    <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block mb-1">
                      System Locked Email
                    </label>
                    <span className="text-lg font-bold text-white tracking-tight">
                      {profile?.email}
                    </span>
                  </div>
                  <ShieldCheck className="text-emerald-500 w-8 h-8 relative z-10" />
                </div>
              </section>
            </div>

            {/* RIGHT: BIOMETRICS */}
            <div className="lg:col-span-4">
              <section className="bg-white rounded-[32px] p-8 border border-slate-200 shadow-sm space-y-8 sticky top-8">
                <div className="flex items-center justify-between">
                  <h3
                    className={cn(
                      "text-3xl text-slate-900",
                      bebasNeue.className,
                    )}
                  >
                    Biometrics
                  </h3>
                  <Dna size={24} className="text-emerald-600" />
                </div>

                <div className="space-y-6">
                  <MetricInput label="Blood Group">
                    <HeartPulse className="w-4 h-4 text-rose-500" />
                    <input
                      {...register("bloodGroup")}
                      placeholder="O+"
                      className="bg-transparent outline-none w-full text-slate-900 font-black text-center"
                    />
                  </MetricInput>

                  <MetricInput label="Gender Identity">
                    <select
                      {...register("gender")}
                      className="bg-transparent outline-none w-full text-xs font-black text-slate-700 cursor-pointer appearance-none text-center"
                    >
                      <option value="male">MALE</option>
                      <option value="female">FEMALE</option>
                      <option value="prefer-not-to-say">NOT SET</option>
                    </select>
                  </MetricInput>

                  <div className="grid grid-cols-2 gap-4">
                    <MetricInput label="Height (cm)">
                      <input
                        type="number"
                        {...register("height", { valueAsNumber: true })}
                        className="bg-transparent outline-none w-full font-black text-sm text-center"
                      />
                    </MetricInput>
                    <MetricInput label="Weight (kg)">
                      <input
                        type="number"
                        {...register("weight", { valueAsNumber: true })}
                        className="bg-transparent outline-none w-full font-black text-sm text-center"
                      />
                    </MetricInput>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100">
                  <p className="text-[10px] text-slate-400 font-bold leading-relaxed">
                    Clinical data is encrypted using AES-256 standards. Only
                    authorized personnel can access these metrics.
                  </p>
                </div>
              </section>
            </div>
          </div>

          {/* EMERGENCY PROTOCOLS (Full Width) */}
          <section className="bg-rose-50/30 rounded-[40px] p-8 md:p-12 border border-rose-100">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
              <div>
                <h3
                  className={cn(
                    "text-4xl text-rose-900 leading-none",
                    bebasNeue.className,
                  )}
                >
                  Emergency Protocols
                </h3>
                <p className="text-[10px] text-rose-600 font-black uppercase tracking-[0.2em] mt-2">
                  Active Notification Nodes
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  append({
                    id: Date.now().toString(),
                    name: "",
                    phone: "",
                    relationship: "",
                  })
                }
                className="flex items-center gap-3 bg-rose-600 text-white px-6 py-4 rounded-[20px] font-black text-[10px] uppercase tracking-widest shadow-xl shadow-rose-600/20 hover:bg-rose-700 transition-all active:scale-95"
              >
                <Plus size={18} /> Add Contact
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {fields.map((field, index) => (
                <motion.div
                  key={field.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white p-6 rounded-[28px] border border-rose-100 shadow-sm relative group transition-all hover:shadow-md"
                >
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="absolute top-4 right-4 w-9 h-9 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={16} />
                  </button>

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Contact Name
                      </label>
                      <input
                        {...register(`emergencyContacts.${index}.name`)}
                        placeholder="Full Name"
                        className="w-full bg-slate-50 border border-slate-100 p-4 rounded-xl text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-rose-200"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                          Phone
                        </label>
                        <input
                          {...register(`emergencyContacts.${index}.phone`)}
                          placeholder="Mobile"
                          className="w-full bg-slate-50 border border-slate-100 p-4 rounded-xl text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-rose-200"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                          Relation
                        </label>
                        <input
                          {...register(
                            `emergencyContacts.${index}.relationship`,
                          )}
                          placeholder="Spouse"
                          className="w-full bg-slate-50 border border-slate-100 p-4 rounded-xl text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-rose-200"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {fields.length === 0 && (
              <div className="text-center py-16 border-2 border-dashed border-rose-200 rounded-[30px] bg-white/50">
                <p className="text-rose-400 font-bold text-sm italic">
                  No emergency protocols active. Please add a contact.
                </p>
              </div>
            )}
          </section>

          {/* FLOATING ACTION BAR */}
          <div className="fixed bottom-12 left-0 right-0 px-4 flex justify-center z-50 pointer-events-none">
            <motion.button
              type="submit"
              disabled={!isDirty || isSaving}
              className="pointer-events-auto w-full max-w-sm h-16 bg-slate-900 text-white rounded-[24px] shadow-2xl flex items-center justify-center gap-4 disabled:opacity-50 disabled:grayscale transition-all hover:bg-emerald-600 group"
            >
              {isSaving ? (
                <Loader2 className="animate-spin" size={24} />
              ) : (
                <Save
                  className="text-emerald-400 group-hover:text-white transition-colors"
                  size={20}
                />
              )}
              <span className="text-[11px] font-black uppercase tracking-[0.3em]">
                {isSaving ? "Synchronizing..." : "Update Profile"}
              </span>
              {!isSaving && (
                <ChevronRight
                  size={16}
                  className="text-slate-500 group-hover:text-white translate-x-0 group-hover:translate-x-1 transition-all"
                />
              )}
            </motion.button>
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
      <label className="text-[11px] font-black text-emerald-600 uppercase tracking-[0.2em] ml-1">
        {label}
      </label>
      <div
        className={cn(
          "h-16 px-5 rounded-[20px] border flex items-center gap-4 transition-all",
          error
            ? "border-rose-500 bg-rose-50"
            : "border-slate-200 bg-slate-50 focus-within:border-emerald-500 focus-within:bg-white focus-within:shadow-xl focus-within:shadow-emerald-500/5",
        )}
      >
        {children}
      </div>
      {error && (
        <p className="text-[10px] text-rose-600 font-bold ml-2 uppercase tracking-tighter">
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
      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
        {label}
      </label>
      <div className="h-14 px-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3 focus-within:border-emerald-500 focus-within:bg-white transition-all">
        {children}
      </div>
    </div>
  );
}
