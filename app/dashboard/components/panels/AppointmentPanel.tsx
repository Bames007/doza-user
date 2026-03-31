"use client";

import React, { useState } from "react";
import useSWR, { mutate } from "swr";
import { authFetcher } from "@/app/utils/client-auth";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Clock,
  FileText,
  Beaker,
  Pill,
  ChevronDown,
  XCircle,
  ShieldCheck,
  ArrowUpRight,
  Stethoscope,
  Activity,
  History as HistoryIcon,
} from "lucide-react";
import { cn } from "@/app/utils/utils";
import { poppins, bebasNeue } from "@/app/constants";

export default function AppointmentsPanel() {
  const { data: res, isLoading } = useSWR("/api/appointments", authFetcher);
  const appointments = res?.data || [];

  const upcoming = appointments.filter((a: any) => a.status === "upcoming");
  const history = appointments.filter((a: any) => a.status !== "upcoming");

  const cancelAppointment = async (id: string) => {
    if (!confirm("Confirm termination of this scheduled session?")) return;
    await fetch(`/api/appointments/${id}`, { method: "DELETE" });
    mutate("/api/appointments");
  };

  if (isLoading) return <LoadingState />;

  return (
    <div
      className={cn("min-h-screen bg-[#F8FAFC] pb-32 pt-6", poppins.className)}
    >
      <div className="max-w-7xl mx-auto px-6 space-y-8">
        {/* --- HEADER --- */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-8 rounded-[32px] border border-slate-200/60 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <HistoryIcon size={14} className="text-emerald-500" />
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                Clinical Archives
              </p>
            </div>
            <h1
              className={cn(
                "text-4xl md:text-5xl text-slate-900 leading-none",
                bebasNeue.className,
              )}
            >
              Medical <span className="text-emerald-600">Appoinment</span>
            </h1>
          </div>
          <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
            <button className="px-6 py-2.5 bg-white shadow-sm rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-900">
              Full History
            </button>
            <button className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">
              Documents
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT: UPCOMING SESSIONS */}
          <div className="lg:col-span-4 space-y-6">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600 px-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />{" "}
              Scheduled
            </h3>

            <div className="space-y-4">
              {upcoming.length > 0 ? (
                upcoming.map((appt: any) => (
                  <motion.div
                    key={appt.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-slate-900 rounded-[32px] p-8 text-white relative overflow-hidden shadow-xl group"
                  >
                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-6">
                        <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400 border border-emerald-500/20">
                          <Stethoscope size={24} />
                        </div>
                        <button
                          onClick={() => cancelAppointment(appt.id)}
                          className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 transition-all text-slate-500"
                        >
                          <XCircle size={20} />
                        </button>
                      </div>

                      <h4 className="text-2xl font-bold tracking-tight">
                        {appt.medicName}
                      </h4>
                      <p className="text-slate-400 text-sm font-medium mt-1 uppercase tracking-tighter">
                        {appt.reason}
                      </p>

                      <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-emerald-400 font-black text-xs">
                            <Calendar size={14} /> {appt.date}
                          </div>
                          <div className="flex items-center gap-2 text-slate-500 font-bold text-[10px] uppercase">
                            <Clock size={14} /> {appt.time}
                          </div>
                        </div>
                        <button className="h-12 w-12 bg-white text-slate-900 rounded-2xl flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all shadow-lg shadow-black/20">
                          <ArrowUpRight size={20} />
                        </button>
                      </div>
                    </div>
                    <Activity className="absolute -right-6 -bottom-6 w-32 h-32 opacity-5 pointer-events-none" />
                  </motion.div>
                ))
              ) : (
                <div className="bg-white border-2 border-dashed border-slate-200 rounded-[32px] p-12 text-center">
                  <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">
                    No Active Bookings
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: CONSULTATION HISTORY */}
          <div className="lg:col-span-8 space-y-6">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 px-2">
              Clinical Archive
            </h3>

            <div className="space-y-4">
              {history.length > 0 ? (
                history.map((appt: any) => (
                  <HistoryCard key={appt.id} appt={appt} />
                ))
              ) : (
                <div className="bg-white border border-slate-100 rounded-[32px] p-20 text-center shadow-sm">
                  <div className="h-16 w-16 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-4 text-slate-200">
                    <FileText size={32} />
                  </div>
                  <p className="text-slate-400 text-sm italic font-medium">
                    No historical consultations found in the ledger.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HistoryCard({ appt }: { appt: any }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white border border-slate-100 rounded-[32px] overflow-hidden transition-all hover:shadow-xl hover:border-emerald-100 shadow-sm">
      <div
        onClick={() => setExpanded(!expanded)}
        className="p-8 flex items-center justify-between cursor-pointer group"
      >
        <div className="flex items-center gap-6">
          <div
            className={cn(
              "h-14 w-14 rounded-2xl flex items-center justify-center transition-all",
              appt.status === "cancelled"
                ? "bg-rose-50 text-rose-500"
                : "bg-slate-50 text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-500",
            )}
          >
            {appt.status === "cancelled" ? (
              <XCircle size={28} />
            ) : (
              <ShieldCheck size={28} />
            )}
          </div>
          <div>
            <h4 className="text-xl font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
              {appt.medicName}
            </h4>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {appt.date}
              </p>
              <span className="h-1 w-1 rounded-full bg-slate-200" />
              <p className="text-[10px] font-bold text-emerald-600 uppercase">
                {appt.reason}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {appt.notes && (
            <span className="hidden md:block text-[9px] font-black bg-blue-50 text-blue-600 px-3 py-1 rounded-full uppercase tracking-tighter">
              Session Notes
            </span>
          )}
          <motion.div animate={{ rotate: expanded ? 180 : 0 }}>
            <ChevronDown size={24} className="text-slate-300" />
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="border-t border-slate-50 bg-[#FBFDFF]"
          >
            <div className="p-10 grid grid-cols-1 md:grid-cols-3 gap-10">
              {/* DOCTOR NOTES */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <FileText size={14} className="text-blue-500" /> Practitioner
                  Intel
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                  <p className="text-sm text-slate-600 leading-relaxed italic">
                    "
                    {appt.notes ||
                      "No clinical observations were logged for this session."}
                    "
                  </p>
                </div>
              </div>

              {/* LAB RESULTS */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <Beaker size={14} className="text-purple-500" />{" "}
                  Bio-Diagnostics
                </div>
                {appt.results ? (
                  <div className="p-5 bg-slate-900 text-emerald-400 rounded-2xl font-mono text-[11px] border border-slate-800 shadow-lg leading-relaxed">
                    {appt.results}
                  </div>
                ) : (
                  <div className="p-6 border-2 border-dashed border-slate-100 rounded-2xl text-center">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">
                      No Lab Records
                    </p>
                  </div>
                )}
              </div>

              {/* PRESCRIPTIONS */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <Pill size={14} className="text-rose-500" /> Protocol Meds
                </div>
                <div className="flex flex-col gap-2">
                  {appt.drugs?.length > 0 ? (
                    appt.drugs.map((drug: string, i: number) => (
                      <div
                        key={i}
                        className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-100 shadow-sm group/drug hover:border-rose-100 transition-all"
                      >
                        <span className="text-xs font-bold text-slate-700">
                          {drug}
                        </span>
                        <ArrowUpRight
                          size={12}
                          className="text-slate-300 group-hover/drug:text-rose-500"
                        />
                      </div>
                    ))
                  ) : (
                    <div className="py-4 text-xs text-slate-400 italic">
                      Protocol: Non-Medical
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* FOOTER ACTION */}
            <div className="px-10 pb-10">
              <button className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg">
                Export Clinical Report
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="h-screen w-full flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <div className="h-1 w-32 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="h-full w-1/2 bg-emerald-500"
          />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">
          Fetching Session...
        </p>
      </div>
    </div>
  );
}
