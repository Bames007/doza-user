"use client";

import { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Float,
  MeshDistortMaterial,
  PerspectiveCamera,
} from "@react-three/drei";
import * as THREE from "three";
import {
  ChevronDown,
  ChevronUp,
  Mail,
  Send,
  Loader2,
  X,
  MessageCircle,
  Phone,
  Search,
  LifeBuoy,
  BookOpen,
  ArrowRight,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authPost } from "@/app/utils/client-auth";
import { cn } from "@/app/utils/utils";
import { poppins, bebasNeue } from "@/app/constants";

// --- THREE.JS COMPONENTS ---
function MedicalCross() {
  const meshRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.5;
  });

  return (
    <group ref={meshRef}>
      {/* Vertical Bar */}
      <mesh>
        <boxGeometry args={[0.5, 1.5, 0.5]} />
        <meshStandardMaterial
          color="#10b981"
          emissive="#059669"
          emissiveIntensity={0.5}
        />
      </mesh>
      {/* Horizontal Bar */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[0.5, 1.5, 0.5]} />
        <meshStandardMaterial
          color="#10b981"
          emissive="#059669"
          emissiveIntensity={0.5}
        />
      </mesh>
    </group>
  );
}

function MedicalScene() {
  return (
    <div className="w-full h-full min-h-[300px]">
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 0, 4]} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <Float speed={2} rotationIntensity={1} floatIntensity={2}>
          <MedicalCross />
        </Float>
      </Canvas>
    </div>
  );
}

// --- DATA & SCHEMAS ---
const faqs = [
  {
    category: "System Navigation",
    questions: [
      {
        q: "How do I add health records?",
        a: 'Navigate to the Health Tracker module and click "Add Record". Fill in the clinical details and sync to your profile.',
      },
      {
        q: "Can I share my data with family?",
        a: "Yes. Within Core Settings, you can authorize family members to view specific health data streams.",
      },
    ],
  },
  {
    category: "Medical Services",
    questions: [
      {
        q: "How do I book an appointment?",
        a: "Visit the Doza Medics portal, filter by specialization, and select an available slot for booking.",
      },
      {
        q: "How do I cancel an appointment?",
        a: "Locate your scheduled slot in the Appointments panel and initiate the 'Revoke' action.",
      },
    ],
  },
];

const supportSchema = z.object({
  name: z.string().min(1, "Identity required"),
  email: z.string().email("Invalid communication address"),
  message: z.string().min(10, "Detail required (min 10 chars)"),
});

type SupportForm = z.infer<typeof supportSchema>;

