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
  Calendar,
  User,
  HelpCircle,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/app/utils/utils";
import { authPut } from "@/app/utils/client-auth";
import { poppins, bebasNeue } from "@/app/constants";

// Actual avatar files from your public folder
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
  { id: "good_emoji", src: "/assets/avatars/good_emoji.jpg" },
  { id: "happy_emoji", src: "/assets/avatars/happy_emoji.jpg" },
  { id: "not_sure_emoji", src: "/assets/avatars/not_sure_emoji.jpg" },
  { id: "ok_emoji", src: "/assets/avatars/ok_emoji.jpg" },
  { id: "sad_emoji", src: "/assets/avatars/sad_emoji.jpg" },
];

const emergencyContactSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone is required"),
  relationship: z.string().min(1, "Relationship is required"),
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

const helpSlides = [
  {
    icon: <User className="w-12 h-12 text-emerald-600" />,
    title: "Personal Information",
    description: "Fill in your details – name, contact, and health metrics.",
  },
  {
    icon: <Plus className="w-12 h-12 text-emerald-600" />,
    title: "Choose an avatar",
    description: "Pick an avatar from the grid to personalise your profile.",
  },
  {
    icon: <Phone className="w-12 h-12 text-emerald-600" />,
    title: "Emergency Contacts",
    description: "Add people to reach in case of emergency.",
  },
  {
    icon: <Mail className="w-12 h-12 text-emerald-600" />,
    title: "Save Changes",
    description: "Don't forget to hit 'Save Changes' when you're done.",
  },
];

