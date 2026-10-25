// app/dashboard/panels/FamilyPanel.tsx
"use client";

import React, { useState } from "react";
import useSWR, { mutate } from "swr";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import {
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
import { poppins } from "@/app/constants";

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2";

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

  const openAdd = () => {
    setEditingId(null);
    reset();
    setShowForm(true);
  };

  const openEdit = (contact: FamilyFriend) => {
    setEditingId(contact.id);
    setValue("name", contact.name);
    setValue("phone", contact.phone);
    setValue("relationship", contact.relationship);
    setValue("isEmergency", contact.isEmergency);
    setShowForm(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "min-h-screen bg-[#F8FAFC] pb-28 pt-2 text-slate-900",
        poppins.className,
      )}
    >
      <main className="mx-auto max-w-7xl px-4 pt-3 sm:px-6 lg:px-8 space-y-4 lg:space-y-6">
        {/* ─── HEADER — Dashboard pattern ──────────────────────── */}
        <header className="pt-1 lg:pt-2 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight leading-tight">
                Family &amp; Friends
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md">
                Manage your trusted medical contacts, family, and emergency
                responders.
              </p>
            </div>

            <button
              onClick={openAdd}
              className={cn(
                "inline-flex items-center justify-center gap-2 min-h-11 px-4 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-sm shadow-emerald-600/25 hover:bg-emerald-700 transition-all shrink-0",
                FOCUS,
              )}
            >
              <UserPlus size={15} />
              <span>Add Someone</span>
            </button>
          </div>
        </header>

        {/* ─── MAIN LAYOUT ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
          {/* LEFT SIDEBAR: HELP GUIDE + SECURITY */}
          <aside className="lg:col-span-4 space-y-4 order-2 lg:order-1">
            <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl p-5 sm:p-6 text-white relative overflow-hidden shadow-sm min-h-[260px] flex flex-col justify-between">
              <div className="relative z-10 flex-1">
                <div className="flex items-center gap-2 mb-4">
                  <HelpCircle size={14} className="text-emerald-200" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-100">
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
                    <h3 className="text-xl font-bold mb-1.5 tracking-tight leading-tight">
                      {helpContent[helpSlide].title}
                    </h3>
                    <p className="text-emerald-50 text-xs sm:text-sm leading-relaxed">
                      {helpContent[helpSlide].text}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="relative z-10 flex justify-between items-center mt-5 pt-3 border-t border-white/15">
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setHelpSlide((s) => (s > 0 ? s - 1 : 2))}
                    className="p-2 bg-white/10 rounded-lg hover:bg-white/20 active:scale-95 transition-all min-h-9 min-w-9 inline-flex items-center justify-center"
                    aria-label="Previous tip"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    onClick={() => setHelpSlide((s) => (s < 2 ? s + 1 : 0))}
                    className="p-2 bg-white/10 rounded-lg hover:bg-white/20 active:scale-95 transition-all min-h-9 min-w-9 inline-flex items-center justify-center"
                    aria-label="Next tip"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
                <div className="flex gap-1.5">
                  {helpContent.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setHelpSlide(i)}
                      aria-label={`Go to slide ${i + 1}`}
                      className={cn(
                        "h-1.5 rounded-full transition-all",
                        i === helpSlide ? "bg-white w-4" : "bg-white/40 w-1.5",
                      )}
                    />
                  ))}
                </div>
              </div>
              <Activity
                size={160}
                className="absolute -bottom-12 -right-12 text-white/[0.05] pointer-events-none"
              />
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3 shadow-xs">
              <div className="h-10 w-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                <ShieldCheck size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-0.5">
                  Privacy Protected
                </p>
                <p className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                  Your data is safe &amp; encrypted
                </p>
              </div>
            </div>
          </aside>

          {/* RIGHT: CONTACT GRID */}
          <section className="lg:col-span-8 order-1 lg:order-2">
            {isLoading ? (
              <PanelSkeletonGrid />
            ) : (
              <LayoutGroup>
                <motion.div
                  layout
                  className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4"
                >
                  <AnimatePresence mode="popLayout">
                    {family.length === 0 ? (
                      <EmptyState onAdd={openAdd} />
                    ) : (
                      family.map((contact) => (
                        <ContactCard
                          key={contact.id}
                          contact={contact}
                          onEdit={() => openEdit(contact)}
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
          </section>
        </div>
      </main>

      {/* ─── MODAL — sticky header + footer, mobile sheet ──────── */}
      <AnimatePresence>
        {showForm && (
          <Modal
            onClose={() => setShowForm(false)}
            title={editingId ? "Update Contact" : "Add Contact"}
            footer={
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className={cn(
                    "flex-1 min-h-12 text-xs font-bold uppercase tracking-wider text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors",
                    FOCUS,
                  )}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="family-form"
                  disabled={isSubmitting}
                  className={cn(
                    "flex-[2] min-h-12 inline-flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-sm transition-colors",
                    FOCUS,
                  )}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Save to Circle"
                  )}
                </button>
              </div>
            }
          >
            <form
              id="family-form"
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-4"
            >
              <FormInput
                label="Full Name"
                placeholder="e.g., Jane Doe"
                {...register("name")}
                error={errors.name?.message}
              />
              <FormInput
                label="Phone Number"
                type="tel"
                placeholder="e.g., (555) 000-0000"
                {...register("phone")}
                error={errors.phone?.message}
              />
              <FormInput
                label="How are you related?"
                placeholder="e.g., Spouse, Sister, Doctor"
                {...register("relationship")}
                error={errors.relationship?.message}
              />

              <label
                className={cn(
                  "flex items-start gap-3 p-3.5 rounded-xl border bg-slate-50 cursor-pointer transition-all",
                  "has-[:checked]:border-rose-300 has-[:checked]:bg-rose-50/40",
                  "border-slate-200 hover:border-slate-300",
                )}
              >
                <input
                  type="checkbox"
                  {...register("isEmergency")}
                  className="w-5 h-5 mt-0.5 rounded-md text-rose-600 focus:ring-rose-500 border-slate-300 cursor-pointer shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 text-sm">
                    Emergency Contact
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    This person will be notified immediately during urgent
                    situations.
                  </p>
                </div>
              </label>
            </form>
          </Modal>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── Contact Card ───────────────────────────────────────── */
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
        "bg-white p-3.5 sm:p-4 rounded-2xl border shadow-xs flex flex-col justify-between gap-3 transition-shadow hover:shadow-sm",
        contact.isEmergency
          ? "border-rose-200 bg-gradient-to-br from-white to-rose-50/30"
          : "border-slate-200",
      )}
    >
      <div className="flex items-start gap-3">
        {/* Initials */}
        <div
          className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0",
            contact.isEmergency
              ? "bg-rose-500 text-white shadow-sm shadow-rose-500/25"
              : "bg-slate-100 text-slate-600",
          )}
        >
          {contact.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <h3 className="font-bold text-slate-900 text-sm truncate">
              {contact.name}
            </h3>
            {contact.isEmergency && (
              <Heart
                size={11}
                className="text-rose-500 fill-rose-500 shrink-0"
              />
            )}
          </div>
          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-2 truncate">
            {contact.relationship}
          </p>
          <a
            href={`tel:${contact.phone}`}
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-colors",
              FOCUS,
            )}
          >
            <Phone size={10} />
            <span className="truncate">{contact.phone}</span>
          </a>
        </div>
      </div>

      <div className="flex items-center justify-end gap-1 pt-2 border-t border-slate-100 -mb-1 -mr-1">
        <button
          onClick={onEdit}
          className={cn(
            "p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-800 rounded-lg transition-colors min-h-9 min-w-9 inline-flex items-center justify-center",
            FOCUS,
          )}
          title="Edit"
          aria-label="Edit contact"
        >
          <Edit2 size={13} />
        </button>
        <button
          onClick={() =>
            confirm(
              "Are you sure you want to remove this person from your circle?",
            ) && onDelete()
          }
          className={cn(
            "p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors min-h-9 min-w-9 inline-flex items-center justify-center",
            FOCUS,
          )}
          title="Remove"
          aria-label="Remove contact"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </motion.div>
  );
}

