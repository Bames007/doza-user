"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  Edit2,
  Phone,
  AlertCircle,
  Loader2,
  Heart,
  Users,
  HelpCircle,
  X,
  ChevronLeft,
  ChevronRight,
  UserPlus,
} from "lucide-react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/app/utils/utils";
import {
  authFetcher,
  authPost,
  authPut,
  authDelete,
} from "@/app/utils/client-auth";
import { poppins, bebasNeue } from "@/app/constants";

const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone is required"),
  relationship: z.string().min(1, "Relationship is required"),
  isEmergency: z.boolean(),
});

type ContactForm = z.infer<typeof contactSchema>;

interface FamilyFriend extends ContactForm {
  id: string;
}

export default function FamilyPanel() {
  const { data, error, isLoading } = useSWR("/api/family", authFetcher);
  const family: FamilyFriend[] = data?.success ? data.data : [];
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [helpSlide, setHelpSlide] = useState(0);

  // Check first visit
  useState(() => {
    const hasSeenHelp = localStorage.getItem("doza_family_help");
    if (!hasSeenHelp) {
      setShowHelp(true);
      localStorage.setItem("doza_family_help", "true");
    }
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      phone: "",
      relationship: "",
      isEmergency: false,
    },
  });

  const onSubmit: SubmitHandler<ContactForm> = async (formData) => {
    try {
      let result;
      if (editingId) {
        result = await authPut(`/api/family/${editingId}`, formData);
      } else {
        result = await authPost("/api/family", {
          ...formData,
          id: Date.now().toString(),
        });
      }
      if (result.success) {
        mutate("/api/family");
        reset();
        setEditingId(null);
        setShowForm(false);
      } else {
        alert("Error: " + result.error);
      }
    } catch {
      alert("Failed to save contact");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this contact?")) return;
    try {
      const result = await authDelete(`/api/family/${id}`);
      if (result.success) {
        mutate("/api/family");
      } else {
        alert("Error: " + result.error);
      }
    } catch {
      alert("Failed to delete contact");
    }
  };

  const handleEdit = (contact: FamilyFriend) => {
    setEditingId(contact.id);
    setValue("name", contact.name);
    setValue("phone", contact.phone);
    setValue("relationship", contact.relationship);
    setValue("isEmergency", contact.isEmergency);
    setShowForm(true);
  };

  const helpSlides = [
    {
      icon: <UserPlus className="w-12 h-12 text-emerald-600" />,
      title: "Add a contact",
      description:
        "Click the 'Add Contact' button and fill in their details. You can mark them as emergency.",
    },
    {
      icon: <Edit2 className="w-12 h-12 text-emerald-600" />,
      title: "Edit or delete",
      description:
        "Use the pencil and trash icons to update or remove a contact.",
    },
    {
      icon: <AlertCircle className="w-12 h-12 text-emerald-600" />,
      title: "Emergency contacts",
      description:
        "Emergency contacts are highlighted with a red border for quick access.",
    },
    {
      icon: <Phone className="w-12 h-12 text-emerald-600" />,
      title: "Call directly",
      description: "Tap the phone number to call your contact instantly.",
    },
  ];

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
          Error loading contacts.
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
            Family & Friends
          </h1>
          <p className="text-xs sm:text-sm text-emerald-600 mt-0.5">
            Keep your loved ones close
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

      {/* Add Contact Button */}
      <div className="flex justify-end mb-3">
        <button
          onClick={() => {
            setEditingId(null);
            reset({
              name: "",
              phone: "",
              relationship: "",
              isEmergency: false,
            });
            setShowForm(!showForm);
          }}
          className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition shadow-sm text-sm sm:text-base"
          aria-label={showForm ? "Cancel" : "Add Contact"}
        >
          <Plus className="w-4 h-4" />
          {showForm ? "Cancel" : "Add Contact"}
        </button>
      </div>

      {/* Add/Edit Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="bg-white border border-gray-100 rounded-2xl p-3 shadow-sm">
              <h2
                className={cn(
                  "text-base font-semibold text-gray-800 mb-2 flex items-center gap-2",
                  bebasNeue.className,
                )}
              >
                <Plus className="w-4 h-4 text-emerald-600" />
                {editingId ? "Edit Contact" : "Add New Contact"}
              </h2>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Name *
                    </label>
                    <input
                      {...register("name")}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-gray-900"
                    />
                    {errors.name && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.name.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Phone *
                    </label>
                    <input
                      {...register("phone")}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-gray-900"
                    />
                    {errors.phone && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.phone.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Relationship *
                    </label>
                    <input
                      {...register("relationship")}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-gray-900"
                    />
                    {errors.relationship && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.relationship.message}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      {...register("isEmergency")}
                      className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                    />
                    <label className="text-xs font-medium text-gray-700">
                      Emergency contact
                    </label>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingId(null);
                    }}
                    className="px-4 py-2 text-sm bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center justify-center gap-2 px-4 py-2 text-sm bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition shadow-sm"
                  >
                    {isSubmitting && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                    {editingId ? "Update" : "Save"}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contact List */}
      <div className="space-y-2">
        {family.length === 0 ? (
          <div className="bg-white/60 backdrop-blur-sm p-8 text-center text-gray-500 rounded-2xl border border-gray-100 shadow-sm">
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Users className="w-7 h-7 text-emerald-600" />
            </div>
            <p className="text-base font-medium text-gray-700 mb-1">
              No contacts yet
            </p>
            <p className="text-xs mb-3 max-w-md mx-auto">
              Add your family and friends to stay connected.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition inline-flex items-center gap-2 text-sm shadow-sm"
            >
              <Plus className="w-4 h-4" /> Add Contact
            </button>
          </div>
        ) : (
          family.map((contact) => (
            <motion.div
              key={contact.id}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={cn(
                "bg-white border border-gray-100 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2 shadow-sm hover:shadow-md transition",
                contact.isEmergency && "border-l-4 border-l-red-500",
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
                    {contact.name}
                  </h3>
                  {contact.isEmergency && (
                    <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full whitespace-nowrap">
                      <AlertCircle className="w-3 h-3" /> Emergency
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-gray-600">
                  {contact.relationship}
                </p>
                <a
                  href={`tel:${contact.phone}`}
                  className="text-xs sm:text-sm text-emerald-600 hover:underline flex items-center gap-1 mt-1"
                >
                  <Phone className="w-3 h-3" /> {contact.phone}
                </a>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleEdit(contact)}
                  className="p-2 hover:bg-gray-100 rounded-xl transition min-h-[36px] min-w-[36px] flex items-center justify-center"
                  aria-label="Edit contact"
                >
                  <Edit2 className="w-4 h-4 text-gray-600" />
                </button>
                <button
                  onClick={() => handleDelete(contact.id)}
                  className="p-2 hover:bg-red-100 text-red-600 rounded-xl transition min-h-[36px] min-w-[36px] flex items-center justify-center"
                  aria-label="Delete contact"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

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
