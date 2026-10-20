// app/dashboard/hooks/useNotifications.ts

import { useMemo, useEffect, useState } from "react";
import useSWR from "swr";
import { useUser } from "./useProfile";
import { authFetcher } from "@/app/utils/client-auth";
import { usePendingLinkRequests } from "./usePendingLinkRequest";

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
  const userId = user?.id;

  const { pendingRequests } = usePendingLinkRequests(userId);

  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    const stored = localStorage.getItem("doza_notifications_read");
    if (stored) {
      try {
        setReadIds(new Set(JSON.parse(stored)));
      } catch {}
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

  const { data, error } = useSWR(
    user ? "/api/dashboard/summary" : null,
    authFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60_000,
      keepPreviousData: true,
      revalidateIfStale: false,
    },
  );

  const notifications: Notification[] = useMemo(() => {
    const raw = data?.data?.notifications ?? [];

    const pendingNotifs: Notification[] = (pendingRequests || [])
      .filter((req: any) => req.id || req.requestId)
      .map((req: any) => {
        const uniqueId = req.id || req.requestId;
        const notifId = `pending-${uniqueId}`;
        return {
          id: notifId,
          type: "medic" as const,
          title: "Link Request",
          message: `${req.centerName || "A healthcare center"} wants to link with you.`,
          timestamp: req.requestedAt || Date.now(),
          read: readIds.has(notifId),
          link: "pending-request",
        };
      });

    const combined = [
      ...raw.map((n: any) => ({
        ...n,
        read: readIds.has(n.id),
      })),
      ...pendingNotifs,
    ];

    combined.sort((a, b) => b.timestamp - a.timestamp);
    return combined;
  }, [data, pendingRequests, readIds]);

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
