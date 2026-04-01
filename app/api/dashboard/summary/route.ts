import { adminDb } from "@/app/utils/firebaseAdmin";
import { NextResponse } from "next/server";
import { auth } from "firebase-admin";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await auth().verifyIdToken(token);
    const uid = decodedToken.uid;

    // 1. Single batch fetch (MUCH faster than 8 separate API calls)
    const [medsSnap, apptsSnap, challengesSnap, familySnap, ordersSnap] =
      await Promise.all([
        adminDb.ref(`doza/users/${uid}/medications`).get(),
        adminDb.ref(`doza/users/${uid}/appointments`).get(),
        adminDb.ref(`doza/challenges`).get(),
        adminDb.ref(`doza/users/${uid}/familyRequests`).get(),
        adminDb.ref(`doza/users/${uid}/orders`).get(),
      ]);

    const now = Date.now();
    const notifications: any[] = [];

    // --- DATA PARSING ---
    const meds = medsSnap.val() || {};
    const appts = apptsSnap.val() || {};
    const challenges = challengesSnap.val() || {};
    const familyReqs = familySnap.val() || {};
    const orders = ordersSnap.val() || {};

    // --- NOTIFICATION LOGIC (MOVED FROM CLIENT) ---

    // 2. Medication Notifications
    Object.entries(meds).forEach(([id, med]: [string, any]) => {
      med.doses?.forEach((dose: any) => {
        const doseTime = new Date(dose.scheduledTime).getTime();
        // Missed dose (last 24h)
        if (!dose.takenAt && doseTime < now && doseTime > now - 86400000) {
          notifications.push({
            id: `missed-${id}-${dose.id}`,
            type: "medication",
            title: "Missed Dose",
            message: `You missed your ${med.name} dose.`,
            timestamp: doseTime,
            link: "medications",
          });
        }
      });
    });

    // 3. Appointment Notifications
    Object.entries(appts).forEach(([id, apt]: [string, any]) => {
      const aptTime = new Date(`${apt.date}T${apt.time}`).getTime();
      if (
        apt.status === "upcoming" &&
        aptTime - now < 86400000 &&
        aptTime > now
      ) {
        notifications.push({
          id: `apt-${id}`,
          type: "appointment",
          title: "Upcoming Appointment",
          message: `Appointment with ${apt.medicName} at ${apt.time}`,
          timestamp: aptTime,
          link: "doza-medics",
        });
      }
    });

    // 4. Family Request Notifications
    Object.entries(familyReqs).forEach(([id, req]: [string, any]) => {
      notifications.push({
        id: `fam-${id}`,
        type: "family",
        title: "Family Request",
        message: `${req.name} wants to connect.`,
        timestamp: req.requestedAt || now,
        link: "family-friends",
      });
    });

    // 5. Order Status Notifications
    Object.values(orders).forEach((order: any) => {
      if (["processing", "delivered"].includes(order.status)) {
        notifications.push({
          id: `order-${order.orderId}-${order.status}`,
          type: "order",
          title: `Order ${order.status.toUpperCase()}`,
          message: `Order #${order.orderId} status updated.`,
          timestamp: order.updatedAt || now,
          link: "doza-sport-shop",
        });
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        notifications: notifications.sort((a, b) => b.timestamp - a.timestamp),
        stats: {
          medsCount: Object.keys(meds).length,
          upcomingAppts: Object.values(appts).filter(
            (a: any) => a.status === "upcoming",
          ).length,
        },
      },
    });
  } catch (error) {
    console.error("Dashboard Summary Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
