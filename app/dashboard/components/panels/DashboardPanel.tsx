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
} from "lucide-react";
import { useDashboard } from "../../DashboardContext";
import { authFetcher } from "@/app/utils/client-auth";
import { cn } from "@/app/utils/utils";
import { poppins, bebasNeue } from "@/app/constants";

const spring: Transition = {
  type: "spring",
  stiffness: 200,
  damping: 20,
};

export default function DashboardPanel() {
  const { user, isLoading: userLoading } = useUser();
  const { setActivePanel } = useDashboard();
  const [tipIndex, setTipIndex] = useState(0);

  // --- API DATA FETCHING ---
  const { data: healthRes } = useSWR("/api/health-records", authFetcher);
  const { data: medsRes } = useSWR("/api/medications/upcoming", authFetcher);
  const { data: apptRes } = useSWR("/api/appointments", authFetcher);
  const { data: challengeRes } = useSWR("/api/challenges?type=my", authFetcher);
  const { data: insightsRes } = useSWR("/api/health-insights", authFetcher);

  // --- LOGIC: APPOINTMENT FILTERING ---
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

  // --- LOGIC: CHALLENGE FILTERING ---
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

  // --- LOGIC: DATA MAPPING ---
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
      heartRate: getLatest("heartRate")?.value || "72",
      bp: getLatest("bloodPressure")?.value || "120/80",
      steps: getLatest("steps")?.value || "8,432",
      glucose: getLatest("weight")?.value || "94",
    };
  }, [healthRes]);

  const healthTips = useMemo(() => {
    return insightsRes?.success && insightsRes.data.length > 0
      ? insightsRes.data
      : [
          "Analyzing your bio-data...",
          "Consistency is key to health.",
          "Hydrate frequently.",
        ];
  }, [insightsRes]);

  if (userLoading) return <LoadingState />;

  return (
    <div
      className={cn("min-h-screen bg-[#F8FAFC] pb-32 pt-6", poppins.className)}
    >
      <div className="max-w-7xl mx-auto px-6 space-y-6">
        {/* --- HEADER --- */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-8 rounded-[32px] border border-slate-200/60 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                Bio-Sync Active
              </p>
            </div>
            <h1
              className={cn(
                "text-4xl md:text-5xl text-slate-900 leading-none",
                bebasNeue.className,
              )}
            >
              Welcome,{" "}
              <span className="text-emerald-600">
                {user?.fullName?.split(" ")[0]}
              </span>
            </h1>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setActivePanel("appointment")}
              className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all"
            >
              <History size={14} /> Records
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* LEFT COLUMN */}
          <div className="md:col-span-8 space-y-6">
            {/* LIVE BIOMETRICS GRID */}
            <BentoTile className="bg-white">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="text-emerald-500" size={20} /> Live
                  Biometrics
                </h3>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
                  val={stats.bp}
                  unit="mmHg"
                  color="text-amber-500"
                  bg="bg-amber-50"
                  hasChart
                />
                <StatCard
                  icon={Droplets}
                  label="Glucose"
                  val={stats.glucose}
                  unit="mg/dL"
                  color="text-emerald-500"
                  bg="bg-emerald-50"
                  hasChart
                />
                <StatCard
                  icon={Footprints}
                  label="Steps"
                  val={stats.steps}
                  unit="steps"
                  color="text-blue-500"
                  bg="bg-blue-50"
                />
              </div>
            </BentoTile>

            {/* JOINED CHALLENGES */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2 flex items-center gap-2">
                <Users size={14} /> Active Operations
              </h3>
              {joinedChallenges.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {joinedChallenges.map((c: any) => (
                    <JoinedChallengeCard
                      key={c.id}
                      challenge={c}
                      onClick={() => setActivePanel("challenges")}
                    />
                  ))}
                </div>
              ) : (
                <div className="p-10 border-2 border-dashed border-slate-200 rounded-[32px] text-center">
                  <p className="text-slate-400 text-sm italic">
                    No active joined challenges.
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* TARGET/MAIN CHALLENGE CARD */}
              <BentoTile className="bg-slate-900 text-white border-none relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                  <Trophy size={80} />
                </div>
                <div className="relative z-10 h-full flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                      Top Priority
                    </span>
                    <h4 className="text-2xl font-bold mt-2">
                      {joinedChallenges[0]?.name || "Initiate Protocol"}
                    </h4>
                  </div>
                  <div className="mt-8">
                    <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: joinedChallenges[0] ? "65%" : "20%" }}
                        className="h-full bg-emerald-500"
                      />
                    </div>
                    <button
                      onClick={() => setActivePanel("challenges")}
                      className="mt-6 flex items-center gap-2 text-white text-[10px] font-black uppercase tracking-widest hover:text-emerald-400 transition-colors"
                    >
                      Enter Challenge Hub <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </BentoTile>

              {/* MEDICATIONS PROTOCOL - HIGH CONTRAST */}
              <BentoTile className="bg-white border-slate-100 overflow-hidden group">
                <div className="flex justify-between items-start mb-6">
                  <div className="p-3 bg-blue-50 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors duration-500">
                    <Pill
                      className="text-blue-600 group-hover:text-white"
                      size={24}
                    />
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                      Active Cycle
                    </p>
                    <p className="text-sm font-bold text-blue-600 tracking-tight">
                      AM Dosage
                    </p>
                  </div>
                </div>
                <div className="space-y-1">
                  <h4 className="text-2xl font-black text-slate-900 leading-none">
                    {medsRes?.data?.[0]?.medicationName ||
                      "Medical Protocol Clear"}
                  </h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                    {medsRes?.data?.[0]?.dosage || "No Active Drugs"}
                  </p>
                </div>
                <button
                  onClick={() => setActivePanel("medications")}
                  className="w-full mt-8 py-4 bg-slate-900 text-white hover:bg-blue-700 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-slate-200"
                >
                  Manage Protocol <ArrowUpRight size={14} />
                </button>
              </BentoTile>
            </div>
          </div>

          {/* RIGHT SIDEBAR */}
          <div className="md:col-span-4 space-y-6">
            {/* UPCOMING APPOINTMENT CARD */}
            {upcomingAppt ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900 rounded-[32px] p-8 text-white relative overflow-hidden shadow-2xl"
              >
                <div className="relative z-10 h-full flex flex-col">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-2">
                      <Calendar size={18} className="text-emerald-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">
                        Deployment
                      </span>
                    </div>
                    <button
                      onClick={() => setActivePanel("appointment")}
                      className="text-[9px] font-bold text-slate-400 hover:text-white border border-slate-700 px-3 py-1 rounded-full uppercase tracking-tighter transition-all"
                    >
                      History
                    </button>
                  </div>
                  <AppointmentCountdown
                    targetDate={`${upcomingAppt.date}T${upcomingAppt.time}`}
                  />
                  <div className="mt-8 space-y-2">
                    <h4 className="text-2xl font-bold leading-none tracking-tight">
                      {upcomingAppt.medicName}
                    </h4>
                    <p className="text-sm text-slate-400 flex items-center gap-2 font-medium">
                      <Clock size={14} className="text-emerald-500" />{" "}
                      {upcomingAppt.date} @ {upcomingAppt.time}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-10">
                    <button
                      onClick={() => setActivePanel("doza-medics")}
                      className="py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all"
                    >
                      Check-In
                    </button>
                    <button
                      onClick={() => setActivePanel("appointment")}
                      className="py-4 bg-emerald-600 hover:bg-emerald-500 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                    >
                      Records <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
                <Activity className="absolute -right-8 -bottom-8 w-48 h-48 opacity-5" />
              </motion.div>
            ) : (
              <button
                onClick={() => setActivePanel("appointment")}
                className="w-full bg-white border border-slate-100 rounded-[32px] p-10 text-center flex flex-col items-center justify-center gap-4 group hover:border-emerald-200 transition-all shadow-sm"
              >
                <div className="h-16 w-16 rounded-[24px] bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-all">
                  <Calendar size={32} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Status: Standby
                  </p>
                  <p className="text-sm text-slate-900 font-bold mt-1">
                    Open Appointment History
                  </p>
                </div>
              </button>
            )}

            {/* CREATED CHALLENGES - HIGH CONTRAST BUTTONS */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2 flex items-center gap-2">
                <ShieldCheck size={14} /> Managed Operations
              </h3>
              {myCreatedChallenges.map((c: any) => (
                <div
                  key={c.id}
                  className="bg-white border border-slate-200 rounded-[32px] p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h4 className="font-bold text-slate-900 text-lg">
                        {c.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <p className="text-[10px] font-bold text-slate-400 uppercase">
                          {c.participantCount} Participants
                        </p>
                      </div>
                    </div>
                    <div className="h-10 w-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                      <Trophy size={18} />
                    </div>
                  </div>
                  <button
                    onClick={() => setActivePanel("challenges")}
                    className="w-full py-4 bg-slate-900 text-white hover:bg-emerald-600 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    Manage Operation
                  </button>
                </div>
              ))}
            </div>

            {/* INSIGHTS */}
            <div className="bg-emerald-600 rounded-[32px] p-8 text-white relative overflow-hidden h-[280px] shadow-xl">
              <ThreeBackground />
              <div className="relative z-10 h-full flex flex-col">
                <div className="flex items-center gap-2 mb-6">
                  <Lightbulb size={20} className="text-emerald-200" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-100">
                    Bio-Analysis
                  </span>
                </div>
                <div className="flex-1">
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={tipIndex}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-xl font-semibold leading-tight italic"
                    >
                      "{healthTips[tipIndex]}"
                    </motion.p>
                  </AnimatePresence>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() =>
                      setTipIndex((prev) =>
                        prev === 0 ? healthTips.length - 1 : prev - 1,
                      )
                    }
                    className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    onClick={() =>
                      setTipIndex((prev) => (prev + 1) % healthTips.length)
                    }
                    className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
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

function LiveBioChart({ color }: { color: string }) {
  const points = [40, 65, 45, 90, 55, 75, 40, 85, 50, 70];
  const hexToTailwind = (colorStr: string) => {
    if (colorStr.includes("rose")) return "bg-rose-500/40";
    if (colorStr.includes("amber")) return "bg-amber-500/40";
    if (colorStr.includes("emerald")) return "bg-emerald-500/40";
    return "bg-slate-500/40";
  };

  return (
    <div className="flex items-end gap-1 h-10 w-full mt-4 overflow-hidden px-1">
      {points.map((p, i) => (
        <motion.div
          key={i}
          initial={{ height: "10%" }}
          animate={{ height: `${p}%` }}
          transition={{
            repeat: Infinity,
            repeatType: "reverse",
            duration: 0.6 + Math.random(),
            delay: i * 0.08,
          }}
          className={cn("flex-1 rounded-full", hexToTailwind(color))}
        />
      ))}
    </div>
  );
}

function StatCard({ icon: Icon, label, val, unit, color, bg, hasChart }: any) {
  return (
    <div className="p-5 rounded-[24px] bg-slate-50 border border-slate-100 flex flex-col group hover:bg-white hover:shadow-xl transition-all duration-500">
      <div
        className={cn(
          "p-2.5 rounded-xl w-fit mb-4 transition-transform group-hover:scale-110 shadow-sm",
          bg,
        )}
      >
        <Icon size={18} className={color} />
      </div>
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1">
        {label}
      </span>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-black text-slate-900 tracking-tight">
          {val}
        </span>
        <span className="text-[10px] font-bold text-slate-400">{unit}</span>
      </div>
      {hasChart && <LiveBioChart color={color} />}
    </div>
  );
}

function AppointmentCountdown({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    const calculate = () => {
      const diff = +new Date(targetDate) - +new Date();
      if (diff <= 0) return setTimeLeft("Live Now");
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / 1000 / 60) % 60);
      setTimeLeft(`${d > 0 ? d + "d " : ""}${h}h ${m}m`);
    };
    calculate();
    const timer = setInterval(calculate, 60000);
    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <div className="flex flex-col">
      <span
        className={cn(
          "text-6xl font-black text-emerald-400 tracking-tighter leading-none",
          bebasNeue.className,
        )}
      >
        {timeLeft}
      </span>
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-2 ml-1">
        T-Minus to Session
      </span>
    </div>
  );
}

