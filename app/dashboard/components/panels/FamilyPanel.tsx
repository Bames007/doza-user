"use client";

import React, { useState } from "react";
import useSWR, { mutate } from "swr";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import {
  Plus,
  Trash2,
  Edit2,
  Phone,
  Loader2,
  Users,
  HelpCircle,
  X,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  ShieldCheck,
  Heart,
  Activity,
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
  name: z.string().min(1, "Please enter a name"),
  phone: z.string().min(1, "Please enter a phone number"),
  relationship: z.string().min(1, "Please tell us how you know this person"),
  isEmergency: z.boolean(),
});

type ContactForm = z.infer<typeof contactSchema>;
interface FamilyFriend extends ContactForm {
  id: string;
}

export default function FamilyPanel() {
  const { data, isLoading } = useSWR("/api/family", authFetcher);
  const family: FamilyFriend[] = data?.success ? data.data : [];

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [helpSlide, setHelpSlide] = useState(0);

  const helpContent = [
    {
      title: "Your Inner Circle",
      text: "Add family, close friends, or your doctors. These trusted contacts help look out for your health and well-being.",
    },
    {
      title: "Emergency SOS Responders",
      text: "Contacts marked as emergency responders will be notified immediately if you trigger a critical health alert.",
    },
    {
      title: "Safe & Private Data",
      text: "Your information is secure. Your health updates are only shared with the specific people you choose to add here.",
    },
  ];

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
    const result = editingId
      ? await authPut(`/api/family/${editingId}`, formData)
      : await authPost("/api/family", {
          ...formData,
          id: Date.now().toString(),
        });
    if (result.success) {
      mutate("/api/family");
      reset();
      setEditingId(null);
      setShowForm(false);
    }
  };

  return (
    <div
      className={cn("min-h-screen bg-[#F8FAFC] pb-32 pt-6", poppins.className)}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6 space-y-6">
        {/* --- HEADER --- */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 md:p-8 rounded-[32px] border border-slate-200/80 shadow-xs">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Care Circle Active
              </p>
            </div>
            <h1
              className={cn(
                "text-4xl md:text-5xl text-slate-900 leading-none tracking-tight",
                bebasNeue.className,
              )}
            >
              DOZA <span className="text-emerald-600">FAMILY & FRIENDS</span>
            </h1>
            <p className="text-slate-600 font-semibold text-xs md:text-sm mt-1">
              Manage your trusted medical contacts, family, and emergency
              responders.
            </p>
          </div>

          <button
            onClick={() => {
              setEditingId(null);
              reset();
              setShowForm(true);
            }}
            className="w-full md:w-auto flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-wider transition-all active:scale-98 shadow-md"
          >
            <UserPlus size={16} className="stroke-[2.5]" />
            <span>Add Someone New</span>
          </button>
        </header>

        {/* --- MAIN PAGE LAYOUT --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT SIDEBAR: HELP GUIDE & SECURITY */}
          <div className="lg:col-span-4 space-y-6 order-2 lg:order-1">
            <div className="bg-emerald-600 rounded-[32px] p-8 text-white relative overflow-hidden shadow-lg min-h-[300px] flex flex-col justify-between">
              <div className="relative z-10 flex-1">
                <div className="flex items-center gap-2 mb-6">
                  <HelpCircle size={18} className="text-emerald-200" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-100">
                    How This Helps You
                  </span>
                </div>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={helpSlide}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.2 }}
                  >
                    <h3 className="text-2xl font-black mb-2 tracking-tight">
                      {helpContent[helpSlide].title}
                    </h3>
                    <p className="text-emerald-50 text-sm leading-relaxed font-medium">
                      {helpContent[helpSlide].text}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="relative z-10 flex justify-between items-center mt-6 pt-4 border-t border-white/10">
                <div className="flex gap-2">
                  <button
                    onClick={() => setHelpSlide((s) => (s > 0 ? s - 1 : 2))}
                    className="p-2.5 bg-white/10 rounded-xl hover:bg-white/20 active:scale-95 transition-all"
                  >
                    <ChevronLeft size={14} className="stroke-[2.5]" />
                  </button>
                  <button
                    onClick={() => setHelpSlide((s) => (s < 2 ? s + 1 : 0))}
                    className="p-2.5 bg-white/10 rounded-xl hover:bg-white/20 active:scale-95 transition-all"
                  >
                    <ChevronRight size={14} className="stroke-[2.5]" />
                  </button>
                </div>
                <span className="text-[11px] font-black tracking-widest bg-emerald-700 px-3 py-1 rounded-full text-emerald-100 shadow-2xs">
                  {helpSlide + 1} / 3
                </span>
              </div>
              <Activity
                size={180}
                className="absolute -bottom-14 -right-14 text-white/[0.04] pointer-events-none stroke-[1.5]"
              />
            </div>

            <div className="bg-white border border-slate-200/80 rounded-[32px] p-6 flex items-center gap-4 shadow-3xs">
              <div className="h-12 w-12 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center text-blue-600 shrink-0 shadow-3xs">
                <ShieldCheck size={22} className="stroke-[2.5]" />
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                  Privacy Protected
                </p>
                <p className="text-sm font-bold text-slate-800 tracking-tight">
                  Your Data is Safe & Encrypted
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR: CONTACT LIST */}
          <div className="lg:col-span-8 space-y-6 order-1 lg:order-2">
            {isLoading ? (
              <PanelSkeletonGrid />
            ) : (
              <LayoutGroup>
                <motion.div
                  layout
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                >
                  <AnimatePresence mode="popLayout">
                    {family.length === 0 ? (
                      <EmptyState onAdd={() => setShowForm(true)} />
                    ) : (
                      family.map((contact) => (
                        <ContactCard
                          key={contact.id}
                          contact={contact}
                          onEdit={() => {
                            setEditingId(contact.id);
                            setValue("name", contact.name);
                            setValue("phone", contact.phone);
                            setValue("relationship", contact.relationship);
                            setValue("isEmergency", contact.isEmergency);
                            setShowForm(true);
                          }}
                          onDelete={() =>
                            authDelete(`/api/family/${contact.id}`).then(() =>
                              mutate("/api/family"),
                            )
                          }
                        />
                      ))
                    )}
                  </AnimatePresence>
                </motion.div>
              </LayoutGroup>
            )}
          </div>
        </div>
      </div>

      {/* --- ADD / EDIT POPUP MODAL --- */}
      <AnimatePresence>
        {showForm && (
          <Modal
            onClose={() => setShowForm(false)}
            title={
              editingId ? "Update Contact Info" : "Add Contact To Your Circle"
            }
          >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <FormInput
                label="Full Name"
                placeholder="e.g., Jane Doe"
                {...register("name")}
                error={errors.name?.message}
              />
              <FormInput
                label="Phone Number"
                placeholder="e.g., (555) 000-0000"
                {...register("phone")}
                error={errors.phone?.message}
              />
              <FormInput
                label="How are you related?"
                placeholder="e.g., Spouse, Sister, Primary Doctor"
                {...register("relationship")}
                error={errors.relationship?.message}
              />

              <label className="flex items-center gap-4 p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white transition-all cursor-pointer has-[:checked]:border-rose-300 has-[:checked]:bg-rose-50/20 group">
                <input
                  type="checkbox"
                  {...register("isEmergency")}
                  className="w-5 h-5 rounded-md text-rose-600 focus:ring-rose-500 border-slate-300 shadow-3xs cursor-pointer"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 text-xs uppercase tracking-tight group-hover:text-slate-900 transition-colors">
                    Set as an Emergency Contact
                  </p>
                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-0.5">
                    This person will receive immediate alerts during urgent
                    situations
                  </p>
                </div>
              </label>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-4 font-black text-slate-500 bg-slate-100 border border-slate-200/60 hover:bg-slate-200 hover:text-slate-700 rounded-2xl text-[10px] uppercase tracking-widest transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-4 font-black text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 rounded-2xl text-[10px] uppercase tracking-widest shadow-md transition-all flex items-center justify-center min-h-[48px]"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Save To Circle"
                  )}
                </button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

