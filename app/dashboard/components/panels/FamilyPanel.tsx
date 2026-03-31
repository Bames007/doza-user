"use client";

import React, { useState, useMemo } from "react";
import useSWR, { mutate } from "swr";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import {
  Plus,
  Trash2,
  Edit2,
  Phone,
  AlertCircle,
  Loader2,
  Users,
  HelpCircle,
  X,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  ShieldCheck,
  Heart,
  Info,
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
  const { data, isLoading } = useSWR("/api/family", authFetcher);
  const family: FamilyFriend[] = data?.success ? data.data : [];

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [helpSlide, setHelpSlide] = useState(0);

  const helpContent = [
    {
      title: "Primary Circle",
      text: "Trusted members who can view your basic health telemetry.",
    },
    {
      title: "SOS Responders",
      text: "Emergency contacts get instant alerts during critical events.",
    },
    {
      title: "Data Privacy",
      text: "Your health data is only shared with people you explicitly authorize.",
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

  if (isLoading)
    return (
      <div className="h-screen flex items-center justify-center bg-white animate-pulse text-[10px] font-black uppercase tracking-[0.3em]">
        Syncing Circle...
      </div>
    );

  return (
    <div
      className={cn("min-h-screen bg-[#F8FAFC] pb-32 pt-6", poppins.className)}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6 space-y-6">
        {/* --- HEADER --- */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 md:p-8 rounded-[32px] border border-slate-200/60 shadow-sm transition-all">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                Safety Protocol Active
              </p>
            </div>
            <h1
              className={cn(
                "text-4xl md:text-5xl text-slate-900 leading-none",
                bebasNeue.className,
              )}
            >
              DOZA <span className="text-emerald-600">FAMILY & FRIENDS</span>
            </h1>
            <p className="text-slate-500 font-medium text-xs md:text-sm mt-1">
              Manage your inner circle and emergency responders.
            </p>
          </div>

          <button
            onClick={() => {
              setEditingId(null);
              reset();
              setShowForm(true);
            }}
            className="w-full md:w-auto flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-slate-200"
          >
            <UserPlus size={16} />
            <span>Add Member</span>
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* LEFT: HELP & STATS (Mobile: Order 2) */}
          <div className="md:col-span-4 space-y-6 order-2 md:order-1">
            <div className="bg-emerald-600 rounded-[32px] p-8 text-white relative overflow-hidden shadow-xl min-h-[300px] flex flex-col">
              <div className="relative z-10 flex-1">
                <div className="flex items-center gap-2 mb-6">
                  <HelpCircle size={18} className="text-emerald-200" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-100">
                    Circle Guide
                  </span>
                </div>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={helpSlide}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                  >
                    <h3 className="text-2xl font-bold mb-2">
                      {helpContent[helpSlide].title}
                    </h3>
                    <p className="text-emerald-50 text-sm leading-relaxed opacity-90">
                      {helpContent[helpSlide].text}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="relative z-10 flex justify-between items-center mt-6 pt-4 border-t border-white/10">
                <div className="flex gap-2">
                  <button
                    onClick={() => setHelpSlide((s) => (s > 0 ? s - 1 : 2))}
                    className="p-2 bg-white/10 rounded-lg hover:bg-white/20"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    onClick={() => setHelpSlide((s) => (s < 2 ? s + 1 : 0))}
                    className="p-2 bg-white/10 rounded-lg hover:bg-white/20"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
                <span className="text-[10px] font-bold opacity-50">
                  {helpSlide + 1} / 3
                </span>
              </div>
              <Activity
                size={150}
                className="absolute -bottom-10 -right-10 text-white/5 pointer-events-none"
              />
            </div>

            <div className="bg-white border border-slate-200/60 rounded-[32px] p-6 flex items-center gap-4 shadow-sm">
              <div className="h-12 w-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500">
                <ShieldCheck size={24} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Network Security
                </p>
                <p className="text-sm font-bold text-slate-900 italic">
                  End-to-End Encrypted
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT: CONTACT LIST (Mobile: Order 1) */}
          <div className="md:col-span-8 space-y-6 order-1 md:order-2">
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
          </div>
        </div>
      </div>

      {/* --- FORM MODAL --- */}
      <AnimatePresence>
        {showForm && (
          <Modal
            onClose={() => setShowForm(false)}
            title={editingId ? "Update Member" : "New Member"}
          >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <FormInput
                label="Full Name"
                placeholder="e.g. John Doe"
                {...register("name")}
                error={errors.name?.message}
              />
              <FormInput
                label="Phone Number"
                placeholder="+1..."
                {...register("phone")}
                error={errors.phone?.message}
              />
              <FormInput
                label="Relationship"
                placeholder="e.g. Sister"
                {...register("relationship")}
                error={errors.relationship?.message}
              />

              <label className="flex items-center gap-4 p-5 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-white transition-all cursor-pointer has-[:checked]:border-rose-200 has-[:checked]:bg-rose-50/30">
                <input
                  type="checkbox"
                  {...register("isEmergency")}
                  className="w-5 h-5 rounded text-rose-600 focus:ring-rose-500 border-slate-300"
                />
                <div>
                  <p className="font-bold text-slate-900 text-xs uppercase tracking-tight">
                    Emergency Contact
                  </p>
                  <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mt-0.5">
                    Priority responder for SOS events
                  </p>
                </div>
              </label>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-4 font-bold text-slate-400 bg-slate-100 rounded-2xl text-[10px] uppercase tracking-widest"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-4 font-bold text-white bg-slate-900 rounded-2xl text-[10px] uppercase tracking-widest shadow-xl shadow-slate-200"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  ) : (
                    "Save Member"
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

/* --- SUB-COMPONENTS --- */

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
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm flex items-center gap-4 group transition-all hover:shadow-md",
        contact.isEmergency &&
          "border-rose-100 bg-gradient-to-br from-white to-rose-50/20",
      )}
    >
      <div
        className={cn(
          "w-16 h-16 rounded-2xl flex items-center justify-center font-black text-xl italic shadow-inner",
          contact.isEmergency
            ? "bg-rose-500 text-white"
            : "bg-slate-100 text-slate-400",
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
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-slate-900 truncate">{contact.name}</h3>
          {contact.isEmergency && (
            <Heart size={12} className="text-rose-500 fill-rose-500" />
          )}
        </div>
        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">
          {contact.relationship}
        </p>
        <a
          href={`tel:${contact.phone}`}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl text-[10px] font-bold text-slate-500 hover:bg-slate-900 hover:text-white transition-all"
        >
          <Phone size={12} /> {contact.phone}
        </a>
      </div>

      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onEdit}
          className="p-2 hover:bg-slate-100 text-slate-400 hover:text-emerald-600 rounded-lg"
        >
          <Edit2 size={14} />
        </button>
        <button
          onClick={() => confirm("Remove contact?") && onDelete()}
          className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-lg"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </motion.div>
  );
}

const FormInput = React.forwardRef(
  ({ label, error, ...props }: any, ref: any) => (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 ml-1">
        {label}
      </label>
      <input
        ref={ref}
        {...props}
        className={cn(
          "w-full px-5 py-4 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-medium text-sm text-slate-900 placeholder:text-slate-300",
          error && "border-rose-500 bg-rose-50",
        )}
      />
    </div>
  ),
);

const Modal = ({ children, onClose, title }: any) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-end sm:items-center justify-center p-4"
    onClick={onClose}
  >
    <motion.div
      initial={{ y: 50, scale: 0.95 }}
      animate={{ y: 0, scale: 1 }}
      className="bg-white w-full max-w-lg rounded-[32px] p-8 shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between items-center mb-6">
        <h2
          className={cn(
            "text-3xl font-black text-slate-900 uppercase italic leading-none",
            bebasNeue.className,
          )}
        >
          {title}
        </h2>
        <button
          onClick={onClose}
          className="p-2 bg-slate-50 rounded-full hover:bg-rose-50 hover:text-rose-500 transition-colors"
        >
          <X size={18} />
        </button>
      </div>
      {children}
    </motion.div>
  </motion.div>
);

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="col-span-full py-20 bg-white border border-dashed border-slate-200 rounded-[32px] text-center">
      <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-200">
        <Users size={32} />
      </div>
      <h3 className="text-lg font-bold text-slate-900">Your circle is empty</h3>
      <p className="text-slate-400 text-xs mb-8 max-w-xs mx-auto">
        Establish secure connections with family and friends.
      </p>
      <button
        onClick={onAdd}
        className="bg-slate-900 text-white px-8 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-lg"
      >
        Establish Connection
      </button>
    </div>
  );
}
