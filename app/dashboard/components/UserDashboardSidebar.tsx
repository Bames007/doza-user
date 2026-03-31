"use client";

import { useDashboard } from "../DashboardContext";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard,
  Heart,
  Users,
  Stethoscope,
  Map,
  User,
  Settings,
  HelpCircle,
  LogOut,
  Bell,
  Pill,
  Handshake,
  MoreHorizontal,
  Grid,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNotifications } from "../hooks/useNotification";
import { bebasNeue, poppins } from "@/app/constants";

const navigationItems = [
  { name: "Dashboard", panelId: "dashboard", icon: LayoutDashboard },
  { name: "Health Tracker", panelId: "health-tracker", icon: Heart },
  { name: "Medications", panelId: "medications", icon: Pill },
  { name: "Challenges", panelId: "challenges", icon: Handshake },
  { name: "Family & Friends", panelId: "family-friends", icon: Users },
  { name: "Doza Medics", panelId: "doza-medics", icon: Stethoscope },
  { name: "Doza Map", panelId: "doza-map", icon: Map },
];

const bottomItems = [
  { id: "profile", icon: User, label: "Profile", panelId: "profile" },
  {
    id: "notifications",
    icon: Bell,
    label: "Notifications",
    panelId: "notifications",
  },
  { id: "settings", icon: Settings, label: "Settings", panelId: "settings" },
  { id: "help", icon: HelpCircle, label: "Help", panelId: "help" },
  { id: "logout", icon: LogOut, label: "Logout", action: "logout" },
];

interface UserData {
  id: string;
  email: string;
  fullName: string;
  avatar?: string;
  subscription?: string;
}

interface UserDashboardSidebarProps {
  user: UserData;
  isMobile: boolean;
}

