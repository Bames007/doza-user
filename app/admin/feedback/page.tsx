"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Clock,
  User,
  Ghost,
  Star,
  Monitor,
  Mail,
  Phone,
  ExternalLink,
  Activity,
  MessageSquare,
  ShieldCheck,
  Camera,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/app/utils/utils";
import { bebasNeue, poppins } from "@/app/constants";

interface Feedback {
  id: string;
  rating?: number;
  text: string;
  screenshot?: string;
  anonymous: boolean;
  contact?: {
    name: string;
    email: string;
    phone: string;
  };
  timestamp: string;
}

export default function FeedbackAdmin() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        const res = await fetch("/api/feedback");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setFeedbacks(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setTimeout(() => setLoading(false), 1500);
      }
    };
    fetchFeedback();
  }, []);

  const stats = useMemo(() => {
    const total = feedbacks.length;
    const anon = feedbacks.filter((f) => f.anonymous).length;
    return { total, anon, identified: total - anon };
  }, [feedbacks]);

  if (loading) {
    return (
      <div
        className={cn(
          "min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center relative",
          poppins.className,
        )}
      >
        {/* Subtle Light Background Accents */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-50 rounded-full blur-[120px] opacity-60" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-50 rounded-full blur-[120px] opacity-60" />

        <div className="relative z-10 flex flex-col items-center">
          {/* Animated Scanner Core - Light Mode Edition */}
          <div className="relative w-28 h-28 mb-10">
            {/* Soft Ambient Pulse */}
            <motion.div
              animate={{ scale: [1, 1.15, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 rounded-[32px] bg-white shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100"
            />

            {/* Spinning Technical Ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="absolute inset-2 rounded-full border-2 border-dashed border-emerald-500/20 border-t-emerald-500"
            />

            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                animate={{ y: [-2, 2, -2] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Activity className="text-emerald-600 w-10 h-10 drop-shadow-sm" />
              </motion.div>
            </div>
          </div>

          {/* Loading Text & Progress */}
          <div className="text-center space-y-5">
            <div className="flex flex-col items-center">
              <h2 className="text-slate-900 font-black tracking-[0.2em] text-xs uppercase italic opacity-80">
                Diagnostic <span className="text-emerald-600">Active</span>
              </h2>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1.5 flex items-center gap-2">
                <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Syncing Admin Hub
              </p>
            </div>

            {/* Clean Progress Track */}
            <div className="w-40 h-[3px] bg-slate-200 rounded-full overflow-hidden shadow-inner">
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  ease: "circInOut",
                }}
                className="absolute inset-0 bg-emerald-500"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen bg-[#F8FAFC] pb-20", poppins.className)}>
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-md border border-slate-100">
              <img
                src="/logo.png"
                alt="Doza"
                className="w-6 h-6 object-contain"
              />
            </div>
            <div>
              <h1
                className={`${bebasNeue.className} text-2xl text-slate-900 tracking-tight leading-none`}
              >
                DOZA <span className="text-emerald-600">FEEDBACK</span>
              </h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Real-time user intelligence
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <StatMini
              label="Total"
              value={stats.total}
              color="bg-slate-100 text-slate-600"
            />
            <StatMini
              label="Identified"
              value={stats.identified}
              color="bg-emerald-100 text-emerald-700"
            />
            <StatMini
              label="Ghost"
              value={stats.anon}
              color="bg-slate-800 text-white"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-10">
        {feedbacks.length === 0 ? (
          <div className="h-[60vh] flex flex-col items-center justify-center bg-white rounded-[40px] border-2 border-dashed border-slate-200 shadow-sm">
            <MessageSquare size={48} className="text-slate-200 mb-4" />
            <p className="text-slate-400 font-medium tracking-tight">
              System standby. No incoming pulses detected.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
            {feedbacks.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group relative bg-white rounded-[32px] border border-slate-200 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col"
              >
                <div
                  className={cn(
                    "h-1.5 w-full",
                    item.anonymous ? "bg-slate-200" : "bg-emerald-500",
                  )}
                />

                {item.screenshot ? (
                  <div className="relative h-44 bg-slate-900 overflow-hidden cursor-zoom-in">
                    <img
                      src={item.screenshot}
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-500 group-hover:scale-110"
                      alt="User Environment"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
                    <div className="absolute bottom-3 left-4 flex items-center gap-2">
                      <div className="p-1.5 bg-white/10 backdrop-blur-md rounded-lg border border-white/20">
                        <Camera size={14} className="text-white" />
                      </div>
                      <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                        Interface Capture
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="h-2 bg-slate-50" />
                )}

                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-center mb-6">
                    <div
                      className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border flex items-center gap-1.5",
                        item.anonymous
                          ? "bg-slate-50 text-slate-500 border-slate-100"
                          : "bg-emerald-50 text-emerald-700 border-emerald-100",
                      )}
                    >
                      {item.anonymous ? (
                        <Ghost size={12} />
                      ) : (
                        <ShieldCheck size={12} />
                      )}
                      {item.anonymous ? "Secure Ghost" : "Verified Patient"}
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Clock size={12} />
                      <span className="text-[11px] font-bold">
                        {new Date(item.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="relative mb-6">
                    <p className="text-slate-900 font-semibold text-[15px] leading-relaxed italic">
                      "{item.text || "No verbal feedback provided."}"
                    </p>
                  </div>

                  {!item.anonymous && item.contact && (
                    <div className="mt-auto bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white rounded-lg border border-slate-200 flex items-center justify-center shadow-sm">
                          <User size={14} className="text-emerald-600" />
                        </div>
                        <span className="text-[13px] font-bold text-slate-900">
                          {item.contact.name || "Anonymous User"}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-1.5 pl-11">
                        <div className="flex items-center gap-2 text-slate-500 hover:text-emerald-600 transition-colors">
                          <Mail size={12} />
                          <span className="text-[11px] font-medium truncate">
                            {item.contact.email}
                          </span>
                        </div>
                        {item.contact.phone && (
                          <div className="flex items-center gap-2 text-slate-500 hover:text-emerald-600 transition-colors">
                            <Phone size={12} />
                            <span className="text-[11px] font-medium">
                              {item.contact.phone}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="mt-6 pt-4 border-t border-slate-50 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Monitor size={14} className="text-slate-300" />
                      <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                        Platform: DOZA_WEB_V2
                      </span>
                    </div>
                    <button className="text-slate-400 hover:text-slate-900 transition-colors">
                      <ExternalLink size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatMini({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div
      className={cn(
        "px-4 py-1.5 rounded-xl border border-slate-200/50 flex items-center gap-3 shadow-sm",
        color,
      )}
    >
      <span className="text-[10px] font-black uppercase tracking-tighter opacity-70">
        {label}
      </span>
      <span className="text-sm font-black italic">{value}</span>
    </div>
  );
}
