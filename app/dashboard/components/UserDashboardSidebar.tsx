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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNotifications } from "../hooks/useNotification";

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

const mainNav = navigationItems.slice(0, 4);
const moreNav = navigationItems.slice(4);

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
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  const { unreadCount } = useNotifications();

  // Inactivity timer for bottom bar labels
  useEffect(() => {
    if (!isMobile) return;

    const resetInactivityTimer = () => {
      setIsInactive(false);
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = setTimeout(() => setIsInactive(true), 10000);
    };

    const events = [
      "mousedown",
      "touchstart",
      "click",
      "scroll",
      "keydown",
      "mousemove",
      "touchmove",
    ];
    events.forEach((event) =>
      document.addEventListener(event, resetInactivityTimer, { passive: true }),
    );
    resetInactivityTimer();

    return () => {
      events.forEach((event) =>
        document.removeEventListener(event, resetInactivityTimer),
      );
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [isMobile]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target as Node)
      ) {
        setShowAccountMenu(false);
      }
      if (
        moreMenuRef.current &&
        !moreMenuRef.current.contains(event.target as Node)
      ) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNavigation = (panelId: string) => {
    setActivePanel(panelId as any);
    setShowAccountMenu(false);
    setShowMoreMenu(false);
    if (isMobile) {
      setIsInactive(false);
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = setTimeout(() => setIsInactive(true), 10000);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("userSession");
    localStorage.removeItem("loginTime");
    window.location.href = "/";
  };

  // ---------- Mobile Layout ----------
  if (isMobile) {
    return (
      <>
        {/* Top App Bar */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-green-600 to-emerald-700 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between px-4 h-16">
            {/* Left side: avatar + name + subscription (tappable to profile) */}
            <button
              onClick={() => handleNavigation("profile")}
              className="flex items-center gap-3 flex-1 min-w-0"
            >
              <div className="w-11 h-11 rounded-xl bg-white/20 overflow-hidden border-2 border-white/30 flex items-center justify-center shadow-md flex-shrink-0">
                {user.avatar ? (
                  <Image
                    src={user.avatar}
                    alt={user.fullName}
                    width={44}
                    height={44}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <span className="text-white font-bold text-xl">
                    {user.fullName.charAt(0)}
                  </span>
                )}
              </div>
              <div className="flex flex-col items-start min-w-0">
                <span className="text-white font-semibold text-sm leading-tight truncate w-full">
                  {user.fullName}
                </span>
                <div className="flex items-center gap-1 mt-0.5">
                  {user.subscription && (
                    <span className="text-[10px] bg-gradient-to-r from-emerald-400 to-green-500 text-white px-2 py-0.5 rounded-full shadow-sm">
                      {user.subscription}
                    </span>
                  )}
                  <span className="text-[10px] text-white/70">● Online</span>
                </div>
              </div>
            </button>

            {/* Right side: notification + three‑dot menu */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleNavigation("notifications")}
                className="w-11 h-11 flex items-center justify-center text-white rounded-xl active:bg-white/10 relative transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1 shadow-lg ring-2 ring-green-600 animate-pulse">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              <div className="relative" ref={accountMenuRef}>
                <button
                  onClick={() => setShowAccountMenu(!showAccountMenu)}
                  className="w-11 h-11 flex items-center justify-center text-white rounded-xl active:bg-white/10 transition-colors"
                  aria-label="Account menu"
                >
                  <MoreHorizontal className="w-5 h-5" />
                </button>

                <AnimatePresence>
                  {showAccountMenu && (
                    <>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-40"
                        onClick={() => setShowAccountMenu(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-14 w-64 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50"
                      >
                        <div className="p-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                          <p className="text-xs font-medium text-gray-600">
                            Signed in as
                          </p>
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {user.email}
                          </p>
                        </div>
                        <div className="p-2">
                          {bottomItems.map((item) => {
                            if (item.action === "logout") {
                              return (
                                <button
                                  key={item.id}
                                  onClick={() => {
                                    handleLogout();
                                    setShowAccountMenu(false);
                                  }}
                                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-all"
                                >
                                  <LogOut className="w-4 h-4" />
                                  <span>Logout</span>
                                </button>
                              );
                            } else {
                              const isActive = activePanel === item.panelId;
                              return (
                                <button
                                  key={item.id}
                                  onClick={() =>
                                    handleNavigation(item.panelId!)
                                  }
                                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                                    isActive
                                      ? "bg-emerald-50 text-emerald-700 font-medium"
                                      : "text-gray-700 hover:bg-gray-100"
                                  }`}
                                >
                                  <item.icon className="w-4 h-4" />
                                  <span>{item.label}</span>
                                </button>
                              );
                            }
                          })}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Tab Bar */}
        <div
          className={`fixed bottom-[2vh] left-3 right-3 z-40 transition-all duration-500 ${
            isInactive ? "scale-95 opacity-80" : "scale-100 opacity-100"
          }`}
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-green-700/90 via-green-600/90 to-green-500/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20" />
            <div className="relative flex items-center justify-around px-2 py-2">
              {/* First 4 main items */}
              {mainNav.map((item) => {
                const isActive = activePanel === item.panelId;
                const Icon = item.icon;

                return (
                  <button
                    key={item.name}
                    onClick={() => handleNavigation(item.panelId)}
                    className="relative flex-1 flex flex-col items-center justify-center py-1 touch-manipulation"
                  >
                    <div
                      className={`
                        transition-all duration-300 flex items-center justify-center
                        ${
                          isActive
                            ? "bg-white text-green-700 shadow-lg"
                            : "text-white/80"
                        }
                        rounded-xl p-2
                      `}
                    >
                      <Icon
                        className={`transition-all duration-300 ${
                          isActive
                            ? isInactive
                              ? "w-4 h-4"
                              : "w-5 h-5"
                            : isInactive
                              ? "w-4 h-4"
                              : "w-5 h-5"
                        }`}
                      />
                    </div>
                    {!isInactive && (
                      <span
                        className={`text-[10px] font-medium mt-1 transition-opacity duration-300 ${
                          isActive ? "text-white" : "text-white/70"
                        }`}
                      >
                        {item.name.split(" ")[0]}
                      </span>
                    )}
                    {isActive && (
                      <motion.div
                        layoutId="bottomTabIndicator"
                        className="absolute -top-1 w-1 h-1 bg-white rounded-full"
                      />
                    )}
                  </button>
                );
              })}

              {/* More button */}
              <div className="relative flex-1" ref={moreMenuRef}>
                <button
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  className="relative flex flex-col items-center justify-center py-1 w-full touch-manipulation"
                >
                  <div
                    className={`
                      transition-all duration-300 flex items-center justify-center
                      ${
                        showMoreMenu
                          ? "bg-white text-green-700 shadow-lg"
                          : "text-white/80"
                      }
                      rounded-xl p-2
                    `}
                  >
                    <Grid
                      className={`transition-all duration-300 ${
                        isInactive ? "w-4 h-4" : "w-5 h-5"
                      }`}
                    />
                  </div>
                  {!isInactive && (
                    <span
                      className={`text-[10px] font-medium mt-1 transition-opacity duration-300 ${
                        showMoreMenu ? "text-white" : "text-white/70"
                      }`}
                    >
                      More
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {showMoreMenu && (
                    <>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-40"
                        onClick={() => setShowMoreMenu(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute bottom-full right-0 mb-2 w-48 bg-gradient-to-b from-green-800 to-green-700 rounded-2xl shadow-2xl border border-green-600/50 backdrop-blur-xl overflow-hidden z-50"
                      >
                        <div className="p-2 space-y-1">
                          {moreNav.map((item) => {
                            const isActive = activePanel === item.panelId;
                            const Icon = item.icon;
                            return (
                              <button
                                key={item.panelId}
                                onClick={() => handleNavigation(item.panelId)}
                                className={`
                                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                                  text-sm font-medium transition-all duration-200
                                  ${
                                    isActive
                                      ? "bg-gradient-to-r from-green-600 to-emerald-500 text-white shadow-md"
                                      : "text-white/90 hover:bg-white/10 hover:text-white"
                                  }
                                `}
                              >
                                <Icon className="w-4 h-4" />
                                <span className="truncate">{item.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ---------- Desktop Layout (always expanded) ----------
  return (
    <div className="w-80 bg-gradient-to-b from-green-600 to-emerald-700 flex flex-col shadow-2xl border-r border-green-600/30 h-screen overflow-hidden">
      {/* Desktop header */}
      <div className="flex-shrink-0 p-6 border-b border-green-600/30 bg-green-700/20 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex flex-col space-y-4 w-full">
            {/* Logo and title */}
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white/80 rounded-2xl flex items-center justify-center shadow-lg border border-white/20">
                <Image
                  src="/logo.png"
                  alt="Doza"
                  width={28}
                  height={28}
                  className="rounded-lg"
                />
              </div>
              <div className="flex flex-col">
                <h1 className="text-white text-xl font-bold tracking-tight">
                  Doza
                </h1>
                <p className="text-green-100 text-sm font-medium">
                  Personal Health
                </p>
              </div>
            </div>

            {/* User profile card */}
            <div className="flex items-center space-x-3 pl-1 bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center border border-white/20">
                {user.avatar ? (
                  <Image
                    src={user.avatar}
                    alt={user.fullName}
                    width={36}
                    height={36}
                    className="rounded-lg object-cover"
                  />
                ) : (
                  <span className="text-lg font-bold text-white">
                    {user.fullName.charAt(0)}
                  </span>
                )}
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <h2 className="text-white font-semibold text-sm truncate drop-shadow-sm">
                  {user.fullName}
                </h2>
                <div className="flex items-center justify-between mt-1">
                  <div className="flex items-center space-x-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    <span className="text-green-100 text-xs font-medium">
                      Online
                    </span>
                  </div>
                  {user.subscription && (
                    <span className="text-xs px-2 py-0.5 bg-green-500/30 text-white rounded-full">
                      {user.subscription}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop navigation */}
      <div className="flex-1 overflow-y-auto py-6">
        <div className="px-5 space-y-2">
          {navigationItems.map((item) => {
            const isActive = activePanel === item.panelId;
            const Icon = item.icon;
            return (
              <button
                key={item.name}
                onClick={() => handleNavigation(item.panelId)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                  transition-all duration-200
                  ${
                    isActive
                      ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm font-medium">{item.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop bottom icons */}
      <div className="flex-shrink-0 border-t border-green-600/30 bg-green-700/20 backdrop-blur-sm p-3">
        <div className="flex items-center justify-around gap-1">
          {bottomItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.action !== "logout" && activePanel === item.panelId;
            if (item.action === "logout") {
              return (
                <button
                  key={item.id}
                  onClick={handleLogout}
                  className="p-2 rounded-xl transition-all duration-200 text-white/80 hover:bg-white/10 hover:text-white"
                  title={item.label}
                >
                  <Icon className="w-5 h-5" />
                </button>
              );
            } else {
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.panelId!)}
                  className={`p-2 rounded-xl transition-all duration-200 relative ${
                    isActive
                      ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                  title={item.label}
                >
                  <Icon className="w-5 h-5" />
                  {item.id === "notifications" && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1 shadow-lg ring-2 ring-white animate-pulse">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>
              );
            }
          })}
        </div>
      </div>
    </div>
  );
}