export default function HelpPanel() {
  const [searchQuery, setSearchQuery] = useState("");
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const filteredFaqs = useMemo(() => {
    if (!searchQuery) return faqs;
    return faqs
      .map((cat) => ({
        ...cat,
        questions: cat.questions.filter(
          (q) =>
            q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
            q.a.toLowerCase().includes(searchQuery.toLowerCase()),
        ),
      }))
      .filter((cat) => cat.questions.length > 0);
  }, [searchQuery]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SupportForm>({
    resolver: zodResolver(supportSchema),
  });

  const onSubmit = async (data: SupportForm) => {
    try {
      const result = await authPost("/api/support", data);
      if (result.success) {
        setSubmitted(true);
        reset();
        setTimeout(() => setSubmitted(false), 5000);
      }
    } catch {
      alert("Transmission failed");
    }
  };

  return (
    <div
      className={cn("min-h-screen bg-[#F8FAFC] pb-40 pt-6", poppins.className)}
    >
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        {/* --- HERO SECTION --- */}
        <section className="relative rounded-[32px] md:rounded-[40px] bg-slate-900 overflow-hidden mb-12 shadow-2xl border border-white/5">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-emerald-500/10 to-transparent" />

          <div className="relative z-10 p-8 md:p-16 flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="flex-1 text-center lg:text-left w-full">
              <div className="flex items-center gap-2 mb-6 justify-center lg:justify-start">
                <span className="h-[2px] w-6 bg-emerald-500" />
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em]">
                  Support Protocol
                </span>
              </div>
              <h1
                className={cn(
                  "text-5xl md:text-7xl lg:text-8xl text-white mb-8 leading-[0.9]",
                  bebasNeue.className,
                )}
              >
                HOW CAN WE <span className="text-emerald-500">ASSIST?</span>
              </h1>

              <div className="relative max-w-xl group mx-auto lg:mx-0">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" />
                <input
                  type="text"
                  placeholder="Search documentation..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-2xl py-5 pl-14 pr-6 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white/15 transition-all text-base"
                />
              </div>
            </div>

            {/* 3D Visual - Hidden on small mobile for performance */}
            <div className="hidden lg:block w-full lg:w-[400px] h-[300px]">
              <MedicalScene />
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* --- LEFT: FAQ ACCORDION --- */}
          <div className="lg:col-span-8 space-y-8 order-2 lg:order-1">
            <div className="flex items-end justify-between px-2">
              <div>
                <h2
                  className={cn("text-4xl text-slate-900", bebasNeue.className)}
                >
                  Knowledge Base
                </h2>
                <p className="text-sm text-slate-500 font-bold">
                  Common Inquiries & Resolutions
                </p>
              </div>
            </div>

            <div className="space-y-8">
              {filteredFaqs.map((category, catIdx) => (
                <div key={catIdx} className="space-y-4">
                  <h3 className="text-[11px] font-black text-emerald-600 uppercase tracking-[0.2em] flex items-center gap-2 ml-2">
                    <BookOpen size={14} /> {category.category}
                  </h3>
                  <div className="grid gap-3">
                    {category.questions.map((faq, qIdx) => {
                      const id = `${catIdx}-${qIdx}`;
                      const isOpen = openFaq === id;
                      return (
                        <div
                          key={qIdx}
                          className={cn(
                            "bg-white border rounded-[24px] transition-all duration-300",
                            isOpen
                              ? "border-emerald-500 shadow-xl shadow-emerald-500/5 ring-1 ring-emerald-500"
                              : "border-slate-200 hover:border-slate-300",
                          )}
                        >
                          <button
                            onClick={() => setOpenFaq(isOpen ? null : id)}
                            className="w-full flex items-center justify-between p-5 md:p-6 text-left"
                          >
                            <span className="font-bold text-slate-800 text-sm md:text-base pr-4 leading-tight">
                              {faq.q}
                            </span>
                            <div
                              className={cn(
                                "flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all",
                                isOpen
                                  ? "bg-emerald-500 text-white rotate-180"
                                  : "bg-slate-100 text-slate-500",
                              )}
                            >
                              <ChevronDown size={18} />
                            </div>
                          </button>
                          <AnimatePresence>
                            {isOpen && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="px-6 pb-6 pt-2 text-slate-600 text-sm md:text-base leading-relaxed border-t border-slate-50 mx-6">
                                  {faq.a}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* --- RIGHT: CONTACT SIDEBAR --- */}
          <div className="lg:col-span-4 order-1 lg:order-2">
            <div className="bg-white rounded-[32px] md:rounded-[40px] p-6 md:p-8 border border-slate-200 shadow-xl sticky top-8">
              <div className="mb-8 text-center">
                <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Send className="w-6 h-6 text-emerald-400 -rotate-12" />
                </div>
                <h2
                  className={cn("text-3xl text-slate-900", bebasNeue.className)}
                >
                  Direct Support
                </h2>
                <p className="text-emerald-600 text-[10px] font-black uppercase tracking-widest mt-1">
                  24/7 Response Guaranteed
                </p>
              </div>

              {submitted ? (
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  className="text-center py-10 bg-emerald-50 rounded-3xl border border-emerald-200"
                >
                  <Mail className="w-8 h-8 text-emerald-600 mx-auto mb-3" />
                  <p className="font-black text-emerald-900 text-[10px] uppercase tracking-widest px-4">
                    Ticket Synchronized
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">
                      Your Name
                    </label>
                    <input
                      {...register("name")}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-bold transition-all"
                    />
                    {errors.name && (
                      <p className="text-rose-600 text-[9px] font-bold ml-2 uppercase">
                        {errors.name.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      {...register("email")}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-bold transition-all"
                    />
                    {errors.email && (
                      <p className="text-rose-600 text-[9px] font-bold ml-2 uppercase">
                        {errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">
                      Detailed Inquiry
                    </label>
                    <textarea
                      {...register("message")}
                      rows={4}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-bold transition-all resize-none"
                    />
                    {errors.message && (
                      <p className="text-rose-600 text-[9px] font-bold ml-2 uppercase">
                        {errors.message.message}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl hover:bg-emerald-600 transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <span className="text-[11px] uppercase tracking-[0.2em]">
                          Open Ticket
                        </span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </form>
              )}

              <div className="mt-8 pt-6 border-t border-slate-100 flex justify-around text-slate-400">
                <Phone className="w-5 h-5 cursor-pointer hover:text-emerald-600 transition-colors" />
                <MessageCircle className="w-5 h-5 cursor-pointer hover:text-emerald-600 transition-colors" />
                <Mail className="w-5 h-5 cursor-pointer hover:text-emerald-600 transition-colors" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
