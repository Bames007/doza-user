// app/dashboard/components/panels/NotificationsPanel.tsx
"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Pill,
  Calendar,
  Trophy,
  Heart,
  ShoppingBag,
  Users,
  Stethoscope,
  Activity,
  ChevronRight,
  Inbox,
  Clock,
  X,
  CheckCircle,
  ArrowRight,
} from "lucide-react";
import { useNotifications } from "../../hooks/useNotification";
import { useDashboard } from "../../DashboardContext";
import { cn } from "@/app/utils/utils";
import { poppins } from "@/app/constants";
import {
  formatDistanceToNow,
  isToday,
  isYesterday,
  isThisWeek,
  format,
} from "date-fns";

/* ─── Type theme map ─────────────────────────────────────────── */
const TYPE_THEME: Record<
  string,
  {
    icon: any;
    color: string;
    bg: string;
    gradient: string;
    label: string;
  }
> = {
  medication: {
    icon: Pill,
    color: "text-blue-600",
    bg: "bg-blue-50",
    gradient: "from-blue-500 to-sky-400",
    label: "Medication",
  },
  appointment: {
    icon: Calendar,
    color: "text-purple-600",
    bg: "bg-purple-50",
    gradient: "from-purple-500 to-fuchsia-400",
    label: "Appointment",
  },
  challenge: {
    icon: Trophy,
    color: "text-amber-600",
    bg: "bg-amber-50",
    gradient: "from-amber-500 to-yellow-400",
    label: "Challenge",
  },
  health: {
    icon: Heart,
    color: "text-rose-600",
    bg: "bg-rose-50",
    gradient: "from-rose-500 to-pink-400",
    label: "Health",
  },
  order: {
    icon: ShoppingBag,
    color: "text-orange-600",
    bg: "bg-orange-50",
    gradient: "from-orange-500 to-amber-400",
    label: "Order",
  },
  family: {
    icon: Users,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    gradient: "from-indigo-500 to-violet-400",
    label: "Family",
  },
  medic: {
    icon: Stethoscope,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    gradient: "from-emerald-500 to-teal-400",
    label: "Care Team",
  },
  default: {
    icon: Activity,
    color: "text-slate-600",
    bg: "bg-slate-50",
    gradient: "from-slate-500 to-slate-400",
    label: "Update",
  },
};

function getTheme(type: string) {
  return TYPE_THEME[type] || TYPE_THEME.default;
}

