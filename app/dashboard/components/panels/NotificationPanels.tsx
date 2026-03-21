"use client";

import { motion } from "framer-motion";
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
  Check,
  ChevronRight,
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

  // Group notifications by date
  const grouped = notifications.reduce(
    (groups, notification) => {
      const date = new Date(notification.timestamp);
      let key: string;
      if (isToday(date)) key = "Today";
      else if (isYesterday(date)) key = "Yesterday";
      else if (isThisWeek(date, { weekStartsOn: 1 })) key = "This Week";
      else key = "Earlier";
      if (!groups[key]) groups[key] = [];
      groups[key].push(notification);
      return groups;
    },
    {} as Record<string, typeof notifications>,
  );

  const handleNotificationClick = (notification: any) => {
    if (notification.link) {
      setActivePanel(notification.link as any);
    }
    // Optionally mark as read here (already handled when viewing panel)
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "medication":
        return Pill;
      case "appointment":
        return Calendar;
      case "challenge":
        return Trophy;
      case "health":
        return Heart;
      case "order":
        return ShoppingBag;
      case "family":
        return Users;
      case "medic":
        return Stethoscope;
      default:
        return Activity;
    }
  };

  const getIconBg = (type: string) => {
    switch (type) {
      case "medication":
        return "bg-blue-100 text-blue-600";
      case "appointment":
        return "bg-purple-100 text-purple-600";
      case "challenge":
        return "bg-yellow-100 text-yellow-600";
      case "health":
        return "bg-green-100 text-green-600";
      case "order":
        return "bg-orange-100 text-orange-600";
      case "family":
        return "bg-pink-100 text-pink-600";
      case "medic":
        return "bg-emerald-100 text-emerald-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "max-w-2xl mx-auto px-4 pb-28  min-h-screen",
        poppins.className,
      )}
    >
      {/* Header */}
      <div className="pt-6 pb-4 flex items-center justify-between">
        <div>
          <h1
            className={cn(
              "text-2xl sm:text-3xl font-bold text-gray-800",
              bebasNeue.className,
            )}
          >
            Notifications
          </h1>
          <p className="text-sm text-emerald-600 mt-1">
            Stay updated with your health and activities
          </p>
        </div>
      </div>

      {/* Mark all as read button - full width */}
      {unreadCount > 0 && (
        <button
          onClick={markAllAsRead}
          className="w-full mb-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-500 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition flex items-center justify-center gap-2"
        >
          <Check className="w-5 h-5" />
          Mark all as read ({unreadCount})
        </button>
      )}

      {/* Notifications list */}
      <div className="space-y-6">
        {Object.entries(grouped).map(([title, items]) => (
          <div key={title}>
            <h2
              className={cn(
                "text-sm font-semibold text-gray-500 mb-2",
                bebasNeue.className,
              )}
            >
              {title}
            </h2>
            <div className="space-y-2">
              {items.map((notification) => {
                const Icon = getIcon(notification.type);
                const iconBg = getIconBg(notification.type);
                return (
                  <motion.div
                    key={notification.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={cn(
                      "bg-white border border-gray-100 rounded-2xl p-3 shadow-sm hover:shadow-md transition-all cursor-pointer",
                      !notification.read && "border-l-4 border-l-emerald-500",
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex gap-3">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                          iconBg,
                        )}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-gray-900 text-sm">
                            {notification.title}
                          </p>
                          <span className="text-[10px] text-gray-400 whitespace-nowrap">
                            {formatDistanceToNow(notification.timestamp, {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        {notification.link && (
                          <div className="mt-2 flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                            View <ChevronRight className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
        {notifications.length === 0 && (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-10 h-10 text-emerald-600" />
            </div>
            <p className="text-gray-700 font-medium text-lg">All caught up!</p>
            <p className="text-sm text-gray-500 mt-1">No new notifications.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
