"use client";

import React from "react";
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
} from "date-fns";

export default function NotificationsPanel() {
  const { notifications, unreadCount, markAllAsRead } = useNotifications();
  const { setActivePanel } = useDashboard();

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

  return (
    <div
      className={cn("min-h-screen bg-[#F8FAFC] pb-32 pt-6", poppins.className)}
    >
      <div className="max-w-3xl mx-auto px-4 md:px-6 space-y-8">
        {/* --- HEADER --- */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 md:p-8 rounded-[32px] border border-slate-200/60 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                Live Activity Feed
              </p>
            </div>
            <h1
              className={cn(
                "text-4xl md:text-5xl text-slate-900 leading-none",
                bebasNeue.className,
              )}
            >
              NOTIFICATIONS
            </h1>
            <p className="text-emerald-600 font-bold text-[10px] uppercase tracking-wider mt-1">
              {unreadCount > 0
                ? `Action Required: ${unreadCount} Unread`
                : "System Status: Nominal"}
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="w-full md:w-auto px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-200"
            >
              Clear All
            </button>
          )}
        </header>

        {/* --- CONTENT --- */}
        <div className="space-y-10">
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
                    {items.map((notification) => {
                      const config =
                        ICON_MAP[notification.type] || ICON_MAP.default;
                      const Icon = config.icon;

                      return (
                        <motion.div
                          key={notification.id}
                          layout
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          onClick={() =>
                            notification.link &&
                            setActivePanel(notification.link as any)
                          }
                          className={cn(
                            "group bg-white border border-slate-100 rounded-[24px] p-5 transition-all cursor-pointer relative overflow-hidden",
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
                                  {formatDistanceToNow(
                                    new Date(notification.timestamp),
                                    { addSuffix: true },
                                  )}
                                </div>
                              </div>

                              <p className="text-xs text-slate-500 leading-relaxed mb-3 line-clamp-2">
                                {notification.message}
                              </p>

                              <div className="flex items-center justify-between">
                                {notification.link ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                                    Navigate <ChevronRight size={12} />
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
                    })}
                  </AnimatePresence>
                </div>
              </div>
            ))
          ) : (
            /* --- EMPTY STATE --- */
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
      </div>
    </div>
  );
}