/* --- CONTACT CARD COMPONENT --- */

function ContactCard({
  contact,
  onEdit,
  onDelete,
}: {
  contact: FamilyFriend;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className={cn(
        "bg-white p-5 rounded-[28px] border border-slate-200/80 shadow-xs flex flex-col justify-between gap-4 transition-all hover:shadow-md",
        contact.isEmergency &&
          "border-rose-200 bg-gradient-to-br from-white via-white to-rose-50/15",
      )}
    >
      <div className="flex items-start gap-4">
        {/* Initials Circle */}
        <div
          className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg italic shrink-0 border shadow-3xs",
            contact.isEmergency
              ? "bg-rose-500 border-rose-600 text-white shadow-rose-200"
              : "bg-slate-50 border-slate-200/70 text-slate-500",
          )}
        >
          {contact.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()}
        </div>

        {/* Contact Information Details */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <h3 className="font-bold text-slate-900 text-base truncate tracking-tight">
              {contact.name}
            </h3>
            {contact.isEmergency && (
              <Heart
                size={13}
                className="text-rose-500 fill-rose-500 shrink-0 drop-shadow-xs animate-pulse"
              />
            )}
          </div>
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider mb-2.5">
            {contact.relationship}
          </p>
          <a
            href={`tel:${contact.phone}`}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200/60 rounded-xl text-[11px] font-bold text-slate-600 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-3xs"
          >
            <Phone size={11} className="stroke-[2.5]" />
            <span className="truncate">{contact.phone}</span>
          </a>
        </div>
      </div>

      {/* Persistent Edit/Delete Action Row */}
      <div className="flex items-center justify-end gap-1 pt-3 border-t border-slate-100">
        <button
          onClick={onEdit}
          className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-800 rounded-xl transition-all"
          title="Edit Details"
        >
          <Edit2 size={14} className="stroke-[2.5]" />
        </button>
        <button
          onClick={() =>
            confirm(
              "Are you sure you want to remove this person from your circle?",
            ) && onDelete()
          }
          className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all"
          title="Remove Contact"
        >
          <Trash2 size={14} className="stroke-[2.5]" />
        </button>
      </div>
    </motion.div>
  );
}