/* ─── Form input ─────────────────────────────────────────── */
const FormInput = React.forwardRef(
  ({ label, error, ...props }: any, ref: any) => (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-0.5">
        {label}
      </label>
      <input
        ref={ref}
        {...props}
        className={cn(
          "w-full min-h-12 px-4 text-base sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 bg-slate-50 border rounded-xl outline-none transition-all",
          error
            ? "border-rose-300 bg-rose-50/40 focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
            : "border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15",
        )}
      />
      {error && (
        <p className="text-[11px] font-semibold text-rose-600 ml-0.5">
          {error}
        </p>
      )}
    </div>
  ),
);
FormInput.displayName = "FormInput";

/* ─── Modal — mobile sheet, sticky header/footer ─────────── */
const Modal = ({
  children,
  onClose,
  title,
  footer,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title?: string;
  footer?: React.ReactNode;
}) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center sm:p-4"
    onClick={onClose}
  >
    <motion.div
      initial={{ y: "30%", scale: 0.98, opacity: 0 }}
      animate={{ y: 0, scale: 1, opacity: 1 }}
      exit={{ y: "30%", scale: 0.98, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl max-h-[92dvh] sm:max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Drag handle (mobile) */}
      <div className="sm:hidden flex justify-center pt-3 shrink-0" aria-hidden>
        <div className="w-10 h-1 rounded-full bg-slate-300" />
      </div>

      {/* Sticky header */}
      <div className="shrink-0 flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-slate-100">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">
          {title}
        </h2>
        <button
          onClick={onClose}
          aria-label="Close"
          className={cn(
            "shrink-0 w-9 h-9 inline-flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors",
            FOCUS,
          )}
        >
          <X size={16} strokeWidth={2.5} />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto overscroll-contain custom-emerald-scrollbar">
        <div className="p-4 sm:p-6">{children}</div>
      </div>

      {/* Sticky footer */}
      {footer && (
        <div className="shrink-0 border-t border-slate-100 bg-white px-4 sm:px-6 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-4">
          {footer}
        </div>
      )}
    </motion.div>
  </motion.div>
);