function JoinedChallengeCard({ challenge, onClick }: any) {
  return (
    <motion.div
      whileHover={{ x: 6 }}
      onClick={onClick}
      className="bg-white border border-slate-100 p-6 rounded-[32px] flex items-center justify-between cursor-pointer hover:shadow-md transition-all"
    >
      <div className="flex items-center gap-5">
        <div className="h-14 w-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-inner">
          <Target size={28} />
        </div>
        <div>
          <h4 className="text-lg font-bold text-slate-900 leading-tight">
            {challenge.name}
          </h4>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">
              Target: {challenge.targetValue} {challenge.targetUnit}
            </span>
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest underline decoration-emerald-200">
              Active Duty
            </span>
          </div>
        </div>
      </div>
      <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:text-emerald-500 transition-colors">
        <ChevronRight size={20} />
      </div>
    </motion.div>
  );
}

function ThreeBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!containerRef.current) return;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(300, 300);
    containerRef.current.appendChild(renderer.domElement);
    const geometry = new THREE.IcosahedronGeometry(1, 1);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.15,
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    camera.position.z = 2.5;
    const animate = () => {
      requestAnimationFrame(animate);
      mesh.rotation.y += 0.005;
      mesh.rotation.x += 0.002;
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
      className="absolute -right-16 -bottom-16 pointer-events-none opacity-40"
    />
  );
}

function BentoTile({ children, className, onClick }: any) {
  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={spring}
      onClick={onClick}
      className={cn(
        "p-8 rounded-[36px] border border-slate-100 transition-all cursor-pointer shadow-sm",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}

function LoadingState() {
  return (
    <div className="h-screen w-full flex items-center justify-center bg-white text-[12px] font-black uppercase tracking-[0.5em] animate-pulse text-emerald-600">
      Initializing Health OS...
    </div>
  );
}
