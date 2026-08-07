// app/dashboard/UserDashboardSidebar.tsx
"use client";

import { useDashboard } from "../DashboardContext";
import { useUserContext } from "../UserContext";
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
  Grid,
  ChevronRight,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNotifications } from "../hooks/useNotification";
import { bebasNeue, poppins } from "@/app/constants";
import { cn } from "@/app/utils/utils";

// ─── Custom Logo Icon for Doza Panel ──────────────────────────────
const LogoIcon = ({
  className,
  active,
  isMobile = false,
}: {
  className?: string;
  active?: boolean;
  isMobile?: boolean;
}) => {
  const iconColor = active ? "#ffffff" : isMobile ? "#ffffff" : "#059669";

  return (
    <div
      className={cn(
        "relative flex items-center justify-center transition-all duration-200",
        className,
      )}
      style={{
        width: 20,
        height: 20,
        backgroundColor: iconColor,
        maskImage: `url(/logo.png)`,
        maskSize: "contain",
        maskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskImage: `url(/logo.png)`,
        WebkitMaskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
      }}
    />
  );
};

// ─── Navigation Items ──────────────────────────────────────────────
const navigationItems = [
  { name: "Dashboard", panelId: "dashboard", icon: LayoutDashboard },
  { name: "Health Tracker", panelId: "health-tracker", icon: Heart },
  { name: "Medications", panelId: "medications", icon: Pill },
  { name: "Doza History", panelId: "doza-panel", icon: LogoIcon },
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

interface UserDashboardSidebarProps {
  isMobile: boolean;
}

export default function UserDashboardSidebar({
  isMobile,
}: UserDashboardSidebarProps) {
  const user = useUserContext();
  const { activePanel, setActivePanel } = useDashboard();
  const [isInactive, setIsInactive] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Dynamic slot for mobile bottom nav overflow choice
  const [overflowChoices, setOverflowChoices] = useState<
    typeof navigationItems
  >(() => [navigationItems[4]]);

  const { unreadCount } = useNotifications();

  // Mobile Inactivity Logic
  useEffect(() => {
    if (!isMobile) return;
    const resetTimer = () => {
      setIsInactive(false);
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = setTimeout(() => setIsInactive(true), 6000);
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

    const clickedItem = navigationItems.find(
      (item) => item.panelId === panelId,
    );
    if (
      clickedItem &&
      navigationItems.slice(4).some((item) => item.panelId === panelId)
    ) {
      setOverflowChoices([clickedItem]);
    }

    setShowMoreMenu(false);
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.clear();
    window.location.href = "/";
  };

  const renderIcon = (
    item: (typeof navigationItems)[0],
    isActive: boolean,
    size: number,
    className: string,
    isMobile: boolean,
  ) => {
    if (item.name === "Doza History") {
      return (
        <LogoIcon className={className} active={isActive} isMobile={isMobile} />
      );
    }
    const Icon = item.icon;
    return <Icon size={size} className={className} />;
  };

  // Loading state
  if (!user) {
    return (
      <div className="w-72 h-screen bg-white border-r border-emerald-100 animate-pulse" />
    );
  }

  // ─── MOBILE VIEW ──────────────────────────────────────────────────
  if (isMobile) {
    const primaryMobileItems = [
      ...navigationItems.slice(0, 3),
      overflowChoices[0],
    ];
    const hiddenOverflowItems = navigationItems.slice(4);

    return (
      <div className={poppins.className}>
        {/* ─── White Personalised Mobile Top Header ──────────────────── */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-200 px-4 h-16 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            {/* Avatar – tap to go to profile */}
            <button
              onClick={() => handleNavigation("profile")}
              className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 overflow-hidden shrink-0 active:scale-95 transition-all"
            >
              {user.avatar ? (
                <Image
                  src={user.avatar}
                  alt="Avatar"
                  width={40}
                  height={40}
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-emerald-600 text-white font-bold text-sm">
                  {user.fullName.charAt(0)}
                </div>
              )}
            </button>
            {/* Welcome text */}
            <div className="flex items-baseline gap-1.5 min-w-0">
              <span className="text-base font-normal text-slate-800">
                Welcome,
              </span>
              <span className="text-lg font-bold text-slate-900 truncate">
                {user.fullName.split(" ")[0]}
              </span>
            </div>
          </div>

          {/* Notification Bell on the right */}
          <button
            onClick={() => handleNavigation("notifications")}
            className="relative p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 active:scale-95 transition-all"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-white" />
            )}
          </button>
        </div>

        {/* Floating Capsule Bottom Nav */}
        <div
          className={`fixed bottom-5 left-4 right-4 z-50 transition-all duration-500 ${
            isInactive
              ? "opacity-30 translate-y-2 scale-98"
              : "opacity-100 translate-y-0"
          }`}
        >
          <div className="bg-emerald-600 backdrop-blur-2xl rounded-[2.2rem] p-2 flex items-center justify-around shadow-2xl shadow-emerald-950/20 border border-emerald-500/40">
            {primaryMobileItems.map((item) => {
              const isActive = activePanel === item.panelId;
              return (
                <button
                  key={item.panelId}
                  onClick={() => handleNavigation(item.panelId)}
                  className={`p-3.5 rounded-2xl transition-all duration-300 relative ${
                    isActive
                      ? "bg-white text-emerald-600 shadow-md scale-105"
                      : "text-white/80 hover:text-white"
                  }`}
                  title={item.name}
                >
                  {renderIcon(item, isActive, 20, "", true)}
                  {isActive && (
                    <motion.span
                      layoutId="activeIndicator"
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-emerald-600 rounded-full"
                    />
                  )}
                </button>
              );
            })}
            <button
              onClick={() => setShowMoreMenu(true)}
              className="p-3.5 rounded-2xl text-white/90 bg-emerald-700/60 hover:bg-emerald-700 active:scale-95 transition-all border border-emerald-500/30"
              title="More Features"
            >
              <Grid size={20} />
            </button>
          </div>
        </div>

        {/* Fullscreen Total Emerald Menu Sheet Overlay */}
        <AnimatePresence>
          {showMoreMenu && (
            <motion.div
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-0 z-[100] bg-emerald-600 backdrop-blur-3xl pt-20 p-6 flex flex-col justify-between overflow-y-auto custom-emerald-scrollbar"
            >
              {/* Overlay Top Bar */}
              <div className="flex items-center justify-between border-b border-emerald-500/40 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-700/60 border border-emerald-500/40 flex items-center justify-center">
                    <LogoIcon active={true} isMobile={true} />
                  </div>
                  <div>
                    <h3
                      className={`text-2xl font-bold text-white tracking-wide ${bebasNeue.className}`}
                    >
                      MORE FEATURES
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setShowMoreMenu(false)}
                  className="w-10 h-10 rounded-xl bg-emerald-700/60 hover:bg-emerald-700 text-white flex items-center justify-center transition-all border border-emerald-500/40"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Expanded Layout for Overflow Menu Items */}
              <div className="grid grid-cols-1 gap-3 my-6 flex-1 content-center py-4">
                {hiddenOverflowItems.map((item) => {
                  const isActive = activePanel === item.panelId;
                  return (
                    <button
                      key={item.panelId}
                      onClick={() => handleNavigation(item.panelId)}
                      className={cn(
                        "w-full flex items-center gap-4 py-4 px-5 rounded-2xl border transition-all group shadow-sm",
                        isActive
                          ? "bg-white border-white text-emerald-600 shadow-lg scale-[1.02]"
                          : "bg-emerald-700/40 border-emerald-500/30 text-white hover:bg-emerald-700/70 hover:border-emerald-400",
                      )}
                    >
                      <div
                        className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110",
                          isActive
                            ? "bg-emerald-600 text-white"
                            : "bg-emerald-800/80 text-white border border-emerald-500/40 shadow-xs",
                        )}
                      >
                        {renderIcon(item, isActive, 22, "", true)}
                      </div>
                      <div className="flex flex-col flex-1 min-w-0 text-left">
                        <span className="text-base font-semibold tracking-wide">
                          {item.name}
                        </span>
                        <span
                          className={cn(
                            "text-[10px] uppercase font-medium",
                            isActive
                              ? "text-emerald-500"
                              : "text-emerald-200/80",
                          )}
                        >
                          Navigate to {item.name}
                        </span>
                      </div>
                      <ChevronRight
                        size={18}
                        className={cn(
                          "opacity-60",
                          isActive ? "text-emerald-600" : "text-white",
                        )}
                      />
                    </button>
                  );
                })}
              </div>

              {/* Utility Bottom Actions inside Overlay */}
              <div className="pt-4 border-t border-emerald-500/40 flex items-center justify-between gap-3">
                <button
                  onClick={() => handleNavigation("settings")}
                  className="flex-1 py-4 bg-emerald-700/60 hover:bg-emerald-700 text-white border border-emerald-500/40 rounded-2xl text-xs font-semibold tracking-normal flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  <Settings size={18} />
                  <span>Settings</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 py-4 bg-red-600/80 hover:bg-red-600 text-white border border-red-500/40 rounded-2xl text-xs font-semibold tracking-normal flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  <LogOut size={18} />
                  <span>Logout</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ─── DESKTOP VIEW ──────────────────────────────────────────────────
  return (
    <div
      className={cn(
        "w-72 h-screen bg-white border-r border-emerald-100 flex flex-col sticky top-0 overflow-hidden shadow-xs",
        poppins.className,
      )}
    >
      {/* 1. Header & User Brand Profile Section */}
      <div className="p-6 pb-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500 border border-emerald-100 flex items-center justify-center shadow-md shadow-emerald-500/10">
            <LogoIcon active={true} isMobile={false} />
          </div>
          <div>
            <span
              className={`text-2xl font-bold text-emerald-600 tracking-normal leading-none ${bebasNeue.className}`}
            >
              DOZA
            </span>
            <p className="text-[9px] font-semibold text-emerald-500 uppercase tracking-wider leading-none mt-0.5">
              Personal Medic Assistant
            </p>
          </div>
        </div>

        {/* User Card */}
        <div className="bg-white hover:border-emerald-300 transition-all duration-200 rounded-[1.8rem] p-4 border border-emerald-100 shadow-xs">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 overflow-hidden flex items-center justify-center border border-emerald-100 shrink-0">
              {user.avatar ? (
                <Image
                  src={user.avatar}
                  alt="Avatar"
                  width={40}
                  height={40}
                  className="object-cover"
                />
              ) : (
                <span className="font-bold text-emerald-700 text-xs">
                  {user.fullName.charAt(0)}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate tracking-tight">
                {user.fullName}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                  {user.subscription || "PREMIUM"}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={() => handleNavigation("profile")}
            className="w-full py-2 bg-emerald-50/60 hover:bg-emerald-600 text-emerald-900 hover:text-white rounded-xl text-[10px] font-semibold tracking-wide border border-emerald-100 transition-all duration-200 flex items-center justify-center cursor-pointer shadow-2xs"
          >
            Account Settings
          </button>
        </div>
      </div>

      {/* 2. Main Navigation Items */}
      <div className="flex-1 px-4 overflow-y-auto custom-emerald-scrollbar py-2">
        <nav className="space-y-1.5 pr-1">
          <p className="text-[9px] font-semibold text-emerald-600/70 uppercase tracking-[0.2em] px-4 mb-2">
            Doza Menu
          </p>
          {navigationItems.map((item) => {
            const isActive = activePanel === item.panelId;
            return (
              <button
                key={item.name}
                onClick={() => handleNavigation(item.panelId)}
                className={cn(
                  "w-full flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-200 group cursor-pointer",
                  isActive
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 font-semibold"
                    : "text-slate-700 hover:bg-emerald-50/80 hover:text-slate-900 font-medium",
                )}
              >
                <div
                  className={cn(
                    "transition-transform group-hover:scale-110",
                    isActive
                      ? "text-white"
                      : "text-emerald-600 group-hover:text-emerald-700",
                  )}
                >
                  {renderIcon(item, isActive, 18, "", false)}
                </div>
                <span className="text-xs tracking-tight">{item.name}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="ml-auto w-1.5 h-4 bg-white/60 rounded-full"
                  />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* 3. Bottom Utility Menu Bar */}
      <div className="p-4 bg-white/50 border-t border-emerald-100">
        <div className="bg-emerald-600 rounded-[1.5rem] p-1.5 flex items-center justify-between shadow-lg shadow-emerald-950/20 border border-emerald-500/40">
          {bottomItems.map((item) => {
            const isActive = activePanel === item.panelId;
            return (
              <button
                key={item.id}
                onClick={() =>
                  item.action === "logout"
                    ? handleLogout()
                    : handleNavigation(item.panelId!)
                }
                className={cn(
                  "p-2.5 rounded-xl transition-all relative group cursor-pointer",
                  isActive
                    ? "bg-white text-emerald-600 shadow-md"
                    : "text-white hover:bg-emerald-700/60",
                )}
                title={item.label}
              >
                <item.icon size={16} strokeWidth={2.2} />
                {item.id === "notifications" && unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-400 rounded-full ring-2 ring-emerald-600" />
                )}
              </button>
            );
          })}
        </div>
        <p className="text-[8px] text-center text-slate-500 mt-3 font-semibold tracking-wider uppercase">
          Doza Health © 2026
        </p>
      </div>

      <style jsx global>{`
        .custom-emerald-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-emerald-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-emerald-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(16, 185, 129, 0.2);
          border-radius: 9999px;
        }
        .custom-emerald-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(16, 185, 129, 0.4);
        }
      `}</style>
    </div>
  );
}
