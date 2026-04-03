"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import { useUser } from "@/app/dashboard/hooks/useProfile";
import useSWR from "swr";
import { motion, AnimatePresence, Transition } from "framer-motion";
import * as THREE from "three";
import {
  HeartPulse,
  Footprints,
  Activity,
  Pill,
  ArrowUpRight,
  Droplets,
  Lightbulb,
  ChevronRight,
  Trophy,
  ChevronLeft,
  TrendingUp,
  Target,
  ShieldCheck,
  Users,
  Calendar,
  Clock,
  History,
  ClipboardList,
} from "lucide-react";
import { useDashboard } from "../../DashboardContext";
import { authFetcher } from "@/app/utils/client-auth";
import { cn } from "@/app/utils/utils";
import { poppins, bebasNeue } from "@/app/constants";

const spring: Transition = {
  type: "spring",
  stiffness: 200,
  damping: 25,
};

export default function DashboardPanel() {
  const { user, isLoading: userLoading } = useUser();
  const { setActivePanel } = useDashboard();
  const [tipIndex, setTipIndex] = useState(0);

  const { data: healthRes } = useSWR("/api/health-records", authFetcher);
  const { data: medsRes } = useSWR("/api/medications/upcoming", authFetcher);
  const { data: apptRes } = useSWR("/api/appointments", authFetcher);
  const { data: challengeRes } = useSWR("/api/challenges?type=my", authFetcher);
  const { data: insightsRes } = useSWR("/api/health-insights", authFetcher);

  const upcomingAppt = useMemo(() => {
    if (!apptRes?.success || !apptRes.data) return null;
    return apptRes.data
      .filter(
        (a: any) =>
          a.status === "upcoming" ||
          new Date(`${a.date}T${a.time}`) > new Date(),
      )
      .sort(
        (a: any, b: any) =>
          new Date(`${a.date}T${a.time}`).getTime() -
          new Date(`${b.date}T${b.time}`).getTime(),
      )[0];
  }, [apptRes]);

  const { joinedChallenges, myCreatedChallenges } = useMemo(() => {
    const all = challengeRes?.data || [];
    const uid = user?.id;
    return {
      joinedChallenges: all.filter(
        (c: any) => c.creatorId !== uid && c.participants?.[uid as string],
      ),
      myCreatedChallenges: all.filter((c: any) => c.creatorId === uid),
    };
  }, [challengeRes, user]);

  const stats = useMemo(() => {
    const records = healthRes?.data || [];
    const getLatest = (type: string) =>
      records
        .filter((r: any) => r.type === type)
        .sort(
          (a: any, b: any) =>
            new Date(b.date).getTime() - new Date(a.date).getTime(),
        )[0];
    return {
      heartRate: getLatest("heartRate")?.value || "—",
      bloodPressure: getLatest("bloodPressure")?.value || "—",
      steps: getLatest("steps")?.value || "—",
      weight: getLatest("weight")?.value || "—",
    };
  }, [healthRes]);

  const recentEntries = useMemo(() => {
    const records = healthRes?.data || [];
    return [...records]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [healthRes]);

  const healthTips = useMemo(
    () => insightsRes?.data || ["Analyzing bio-data...", "Consistency is key."],
    [insightsRes],
  );

  if (userLoading) return <LoadingState />;

  return (
    <div
      className={cn(
        "min-h-screen bg-[#F8FAFC] pb-24 pt-4 md:pt-8",
        poppins.className,
      )}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6 space-y-5 md:space-y-8">
        {/* --- HEADER (Tighter Mobile Padding) --- */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 md:p-8 rounded-[28px] md:rounded-[32px] border border-slate-200/60 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Bio-Sync Active
              </p>
            </div>
            <h1
              className={cn(
                "text-3xl md:text-5xl text-slate-900",
                bebasNeue.className,
              )}
            >
              Welcome,{" "}
              <span className="text-emerald-600">
                {user?.fullName?.split(" ")[0]}
              </span>
            </h1>
          </div>
          <button
            onClick={() => setActivePanel("appointment")}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-900 text-white rounded-xl md:rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
          >
            <History size={14} /> View Records
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-6">
          <div className="md:col-span-8 space-y-5 md:space-y-6">
            {/* LIVE BIOMETRICS (Wider on Mobile) */}
            <BentoTile className="bg-white px-4 py-6 md:p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm md:text-lg font-black text-slate-900 flex items-center gap-2 uppercase tracking-tight">
                  <TrendingUp className="text-emerald-500" size={18} /> Live
                  Biometrics
                </h3>
                <button
                  onClick={() => setActivePanel("health-tracker")}
                  className="text-[10px] font-bold text-emerald-600"
                >
                  View Details
                </button>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <StatCard
                  icon={HeartPulse}
                  label="Heart Rate"
                  val={stats.heartRate}
                  unit="bpm"
                  color="text-rose-500"
                  bg="bg-rose-50"
                  hasChart
                />
                <StatCard
                  icon={Activity}
                  label="BP Status"
                  val={stats.bloodPressure}
                  unit="mmHg"
                  color="text-amber-500"
                  bg="bg-amber-50"
                  hasChart
                />
                <StatCard
                  icon={Droplets}
                  label="Weight"
                  val={stats.weight}
                  unit="kg"
                  color="text-emerald-500"
                  bg="bg-emerald-50"
                  hasChart
                />
                <StatCard
                  icon={Footprints}
                  label="Steps Today"
                  val={stats.steps}
                  unit="steps"
                  color="text-blue-500"
                  bg="bg-blue-50"
                />
              </div>
            </BentoTile>

            {/* RECENT ACTIVITY (High Contrast) */}
            <BentoTile className="bg-white px-4 py-6 md:p-8">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-sm md:text-lg font-black text-slate-900 flex items-center gap-2 uppercase tracking-tight">
                  <ClipboardList className="text-emerald-500" size={18} />{" "}
                  Activity Log
                </h3>
              </div>
              <div className="space-y-2.5">
                {recentEntries.map((entry, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center p-4 bg-slate-50/80 rounded-2xl border border-slate-100/50"
                  >
                    <div>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">
                        {new Date(entry.date).toLocaleDateString()}
                      </p>
                      <p className="text-base font-black text-slate-900">
                        {entry.value}{" "}
                        <span className="text-[10px] text-slate-400 font-medium">
                          unit
                        </span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-800 uppercase tracking-tight">
                        {entry.type}
                      </p>
                      <div className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[8px] font-black rounded-full uppercase mt-1">
                        Stored
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </BentoTile>

            {/* ACTIVE OPERATIONS (Tighter Font for Mobile) */}
            <div className="space-y-3">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-1 flex items-center gap-2">
                <Users size={14} /> Active Operations
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {joinedChallenges.map((c: any) => (
                  <JoinedChallengeCard
                    key={c.id}
                    challenge={c}
                    onClick={() => setActivePanel("challenges")}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR */}
          <div className="md:col-span-4 space-y-5 md:space-y-6">
            {upcomingAppt ? (
              <motion.div className="bg-slate-900 rounded-[28px] md:rounded-[32px] p-6 md:p-8 text-white relative overflow-hidden shadow-xl">
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-6">
                    <Calendar size={16} className="text-emerald-400" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                      Scheduled Deployment
                    </span>
                  </div>
                  <AppointmentCountdown
                    targetDate={`${upcomingAppt.date}T${upcomingAppt.time}`}
                  />
                  <div className="mt-6 space-y-1">
                    <h4 className="text-xl md:text-2xl font-bold tracking-tight">
                      {upcomingAppt.medicName}
                    </h4>
                    <p className="text-xs text-slate-400 flex items-center gap-2">
                      <Clock size={12} className="text-emerald-500" />{" "}
                      {upcomingAppt.date} at {upcomingAppt.time}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-8">
                    <button className="py-3.5 bg-white/10 hover:bg-white/20 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">
                      Check-In
                    </button>
                    <button className="py-3.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
                      Records <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : null}

            {/* INSIGHTS (Fixed height for Mobile) */}
            <div className="bg-emerald-600 rounded-[28px] md:rounded-[32px] p-6 md:p-8 text-white relative overflow-hidden min-h-[220px] shadow-lg">
              <ThreeBackground />
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Lightbulb size={18} className="text-emerald-200" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-100">
                      Bio-Analysis Insight
                    </span>
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={tipIndex}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-lg font-bold leading-tight italic"
                    >
                      "{healthTips[tipIndex]}"
                    </motion.p>
                  </AnimatePresence>
                </div>
                <div className="flex gap-2 mt-6">
                  <button
                    onClick={() =>
                      setTipIndex((p) =>
                        p === 0 ? healthTips.length - 1 : p - 1,
                      )
                    }
                    className="p-2.5 bg-white/10 rounded-lg"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    onClick={() =>
                      setTipIndex((p) => (p + 1) % healthTips.length)
                    }
                    className="p-2.5 bg-white/10 rounded-lg"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- SUBCOMPONENTS ---

function StatCard({ icon: Icon, label, val, unit, color, bg, hasChart }: any) {
  return (
    <div className="p-4 rounded-[22px] bg-slate-50/50 border border-slate-100 flex flex-col group active:scale-95 transition-all">
      <div className={cn("p-2 rounded-lg w-fit mb-3", bg)}>
        <Icon size={16} className={color} />
      </div>
      <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider mb-0.5">
        {label}
      </span>
      <div className="flex items-baseline gap-0.5">
        <span className="text-lg font-black text-slate-900 tracking-tighter">
          {val}
        </span>
        <span className="text-[8px] font-bold text-slate-400 uppercase">
          {unit}
        </span>
      </div>
      {hasChart && <LiveBioChart color={color} />}
    </div>
  );
}

function JoinedChallengeCard({ challenge, onClick }: any) {
  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-white border border-slate-100 p-4 md:p-6 rounded-[24px] md:rounded-[32px] flex items-center justify-between shadow-sm active:bg-slate-50 transition-all"
    >
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
          <Target size={24} />
        </div>
        <div>
          <h4 className="text-sm md:text-lg font-black text-slate-900 leading-tight uppercase tracking-tight">
            {challenge.name}
          </h4>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-full">
              Active Duty
            </span>
            <span className="text-[9px] font-bold text-slate-400 uppercase">
              Goal: {challenge.targetValue}
            </span>
          </div>
        </div>
      </div>
      <ChevronRight size={18} className="text-slate-300" />
    </motion.div>
  );
}

// Re-used helper components with minor responsive tweaks
function LiveBioChart({ color }: { color: string }) {
  const points = [40, 65, 45, 90, 55, 75, 40, 85];
  const hexToTailwind = (c: string) =>
    c.includes("rose")
      ? "bg-rose-500/40"
      : c.includes("amber")
        ? "bg-amber-500/40"
        : "bg-emerald-500/40";
  return (
    <div className="flex items-end gap-1 h-8 w-full mt-3 overflow-hidden">
      {points.map((p, i) => (
        <motion.div
          key={i}
          animate={{ height: `${p}%` }}
          transition={{
            repeat: Infinity,
            repeatType: "reverse",
            duration: 0.6 + Math.random(),
            delay: i * 0.05,
          }}
          className={cn("flex-1 rounded-full", hexToTailwind(color))}
        />
      ))}
    </div>
  );
}

function AppointmentCountdown({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    const calc = () => {
      const diff = +new Date(targetDate) - +new Date();
      if (diff <= 0) return setTimeLeft("Live");
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / 1000 / 60) % 60);
      setTimeLeft(`${d > 0 ? d + "d " : ""}${h}h ${m}m`);
    };
    calc();
    const timer = setInterval(calc, 60000);
    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <div className="flex flex-col">
      <span
        className={cn(
          "text-5xl md:text-6xl font-black text-emerald-400 tracking-tighter leading-none",
          bebasNeue.className,
        )}
      >
        {timeLeft}
      </span>
      <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mt-2">
        T-Minus to Session
      </span>
    </div>
  );
}

function ThreeBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!containerRef.current) return;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(200, 200);
    containerRef.current.appendChild(renderer.domElement);
    const geometry = new THREE.IcosahedronGeometry(1, 1);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.1,
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    camera.position.z = 2.5;
    const animate = () => {
      requestAnimationFrame(animate);
      mesh.rotation.y += 0.005;
      renderer.render(scene, camera);
    };
    animate();
    return () => {
      renderer.dispose();
      containerRef.current?.removeChild(renderer.domElement);
    };
  }, []);
  return (
    <div
      ref={containerRef}
      className="absolute -right-12 -bottom-12 pointer-events-none opacity-30"
    />
  );
}

function BentoTile({ children, className, onClick }: any) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={spring}
      onClick={onClick}
      className={cn(
        "rounded-[30px] border border-slate-100 shadow-sm transition-all",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}

function LoadingState() {
  return (
    <div className="h-screen w-full flex items-center justify-center bg-white text-[10px] font-black uppercase tracking-[0.5em] animate-pulse text-emerald-600 px-4 text-center">
      Initializing Health OS...
    </div>
  );
}
