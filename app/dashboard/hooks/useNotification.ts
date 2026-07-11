"use client";

import { useMemo, useEffect, useState } from "react";
import useSWR from "swr";
import { useUser } from "./useProfile";
import { authFetcher } from "@/app/utils/client-auth";

export type Notification = {
  id: string;
  type:
    | "medication"
    | "appointment"
    | "challenge"
    | "health"
    | "order"
    | "family"
    | "medic";
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  link?: string;
};

export function useNotifications() {
  const { user } = useUser();
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  // Load previously read notification IDs from localStorage (non‑sensitive)
  useEffect(() => {
    const stored = localStorage.getItem("doza_notifications_read");
    if (stored) {
      try {
        setReadIds(new Set(JSON.parse(stored)));
      } catch {
        // ignore corrupted data
      }
    }
  }, []);

  const markAsRead = (ids: string[]) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      localStorage.setItem(
        "doza_notifications_read",
        JSON.stringify([...next]),
      );
      return next;
    });
  };

  const markAllAsRead = () => {
    if (notifications.length > 0) {
      markAsRead(notifications.map((n) => n.id));
    }
  };

  // 🔥 Single server call – replaces 8 separate client‑side fetches
  const { data, error } = useSWR(
    user ? "/api/dashboard/summary" : null,
    authFetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60_000, // refresh at most every minute
    },
  );

  // Merge read status from localStorage with the server‑returned list
  const notifications: Notification[] = useMemo(() => {
    const raw = data?.data?.notifications ?? [];
    return raw.map((n: any) => ({
      ...n,
      read: readIds.has(n.id),
    }));
  }, [data, readIds]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    isLoading: !data && !error,
    error,
  };
}