const FormInput = React.forwardRef(
  ({ label, error, ...props }: any, ref: any) => (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
        {label}
      </label>
      <input
        ref={ref}
        {...props}
        className={cn(
          "w-full px-4 py-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all font-semibold text-sm text-slate-900 placeholder:text-slate-300 shadow-3xs",
          error &&
            "border-rose-400 bg-rose-50/40 focus:border-rose-500 focus:ring-rose-500/5",
        )}
      />
      {error && (
        <p className="text-[10px] font-bold text-rose-600 ml-1 tracking-tight">
          {error}
        </p>
      )}
    </div>
  ),
);
FormInput.displayName = "FormInput";

const Modal = ({ children, onClose, title }: any) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-end sm:items-center justify-center p-4"
    onClick={onClose}
  >
    <motion.div
      initial={{ y: 24, scale: 0.98 }}
      animate={{ y: 0, scale: 1 }}
      exit={{ y: 24, scale: 0.98 }}
      className="bg-white w-full max-w-md rounded-[32px] p-6 sm:p-8 shadow-2xl border border-slate-100"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between items-center mb-6">
        <h2
          className={cn(
            "text-3xl font-black text-slate-900 uppercase tracking-tight leading-none",
            bebasNeue.className,
          )}
        >
          {title}
        </h2>
        <button
          onClick={onClose}
          className="p-2 bg-slate-50 border border-slate-200/50 rounded-full hover:bg-rose-50 hover:border-rose-100 hover:text-rose-500 transition-colors"
        >
          <X size={16} className="stroke-[2.5]" />
        </button>
      </div>
      {children}
    </motion.div>
  </motion.div>
);

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="col-span-full py-16 px-4 bg-white border border-dashed border-slate-200 rounded-[32px] text-center shadow-3xs">
      <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400 shadow-inner">
        <Users size={28} />
      </div>
      <h3 className="text-lg font-bold text-slate-900 tracking-tight">
        Your Health Circle is Empty
      </h3>
      <p className="text-slate-500 font-semibold text-xs mb-8 max-w-xs mx-auto mt-1">
        Add family members, close friends, or your care team to stay safely
        connected.
      </p>
      <button
        onClick={onAdd}
        className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-wider shadow-md active:scale-98 transition-all"
      >
        Add First Contact
      </button>
    </div>
  );
}

/* --- ANIMATED PULSE SKELETON PLACEHOLDERS --- */

function PanelSkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-pulse">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div
          key={idx}
          className="bg-white/60 p-5 rounded-[28px] border border-slate-200/50 flex flex-col justify-between gap-6 min-h-[160px]"
        >
          <div className="flex items-start gap-4">
            {/* Avatar block */}
            <div className="w-14 h-14 rounded-2xl bg-slate-200 shrink-0" />

            {/* Context line payloads */}
            <div className="flex-1 space-y-2 mt-1">
              <div className="h-4 bg-slate-200 rounded-md w-3/4" />
              <div className="h-3 bg-slate-100 rounded-md w-1/2" />
              <div className="pt-2">
                <div className="h-6 bg-slate-200/70 rounded-xl w-28" />
              </div>
            </div>
          </div>

          {/* Bottom dock placeholders */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100/70">
            <div className="w-7 h-7 bg-slate-100 rounded-lg" />
            <div className="w-7 h-7 bg-slate-100 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}