export default function ProfilePanel() {
  const { profile, isLoading, error, mutateProfile } = useProfile();
  const [isSaving, setIsSaving] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [helpSlide, setHelpSlide] = useState(0);

  // First visit help modal
  useEffect(() => {
    const hasSeenHelp = localStorage.getItem("doza_profile_help");
    if (!hasSeenHelp) {
      setShowHelp(true);
      localStorage.setItem("doza_profile_help", "true");
    }
  }, []);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: "",
      phone: "",
      dateOfBirth: "",
      gender: "prefer-not-to-say",
      bloodGroup: "",
      height: undefined,
      weight: undefined,
      avatarId: AVATARS[0].id,
      emergencyContacts: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "emergencyContacts",
  });

  useEffect(() => {
    if (profile) {
      reset({
        displayName: profile.displayName || "",
        phone: profile.phone || "",
        dateOfBirth: profile.dateOfBirth || "",
        gender: profile.gender || "prefer-not-to-say",
        bloodGroup: profile.bloodGroup || "",
        height: profile.height || undefined,
        weight: profile.weight || undefined,
        avatarId: profile.avatarId || AVATARS[0].id,
        emergencyContacts: profile.emergencyContacts || [],
      });
    }
  }, [profile, reset]);

  const onSubmit = async (data: ProfileFormValues) => {
    setIsSaving(true);
    try {
      const result = await authPut("/api/user/profile", data);
      if (result.success) {
        mutateProfile();
        reset(data);
      } else {
        alert("Error saving profile: " + result.error);
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-3 pb-24  min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-3 pb-24  min-h-screen pt-4">
        <div className="p-4 text-red-600 text-center bg-white rounded-2xl border border-gray-100">
          Error loading profile.
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "max-w-6xl mx-auto px-3 pb-24  min-h-screen",
        poppins.className,
      )}
    >
      {/* Header with help icon */}
      <div className="pt-4 pb-3 flex items-center justify-between">
        <div>
          <h1
            className={cn(
              "text-2xl sm:text-3xl font-bold text-gray-800",
              bebasNeue.className,
            )}
          >
            Profile
          </h1>
          <p className="text-xs sm:text-sm text-emerald-600 mt-0.5">
            Manage your personal information
          </p>
        </div>
        <button
          onClick={() => setShowHelp(true)}
          className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-200 active:bg-gray-50"
          aria-label="How to use"
        >
          <HelpCircle className="w-5 h-5 text-emerald-600" />
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Avatar Selection */}
        <div className="bg-white border border-gray-100 rounded-2xl p-3 shadow-sm">
          <h2
            className={cn(
              "text-base font-semibold text-gray-800 mb-2 flex items-center gap-2",
              bebasNeue.className,
            )}
          >
            <User className="w-4 h-4 text-emerald-600" />
            Choose an avatar
          </h2>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-7 gap-2">
            {AVATARS.map((avatar) => (
              <button
                key={avatar.id}
                type="button"
                onClick={() =>
                  reset({ ...profile, avatarId: avatar.id } as any)
                }
                className={cn(
                  "relative aspect-square rounded-full overflow-hidden border-2 transition-all hover:scale-105",
                  profile?.avatarId === avatar.id
                    ? "border-emerald-600 ring-2 ring-emerald-200 ring-offset-2"
                    : "border-gray-200 hover:border-emerald-300",
                )}
              >
                <img
                  src={avatar.src}
                  alt={avatar.id}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>

        {/* Personal Information */}
        <div className="bg-white border border-gray-100 rounded-2xl p-3 shadow-sm">
          <h2
            className={cn(
              "text-base font-semibold text-gray-800 mb-2 flex items-center gap-2",
              bebasNeue.className,
            )}
          >
            <User className="w-4 h-4 text-emerald-600" />
            Personal Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <input
                {...register("displayName")}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-gray-900"
                placeholder="John Doe"
              />
              {errors.displayName && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.displayName.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                <Mail className="w-3 h-3" /> Email
              </label>
              <div className="flex items-center gap-2 w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-600 text-sm">
                <span className="truncate">
                  {profile?.email || "Not provided"}
                </span>
                <span className="text-xs text-gray-400 ml-auto">
                  (read‑only)
                </span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                <Phone className="w-3 h-3 inline mr-1" /> Phone
              </label>
              <input
                {...register("phone")}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-gray-900"
                placeholder="+234 123 456 7890"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                <Calendar className="w-3 h-3 inline mr-1" /> Date of Birth
              </label>
              <input
                type="date"
                {...register("dateOfBirth")}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Gender
              </label>
              <select
                {...register("gender")}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-gray-900"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer-not-to-say">Prefer not to say</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Blood Group
              </label>
              <input
                {...register("bloodGroup")}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-gray-900"
                placeholder="A+"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Height (cm)
              </label>
              <input
                type="number"
                {...register("height", { valueAsNumber: true })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-gray-900"
                placeholder="175"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Weight (kg)
              </label>
              <input
                type="number"
                {...register("weight", { valueAsNumber: true })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-gray-900"
                placeholder="70"
              />
            </div>
          </div>
        </div>

        {/* Emergency Contacts */}
        <div className="bg-white border border-gray-100 rounded-2xl p-3 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h2
              className={cn(
                "text-base font-semibold text-gray-800 flex items-center gap-2",
                bebasNeue.className,
              )}
            >
              <Phone className="w-4 h-4 text-emerald-600" />
              Emergency Contacts
            </h2>
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
              className="flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full hover:bg-emerald-100 transition"
            >
              <Plus className="w-3 h-3" /> Add
            </button>
          </div>
          <div className="space-y-2">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="flex flex-col sm:flex-row gap-2 items-start p-2 border border-gray-100 rounded-xl bg-gray-50/50"
              >
                <div className="flex-1 w-full">
                  <input
                    {...register(`emergencyContacts.${index}.name`)}
                    placeholder="Name"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-emerald-500 text-gray-900"
                  />
                  {errors.emergencyContacts?.[index]?.name && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.emergencyContacts[index]?.name?.message}
                    </p>
                  )}
                </div>
                <div className="flex-1 w-full">
                  <input
                    {...register(`emergencyContacts.${index}.phone`)}
                    placeholder="Phone"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-emerald-500 text-gray-900"
                  />
                </div>
                <div className="flex-1 w-full">
                  <input
                    {...register(`emergencyContacts.${index}.relationship`)}
                    placeholder="Relationship"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-emerald-500 text-gray-900"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="text-red-500 hover:text-red-700 p-2 mt-1 sm:mt-0 self-center"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {fields.length === 0 && (
              <p className="text-gray-500 text-xs italic">
                No emergency contacts added.
              </p>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!isDirty || isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition shadow-sm text-sm"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>

      {/* Help Carousel Modal */}
      <AnimatePresence>
        {showHelp && (
          <Modal onClose={() => setShowHelp(false)}>
            <div className="flex items-center justify-between mb-3">
              <h2
                className={cn(
                  "text-lg font-bold text-gray-900 flex items-center gap-2",
                  bebasNeue.className,
                )}
              >
                <HelpCircle className="w-5 h-5 text-emerald-600" />
                How to use
              </h2>
              <button
                onClick={() => setShowHelp(false)}
                className="p-1 hover:bg-gray-100 rounded-full"
                aria-label="Close help"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={helpSlide}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col items-center text-center p-2"
                >
                  <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mb-2">
                    {helpSlides[helpSlide].icon}
                  </div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-1">
                    {helpSlides[helpSlide].title}
                  </h3>
                  <p className="text-xs text-gray-600">
                    {helpSlides[helpSlide].description}
                  </p>
                </motion.div>
              </AnimatePresence>

              <div className="flex justify-center gap-2 mt-3">
                {helpSlides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setHelpSlide(idx)}
                    className={cn(
                      "w-1.5 h-1.5 rounded-full transition",
                      idx === helpSlide ? "bg-emerald-600 w-3" : "bg-gray-300",
                    )}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>

              <button
                onClick={() =>
                  setHelpSlide((prev) =>
                    prev === 0 ? helpSlides.length - 1 : prev - 1,
                  )
                }
                className="absolute left-0 top-1/2 -translate-y-1/2 p-1 bg-gray-100 rounded-full hover:bg-gray-200"
                aria-label="Previous slide"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              <button
                onClick={() =>
                  setHelpSlide((prev) =>
                    prev === helpSlides.length - 1 ? 0 : prev + 1,
                  )
                }
                className="absolute right-0 top-1/2 -translate-y-1/2 p-1 bg-gray-100 rounded-full hover:bg-gray-200"
                aria-label="Next slide"
              >
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            <button
              onClick={() => setShowHelp(false)}
              className="mt-4 w-full px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 text-sm"
            >
              Get Started
            </button>
          </Modal>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Reusable Modal component
const Modal = ({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-3"
    onClick={onClose}
  >
    <motion.div
      initial={{ scale: 0.95, y: 10 }}
      animate={{ scale: 1, y: 0 }}
      exit={{ scale: 0.95, y: 10 }}
      className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-4 shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </motion.div>
  </motion.div>
);