export default function NotificationsPanel() {
  const { notifications, unreadCount, markAllAsRead, markAsRead } =
    useNotifications();
  const { setActivePanel, setShowPendingRequestPopup } = useDashboard();

  const [selectedNotification, setSelectedNotification] = useState<any | null>(
    null,
  );
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (!isMobile && notifications.length > 0 && !selectedNotification) {
      const firstUnread = notifications.find((n) => !n.read);
      setSelectedNotification(firstUnread || notifications[0]);
    }
  }, [notifications, selectedNotification, isMobile]);

  const grouped = notifications.reduce(
    (groups, notification) => {
      const date = new Date(notification.timestamp);
      let key = "Earlier";
      if (isToday(date)) key = "Today";
      else if (isYesterday(date)) key = "Yesterday";
      else if (isThisWeek(date, { weekStartsOn: 1 })) key = "This Week";

      if (!groups[key]) groups[key] = [];
      groups[key].push(notification);
      return groups;
    },
    {} as Record<string, typeof notifications>,
  );

  const handleSelect = (notification: any) => {
    setSelectedNotification(notification);
    if (isMobile) setMobileDetailOpen(true);
  };

  const handleMarkAsRead = async (id: string) => {
    await markAsRead([id]);
    if (selectedNotification?.id === id) {
      setSelectedNotification({ ...selectedNotification, read: true });
    }
  };

  const handleNavigate = (link: string) => {
    setMobileDetailOpen(false);
    if (link === "pending-request") {
      setShowPendingRequestPopup(true);
    } else if (link) {
      setActivePanel(link as any);
    }
  };

  /* ─── Notification card — no bar, no ring ─────────────── */
  const renderNotificationItem = (notification: any) => {
    const theme = getTheme(notification.type);
    const Icon = theme.icon;
    const isSelected =
      selectedNotification?.id === notification.id && !isMobile;

    return (
      <motion.button
        key={notification.id}
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={() => handleSelect(notification)}
        className={cn(
          "group w-full text-left relative rounded-2xl transition-all duration-200 p-3.5 sm:p-4",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2",
          notification.read
            ? "bg-white hover:bg-slate-50/70 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
            : "bg-emerald-50/40 hover:bg-emerald-50/70 shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
          isSelected && "shadow-md",
        )}
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
              theme.bg,
              theme.color,
            )}
          >
            <Icon size={18} className="sm:w-5 sm:h-5" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3
                className={cn(
                  "text-[13.5px] sm:text-sm leading-snug line-clamp-1 flex-1",
                  notification.read
                    ? "font-semibold text-slate-700"
                    : "font-bold text-slate-900",
                )}
              >
                {notification.title}
              </h3>
              {!notification.read && (
                <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-500" />
              )}
            </div>

            <p className="text-[12px] sm:text-xs text-slate-500 leading-relaxed line-clamp-2 mb-2">
              {notification.message}
            </p>

            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={cn(
                  "inline-flex items-center text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md",
                  theme.bg,
                  theme.color,
                )}
              >
                {theme.label}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                <Clock size={10} />
                {formatDistanceToNow(new Date(notification.timestamp), {
                  addSuffix: true,
                })}
              </span>
              {notification.link && (
                <span className="ml-auto inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600">
                  Open <ChevronRight size={11} />
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.button>
    );
  };

  /* ─── Detail content ───────────────────────────────────── */
  const renderDetailContent = () => {
    if (!selectedNotification) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-4">
            <Inbox className="w-8 h-8 text-slate-300" />
          </div>
          <p className="text-sm font-semibold text-slate-500">
            Select a notification
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Details will appear here
          </p>
        </div>
      );
    }

    const theme = getTheme(selectedNotification.type);
    const Icon = theme.icon;

    return (
      <div className="space-y-5">
        <div
          className={cn(
            "relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br",
            theme.gradient,
          )}
        >
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10" />
          <div className="absolute -bottom-10 -left-6 w-24 h-24 rounded-full bg-white/10" />
          <div className="relative flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shrink-0">
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/80">
                {theme.label}
              </p>
              <p className="text-sm font-semibold text-white mt-0.5">
                {format(
                  new Date(selectedNotification.timestamp),
                  "EEE, MMM d • h:mm a",
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2.5">
          <h3 className="text-xl font-bold text-slate-900 leading-tight">
            {selectedNotification.title}
          </h3>
          <p className="text-[13.5px] text-slate-600 leading-relaxed whitespace-pre-wrap">
            {selectedNotification.message}
          </p>
        </div>

        <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
          <span
            className={cn(
              "text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full",
              selectedNotification.read
                ? "bg-slate-100 text-slate-500"
                : "bg-emerald-50 text-emerald-700",
            )}
          >
            {selectedNotification.read ? "Read" : "Unread"}
          </span>
          {!selectedNotification.read && (
            <button
              onClick={() => handleMarkAsRead(selectedNotification.id)}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition inline-flex items-center gap-1"
            >
              <CheckCircle size={13} />
              Mark as read
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderDetailAction = () => {
    if (!selectedNotification?.link) return null;
    return (
      <button
        onClick={() => handleNavigate(selectedNotification.link)}
        className="w-full flex items-center justify-between px-4 py-3.5 bg-slate-900 text-white rounded-xl hover:bg-emerald-600 transition font-bold text-sm shadow-sm active:scale-[0.99]"
      >
        <span>
          {selectedNotification.link === "pending-request"
            ? "View Pending Request"
            : "Go to Panel"}
        </span>
        <ArrowRight size={16} />
      </button>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn("min-h-screen bg-[#F8FAFC] pb-28 pt-2", poppins.className)}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 space-y-4 lg:space-y-6">
        {/* ─── HEADER — matches Dashboard header pattern ───── */}
        <header className="pt-1 lg:pt-2 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight leading-tight">
              Notifications
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {unreadCount > 0
                ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
                : "All caught up!"}
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl font-semibold text-xs sm:text-sm hover:bg-emerald-600 transition shadow-sm whitespace-nowrap shrink-0"
            >
              <CheckCircle size={14} />
              <span>Mark all as read</span>
            </button>
          )}
        </header>

        {/* ─── MASTER-DETAIL ──────────────────────────────────── */}
        <div className="md:flex md:gap-5 md:items-start">
          {/* LIST — emerald scrollbar */}
          <div className="md:w-[42%] lg:w-[38%] md:shrink-0 md:max-h-[calc(100vh-2rem)] md:overflow-y-auto md:pr-2 pb-2 custom-emerald-scrollbar">
            {notifications.length > 0 ? (
              <div className="space-y-5">
                {Object.entries(grouped).map(([title, items]) => (
                  <div key={title} className="space-y-2.5">
                    <div className="flex items-center gap-3 px-1">
                      <h2 className="text-sm font-bold text-slate-700">
                        {title}
                      </h2>
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                        {items.length}
                      </span>
                      <div className="h-px bg-slate-200 flex-1" />
                    </div>
                    <div className="space-y-2">
                      <AnimatePresence mode="popLayout">
                        {items.map((notification) =>
                          renderNotificationItem(notification),
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white border border-slate-200/70 rounded-3xl shadow-sm">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Inbox className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  No notifications yet
                </h3>
                <p className="text-slate-400 max-w-[220px] mx-auto text-xs font-medium leading-relaxed mt-1">
                  Your feed is up to date. New alerts will appear here.
                </p>
              </div>
            )}
          </div>

          {/* DETAIL — emerald scrollbar on the body */}
          <div className="hidden md:flex md:flex-1 flex-col bg-white rounded-3xl border border-slate-200/70 shadow-sm md:max-h-[calc(100vh-2rem)] overflow-hidden">
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 custom-emerald-scrollbar">
              {renderDetailContent()}
            </div>
            {renderDetailAction() && (
              <div className="shrink-0 px-5 sm:px-6 py-4 border-t border-slate-100 bg-slate-50/60">
                {renderDetailAction()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── MOBILE BOTTOM SHEET ─────────────────────────────── */}
      <AnimatePresence>
        {mobileDetailOpen && selectedNotification && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setMobileDetailOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 280 }}
              className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white rounded-t-[28px] shadow-2xl flex flex-col max-h-[92dvh]"
            >
              <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-10 h-1 rounded-full bg-slate-300" />
              </div>

              <div className="flex items-center justify-between gap-3 px-4 py-2 shrink-0 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900 truncate">
                  Notification
                </h2>
                <button
                  onClick={() => setMobileDetailOpen(false)}
                  className="w-9 h-9 flex items-center justify-center bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200 active:scale-95 transition"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 custom-emerald-scrollbar">
                {renderDetailContent()}
              </div>

              {renderDetailAction() && (
                <div className="shrink-0 px-4 py-3 border-t border-slate-100 bg-white">
                  {renderDetailAction()}
                </div>
              )}

              <div className="shrink-0 pb-[max(0.5rem,env(safe-area-inset-bottom))]" />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