export default function UserDashboardSidebar({
  user,
  isMobile,
}: UserDashboardSidebarProps) {
  const { activePanel, setActivePanel } = useDashboard();
  const [isInactive, setIsInactive] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { unreadCount } = useNotifications();

  // Mobile Inactivity Logic
  useEffect(() => {
    if (!isMobile) return;
    const resetTimer = () => {
      setIsInactive(false);
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = setTimeout(() => setIsInactive(true), 5000);
    };
    const events = ["mousedown", "touchstart", "scroll"];
    events.forEach((e) =>
      document.addEventListener(e, resetTimer, { passive: true }),
    );
    return () =>
      events.forEach((e) => document.removeEventListener(e, resetTimer));
  }, [isMobile]);

  const handleNavigation = (panelId: string) => {
    setActivePanel(panelId as any);
    setShowMoreMenu(false);
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.clear();
    window.location.href = "/";
  };

  if (isMobile) {
    return (
      <div className={poppins.className}>
        {/* Mobile Top Bar */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-emerald-50 px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-md">
              <Image src="/logo.png" alt="L" width={18} height={18} />
            </div>
            <span
              className={`text-xl font-black text-emerald-600 ${bebasNeue.className}`}
            >
              DOZA
            </span>
          </div>
          <button
            onClick={() => handleNavigation("profile")}
            className="w-10 h-10 rounded-full bg-emerald-50 overflow-hidden border-2 border-emerald-500 shadow-sm"
          >
            {user.avatar ? (
              <Image src={user.avatar} alt="U" width={40} height={40} />
            ) : (
              <User size={20} className="m-auto mt-2 text-emerald-400" />
            )}
          </button>
        </div>

        {/* Floating Mobile Nav */}
        <div
          className={`fixed bottom-6 left-4 right-4 z-50 transition-all duration-500 ${isInactive ? "opacity-20 translate-y-4 scale-90" : "opacity-100 translate-y-0"}`}
        >
          <div className="bg-emerald-600 rounded-[2rem] p-2 flex items-center justify-around shadow-2xl shadow-emerald-900/20 border border-white/20">
            {navigationItems.slice(0, 4).map((item) => (
              <button
                key={item.panelId}
                onClick={() => handleNavigation(item.panelId)}
                className={`p-4 rounded-2xl transition-all ${activePanel === item.panelId ? "bg-white text-emerald-600 shadow-lg" : "text-emerald-100"}`}
              >
                <item.icon size={22} />
              </button>
            ))}
            <button
              onClick={() => setShowMoreMenu(true)}
              className="p-4 rounded-2xl text-emerald-100 bg-emerald-500/50"
            >
              <Grid size={22} />
            </button>
          </div>
        </div>

        {/* More Menu Overlay */}
        <AnimatePresence>
          {showMoreMenu && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-emerald-600/98 backdrop-blur-2xl p-8 flex flex-col justify-center gap-8"
            >
              <button
                onClick={() => setShowMoreMenu(false)}
                className="absolute top-10 right-8 text-white/60 hover:text-white"
              >
                <LogOut size={32} />
              </button>
              {navigationItems.slice(4).map((item) => (
                <button
                  key={item.panelId}
                  onClick={() => handleNavigation(item.panelId)}
                  className="flex items-center gap-6 text-white group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center group-active:bg-white group-active:text-emerald-600 transition-colors">
                    <item.icon size={28} />
                  </div>
                  <span className={`text-4xl font-bold ${bebasNeue.className}`}>
                    {item.name}
                  </span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ---------- DESKTOP VIEW ----------
  return (
    <div
      className={`w-72 h-screen bg-white border-r border-emerald-50 flex flex-col sticky top-0 overflow-hidden ${poppins.className}`}
    >
      {/* 1. Header Section */}
      <div className="p-6 pb-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10  rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
            <Image src="/logo.png" alt="Doza" width={22} height={22} />
          </div>
          <span
            className={`text-2xl font-black text-emerald-600 tracking-tighter ${bebasNeue.className}`}
          >
            DOZA
          </span>
        </div>

        <div className="bg-emerald-50/50 rounded-[2rem] p-4 border border-emerald-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-white shadow-sm overflow-hidden flex items-center justify-center border border-emerald-100">
              {user.avatar ? (
                <Image
                  src={user.avatar}
                  alt="A"
                  width={40}
                  height={40}
                  className="object-cover"
                />
              ) : (
                <span className="font-bold text-emerald-600 text-xs">
                  {user.fullName.charAt(0)}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-slate-900 truncate uppercase">
                {user.fullName}
              </p>
              <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">
                {user.subscription || "PREMIUM"}
              </p>
            </div>
          </div>
          <button
            onClick={() => handleNavigation("profile")}
            className="w-full py-2 bg-white rounded-lg text-[9px] font-black text-emerald-400 hover:text-emerald-600 hover:border-emerald-300 border border-emerald-100 transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            ACCOUNT SETTINGS <ChevronRight size={10} />
          </button>
        </div>
      </div>

      {/* 2. Main Navigation */}
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto no-scrollbar">
        <p className="text-[9px] font-black text-emerald-200 uppercase tracking-[0.2em] px-4 mb-3">
          Medical Suite
        </p>
        {navigationItems.map((item) => {
          const isActive = activePanel === item.panelId;
          return (
            <button
              key={item.name}
              onClick={() => handleNavigation(item.panelId)}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-300 group ${
                isActive
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200"
                  : "text-slate-500 hover:bg-emerald-50 hover:text-emerald-600"
              }`}
            >
              <item.icon
                size={18}
                className={
                  isActive
                    ? "text-white"
                    : "text-emerald-500/50 group-hover:text-emerald-600"
                }
              />
              <span className="text-xs font-bold">{item.name}</span>
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="ml-auto w-1 h-4 bg-white/40 rounded-full"
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* 3. Bottom Utility Menu */}
      <div className="p-4 mt-auto">
        <div className="bg-emerald-600 rounded-[1.5rem] p-1.5 flex items-center justify-between shadow-xl shadow-emerald-900/10 border border-white/10">
          {bottomItems.map((item) => (
            <button
              key={item.id}
              onClick={() =>
                item.action === "logout"
                  ? handleLogout()
                  : handleNavigation(item.panelId!)
              }
              className={`p-2.5 rounded-xl transition-all relative group
                ${activePanel === item.panelId ? "bg-white text-emerald-600" : "text-emerald-100 hover:text-white hover:bg-white/10"}`}
              title={item.label}
            >
              <item.icon size={16} />
              {item.id === "notifications" && unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-400 rounded-full border border-emerald-600" />
              )}
            </button>
          ))}
        </div>
        <p className="text-[8px] text-center text-emerald-600 mt-4 font-bold tracking-widest uppercase opacity-40">
          Doza Health © 2024
        </p>
      </div>
    </div>
  );
}
