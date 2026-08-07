"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
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
  Circle,
  Clock,
  X,
  CheckCircle,
  ArrowRight,
} from "lucide-react";
import { useNotifications } from "../../hooks/useNotification";
import { useDashboard } from "../../DashboardContext";
import { cn } from "@/app/utils/utils";
import { poppins, bebasNeue } from "@/app/constants";
import {
  formatDistanceToNow,
  isToday,
  isYesterday,
  isThisWeek,
  format,
} from "date-fns";

export default function NotificationsPanel() {
  const { notifications, unreadCount, markAllAsRead, markAsRead } =
    useNotifications();
  const { setActivePanel, setShowPendingRequestPopup } = useDashboard();
  const [selectedNotification, setSelectedNotification] = useState<any | null>(
    null,
  );

  // If no notification selected, choose the first unread, or first overall
  React.useEffect(() => {
    if (notifications.length > 0 && !selectedNotification) {
      const firstUnread = notifications.find((n) => !n.read);
      setSelectedNotification(firstUnread || notifications[0]);
    }
  }, [notifications, selectedNotification]);

  const grouped = notifications.reduce(
    (groups, notification) => {
      const date = new Date(notification.timestamp);
      let key = "Earlier Updates";
      if (isToday(date)) key = "Today";
      else if (isYesterday(date)) key = "Yesterday";
      else if (isThisWeek(date, { weekStartsOn: 1 })) key = "This Week";

      if (!groups[key]) groups[key] = [];
      groups[key].push(notification);
      return groups;
    },
    {} as Record<string, typeof notifications>,
  );

  const ICON_MAP: Record<string, { icon: any; color: string; bg: string }> = {
    medication: { icon: Pill, color: "text-blue-600", bg: "bg-blue-50" },
    appointment: {
      icon: Calendar,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    challenge: { icon: Trophy, color: "text-amber-600", bg: "bg-amber-50" },
    health: { icon: Heart, color: "text-rose-600", bg: "bg-rose-50" },
    order: { icon: ShoppingBag, color: "text-orange-600", bg: "bg-orange-50" },
    family: { icon: Users, color: "text-indigo-600", bg: "bg-indigo-50" },
    medic: {
      icon: Stethoscope,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    default: { icon: Activity, color: "text-slate-600", bg: "bg-slate-50" },
  };

  const handleNotificationClick = (notification: any) => {
    setSelectedNotification(notification);
  };

  const handleMarkAsRead = async (id: string) => {
    await markAsRead([id]);
    if (selectedNotification?.id === id) {
      setSelectedNotification({ ...selectedNotification, read: true });
    }
  };

  const handleNavigate = (link: string) => {
    if (link === "pending-request") {
      setShowPendingRequestPopup(true);
    } else if (link) {
      setActivePanel(link as any);
    }
  };

  // Mobile: show detail as overlay (slide-up)
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  const handleMobileSelect = (notification: any) => {
    setSelectedNotification(notification);
    setMobileDetailOpen(true);
  };

  const closeMobileDetail = () => {
    setMobileDetailOpen(false);
  };

  // Render list item
  const renderNotificationItem = (notification: any) => {
    const config = ICON_MAP[notification.type] || ICON_MAP.default;
    const Icon = config.icon;
    return (
      <motion.div
        key={notification.id}
        layout
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={() =>
          window.innerWidth < 768
            ? handleMobileSelect(notification)
            : handleNotificationClick(notification)
        }
        className={cn(
          "group bg-white border border-slate-100 rounded-[24px] p-5 transition-all cursor-pointer relative overflow-hidden",
          selectedNotification?.id === notification.id &&
            window.innerWidth >= 768
            ? "ring-2 ring-emerald-500 shadow-md"
            : "",
          !notification.read
            ? "hover:shadow-md border-emerald-100"
            : "opacity-70 hover:opacity-100",
        )}
      >
        {!notification.read && (
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
        )}
        <div className="flex gap-5 items-start">
          <div
            className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110",
              config.bg,
              config.color,
            )}
          >
            <Icon size={24} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start mb-1 gap-2">
              <h3 className="font-bold text-slate-900 text-sm md:text-base truncate group-hover:text-emerald-600 transition-colors">
                {notification.title}
              </h3>
              <div className="flex items-center gap-1.5 shrink-0 text-slate-400 font-bold text-[9px] uppercase tracking-tighter">
                <Clock size={10} />
                {formatDistanceToNow(new Date(notification.timestamp), {
                  addSuffix: true,
                })}
              </div>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed mb-3 line-clamp-2">
              {notification.message}
            </p>
            <div className="flex items-center justify-between">
              {notification.link ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                  {notification.link === "pending-request"
                    ? "Show OTP"
                    : "Navigate"}{" "}
                  <ChevronRight size={12} />
                </span>
              ) : (
                <div />
              )}
              {!notification.read && (
                <div className="flex items-center gap-1">
                  <Circle
                    size={6}
                    className="fill-emerald-500 text-emerald-500"
                  />
                  <span className="text-[9px] font-bold text-emerald-500 uppercase">
                    New
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  // Detail panel content
  const renderDetailPanel = () => {
    if (!selectedNotification) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-slate-400">
          <Inbox className="w-16 h-16 mb-4 text-slate-300" />
          <p className="text-sm font-semibold">Select a notification</p>
        </div>
      );
    }
    const config = ICON_MAP[selectedNotification.type] || ICON_MAP.default;
    const Icon = config.icon;

    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center gap-4 mb-6">
          <div
            className={cn(
              "w-16 h-16 rounded-2xl flex items-center justify-center",
              config.bg,
              config.color,
            )}
          >
            <Icon size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {selectedNotification.type || "Update"}
            </p>
            <p className="text-sm font-semibold text-slate-500">
              {format(
                new Date(selectedNotification.timestamp),
                "EEEE, MMMM d, yyyy • h:mm a",
              )}
            </p>
          </div>
        </div>

        <div className="space-y-2 mb-6">
          <h3 className="text-xl font-bold text-slate-900">
            {selectedNotification.title}
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
            {selectedNotification.message}
          </p>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <span
            className={cn(
              "text-xs font-bold px-3 py-1.5 rounded-full",
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
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition"
            >
              Mark as read
            </button>
          )}
        </div>

        <div className="pt-4 border-t border-slate-100 space-y-3 mt-auto">
          {selectedNotification.link && (
            <button
              onClick={() => handleNavigate(selectedNotification.link)}
              className="w-full flex items-center justify-between px-5 py-3 bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-100 transition font-semibold text-sm"
            >
              <span>
                {selectedNotification.link === "pending-request"
                  ? "View Pending Request"
                  : "Go to Panel"}
              </span>
              <ArrowRight size={18} />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      className={cn(
        "min-h-screen bg-[#F8FAFC] pb-32 pt-6 flex flex-col",
        poppins.className,
      )}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6 w-full flex-1 flex flex-col">
        {/* ─── HEADER ─────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-8 w-1 rounded-full bg-gradient-to-b from-emerald-500 to-teal-600" />
              <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-[0.25em]">
                Activity Feed
              </span>
            </div>
            <h1
              className={cn(
                "text-4xl md:text-5xl text-slate-900 leading-[1.1] tracking-tight",
                bebasNeue.className,
              )}
            >
              Notifications
            </h1>
            <p className="text-sm text-slate-600 mt-2">
              {unreadCount > 0
                ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
                : "All caught up!"}
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-2 px-5 py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition shadow-sm whitespace-nowrap"
            >
              <CheckCircle size={16} />
              <span>Mark all as read</span>
            </button>
          )}
        </div>

        {/* ─── MASTER-DETAIL LAYOUT ────────────────────────────── */}
        <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-[500px]">
          {/* LEFT: List */}
          <div className="md:w-[45%] flex-shrink-0 overflow-y-auto space-y-6 pr-2">
            {notifications.length > 0 ? (
              Object.entries(grouped).map(([title, items]) => (
                <div key={title} className="space-y-4">
                  <div className="flex items-center gap-4 px-2">
                    <h2
                      className={cn(
                        "text-xl text-slate-400 tracking-wider",
                        bebasNeue.className,
                      )}
                    >
                      {title}
                    </h2>
                    <div className="h-px bg-slate-200 flex-1" />
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <AnimatePresence mode="popLayout">
                      {items.map((notification) =>
                        renderNotificationItem(notification),
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-20 bg-white border border-slate-100 rounded-[40px] shadow-sm">
                <div className="w-20 h-20 bg-slate-50 rounded-[24px] flex items-center justify-center mx-auto mb-6">
                  <Inbox className="w-10 h-10 text-slate-200" />
                </div>
                <h3
                  className={cn("text-3xl text-slate-900", bebasNeue.className)}
                >
                  NO PENDING ACTIONS
                </h3>
                <p className="text-slate-400 max-w-[240px] mx-auto text-xs font-medium leading-relaxed">
                  Your bio-sync feed is currently up to date. New alerts will
                  appear here.
                </p>
              </div>
            )}
          </div>

          {/* RIGHT: Detail Panel */}
          <div className="hidden md:flex md:w-[55%] bg-white rounded-[32px] border border-slate-200/60 p-6 shadow-sm flex-col overflow-y-auto">
            {renderDetailPanel()}
          </div>
        </div>
      </div>

      {/* ─── MOBILE DETAIL OVERLAY ───────────────────────────────── */}
      <AnimatePresence>
        {mobileDetailOpen && selectedNotification && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-40"
              onClick={closeMobileDetail}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 max-h-[85vh] bg-white rounded-t-[32px] shadow-2xl z-50 p-6 overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-4">
                <h2
                  className={cn(
                    "text-2xl font-bold text-slate-900",
                    bebasNeue.className,
                  )}
                >
                  Notification Details
                </h2>
                <button
                  onClick={closeMobileDetail}
                  className="p-2.5 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              {renderDetailPanel()}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
