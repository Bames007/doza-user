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

  useEffect(() => {
    const stored = localStorage.getItem("doza_notifications_read");
    if (stored) {
      try {
        setReadIds(new Set(JSON.parse(stored)));
      } catch (e) {}
    }
  }, []);

  const markAsRead = (ids: string[]) => {
    setReadIds((prev) => {
      const newSet = new Set(prev);
      ids.forEach((id) => newSet.add(id));
      localStorage.setItem(
        "doza_notifications_read",
        JSON.stringify([...newSet]),
      );
      return newSet;
    });
  };

  const markAllAsRead = () => {
    if (notifications.length > 0) {
      markAsRead(notifications.map((n) => n.id));
    }
  };

  const { data: upcomingMeds } = useSWR(
    "/api/medications/upcoming",
    authFetcher,
  );
  const { data: meds } = useSWR("/api/medications", authFetcher);
  const { data: appointments } = useSWR("/api/appointments", authFetcher);
  const { data: challenges } = useSWR("/api/challenges?type=my", authFetcher);
  const { data: healthRecords } = useSWR("/api/health-records", authFetcher);
  const { data: orders } = useSWR("/api/store/orders", authFetcher);
  const { data: familyRequests } = useSWR("/api/family/requests", authFetcher);
  const { data: medicFavorites } = useSWR("/api/user/favorites", authFetcher);

  const notifications = useMemo<Notification[]>(() => {
    const list: Notification[] = [];
    const now = Date.now();

    // Medication reminders
    if (upcomingMeds?.success) {
      upcomingMeds.data.forEach((dose: any) => {
        const doseTime = new Date(dose.scheduledTime).getTime();
        if (doseTime - now < 3600000 && doseTime > now) {
          list.push({
            id: `med-${dose.medicationId}-${dose.scheduledTime}`,
            type: "medication",
            title: "Medication Reminder",
            message: `${dose.medicationName} (${dose.dosage}) due in ${Math.round((doseTime - now) / 60000)} minutes.`,
            timestamp: doseTime,
            read: readIds.has(`med-${dose.medicationId}-${dose.scheduledTime}`),
            link: "medications",
          });
        }
      });
    }

    // Missed doses
    if (meds?.success) {
      meds.data.forEach((med: any) => {
        med.doses.forEach((dose: any) => {
          const doseTime = new Date(dose.scheduledTime).getTime();
          if (!dose.takenAt && doseTime < now && doseTime > now - 86400000) {
            list.push({
              id: `missed-${med.id}-${dose.id}`,
              type: "medication",
              title: "Missed Dose",
              message: `You missed your ${med.name} dose scheduled for ${new Date(doseTime).toLocaleTimeString()}.`,
              timestamp: doseTime,
              read: readIds.has(`missed-${med.id}-${dose.id}`),
              link: "medications",
            });
          }
        });
      });
    }

    // Appointments
    if (appointments?.success) {
      appointments.data.forEach((apt: any) => {
        const aptTime = new Date(apt.date + "T" + apt.time).getTime();
        if (
          apt.status === "upcoming" &&
          aptTime - now < 86400000 &&
          aptTime > now
        ) {
          list.push({
            id: `apt-${apt.id}`,
            type: "appointment",
            title: "Upcoming Appointment",
            message: `You have an appointment with ${apt.medicName} at ${new Date(aptTime).toLocaleString()}.`,
            timestamp: aptTime,
            read: readIds.has(`apt-${apt.id}`),
            link: "doza-medics",
          });
        }
      });
    }

    // Challenges
    if (challenges?.success) {
      challenges.data.forEach((challenge: any) => {
        if (
          user?.id &&
          challenge.joinRequests?.[user.id]?.status === "pending"
        ) {
          list.push({
            id: `chal-invite-${challenge.id}`,
            type: "challenge",
            title: "Challenge Invitation",
            message: `${challenge.creatorName} invited you to join "${challenge.name}".`,
            timestamp: challenge.createdAt,
            read: readIds.has(`chal-invite-${challenge.id}`),
            link: "challenges",
          });
        }
        if (user?.id && challenge.participants?.[user.id]?.completed) {
          list.push({
            id: `chal-complete-${challenge.id}`,
            type: "challenge",
            title: "Challenge Completed",
            message: `Congratulations! You completed "${challenge.name}".`,
            timestamp: challenge.participants[user.id].completedAt,
            read: readIds.has(`chal-complete-${challenge.id}`),
            link: "challenges",
          });
        }
      });
    }

    // Orders
    if (orders?.success) {
      Object.values(orders.data).forEach((order: any) => {
        if (order.status === "processing") {
          list.push({
            id: `order-${order.orderId}`,
            type: "order",
            title: "Order Placed",
            message: `Your order #${order.orderId} is being processed.`,
            timestamp: order.createdAt,
            read: readIds.has(`order-${order.orderId}`),
            link: "doza-sport-shop",
          });
        } else if (order.status === "confirmed") {
          list.push({
            id: `order-conf-${order.orderId}`,
            type: "order",
            title: "Order Confirmed",
            message: `Your order #${order.orderId} has been confirmed.`,
            timestamp: order.updatedAt,
            read: readIds.has(`order-conf-${order.orderId}`),
            link: "doza-sport-shop",
          });
        } else if (order.status === "delivered") {
          list.push({
            id: `order-del-${order.orderId}`,
            type: "order",
            title: "Order Delivered",
            message: `Your order #${order.orderId} has been delivered.`,
            timestamp: order.updatedAt,
            read: readIds.has(`order-del-${order.orderId}`),
            link: "doza-sport-shop",
          });
        }
      });
    }

    // Family requests
    if (familyRequests?.success) {
      familyRequests.data.forEach((req: any) => {
        list.push({
          id: `fam-req-${req.id}`,
          type: "family",
          title: "Family Request",
          message: `${req.name} wants to join your family.`,
          timestamp: req.requestedAt,
          read: readIds.has(`fam-req-${req.id}`),
          link: "family-friends",
        });
      });
    }

    // Health records (new entry today)
    if (healthRecords?.success && healthRecords.data.length > 0) {
      const latest = healthRecords.data[0];
      const latestTime = new Date(latest.createdAt).getTime();
      if (latestTime > now - 86400000) {
        list.push({
          id: `health-${latest.id}`,
          type: "health",
          title: "Health Record Added",
          message: `New ${latest.type} recorded: ${latest.value} ${latest.unit}.`,
          timestamp: latestTime,
          read: readIds.has(`health-${latest.id}`),
          link: "health-tracker",
        });
      }
    }

    return list.sort((a, b) => b.timestamp - a.timestamp);
  }, [
    upcomingMeds,
    meds,
    appointments,
    challenges,
    orders,
    familyRequests,
    medicFavorites,
    healthRecords,
    user,
    readIds,
  ]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
  };
}