/* ─── Empty state ────────────────────────────────────────── */
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="col-span-full py-12 px-4 bg-white border border-dashed border-slate-200 rounded-2xl text-center">
      <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-400">
        <Users size={24} />
      </div>
      <h3 className="text-base font-bold text-slate-900">
        Your Health Circle is Empty
      </h3>
      <p className="text-slate-500 text-xs mb-5 max-w-xs mx-auto mt-1 leading-relaxed">
        Add family, close friends, or your care team to stay safely connected.
      </p>
      <button
        onClick={onAdd}
        className={cn(
          "inline-flex items-center gap-1.5 min-h-11 px-5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm",
          FOCUS,
        )}
      >
        <UserPlus size={14} />
        Add First Contact
      </button>
    </div>
  );
}

/* ─── Skeleton grid ──────────────────────────────────────── */
function PanelSkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4 animate-pulse">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div
          key={idx}
          className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 flex flex-col justify-between gap-3 min-h-[150px]"
        >
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-slate-200 shrink-0" />
            <div className="flex-1 space-y-2 mt-0.5">
              <div className="h-3.5 bg-slate-200 rounded-md w-3/4" />
              <div className="h-2.5 bg-slate-100 rounded-md w-1/2" />
              <div className="pt-1.5">
                <div className="h-5 bg-slate-200/70 rounded-lg w-24" />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-1 pt-2 border-t border-slate-100">
            <div className="w-8 h-8 bg-slate-100 rounded-lg" />
            <div className="w-8 h-8 bg-slate-100 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}
