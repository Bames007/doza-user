import { adminDb, adminAuth } from "@/app/utils/firebaseAdmin";
import { NextResponse } from "next/server";
import logger from "@/app/utils/logger";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;

    const [medsSnap, apptsSnap, healthSnap, familySnap, ordersSnap] =
      await Promise.all([
        adminDb.ref(`doza/users/${uid}/medications`).get(),
        adminDb.ref(`doza/users/${uid}/appointments`).get(),
        adminDb.ref(`doza/users/${uid}/healthRecords`).get(),
        adminDb.ref(`doza/users/${uid}/familyRequests`).get(),
        adminDb.ref(`doza/users/${uid}/orders`).get(),
      ]);

    const now = Date.now();
    const notifications: any[] = [];

    const meds = medsSnap.val() || {};
    const appts = apptsSnap.val() || {};
    const healthVal = healthSnap.val() || {};
    const familyReqs = familySnap.val() || {};
    const orders = ordersSnap.val() || {};

    // --- HEALTH RECORDS ---
    const healthRecords = Array.isArray(healthVal)
      ? healthVal
      : Object.values(healthVal);

    const sortedRecords = [...healthRecords].sort(
      (a: any, b: any) =>
        new Date(b.date || b.createdAt).getTime() -
        new Date(a.date || a.createdAt).getTime(),
    );

    const recentEntries = sortedRecords.slice(0, 5);

    const getLatest = (type: string) =>
      sortedRecords.filter((r: any) => r.type === type)[0];

    const heartRate = getLatest("heartRate")?.value || "—";
    const bloodPressure = getLatest("bloodPressure")?.value || "—";
    const steps = getLatest("steps")?.value || "—";
    const weight = getLatest("weight")?.value || "—";

    // --- APPOINTMENTS ---
    const apptsArray = Array.isArray(appts) ? appts : Object.values(appts);

    const upcomingAppointments = apptsArray
      .filter((a: any) => {
        const isUpcoming = a.status === "upcoming";
        const aptTime = new Date(`${a.date}T${a.time}`).getTime();
        const isFuture = aptTime > now;
        return isUpcoming && isFuture;
      })
      .sort(
        (a: any, b: any) =>
          new Date(`${a.date}T${a.time}`).getTime() -
          new Date(`${b.date}T${b.time}`).getTime(),
      );

    // --- NOTIFICATIONS ---
    Object.entries(meds).forEach(([id, med]: [string, any]) => {
      med.doses?.forEach((dose: any) => {
        const doseTime = new Date(dose.scheduledTime).getTime();
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

    apptsArray.forEach((apt: any) => {
      const aptTime = new Date(`${apt.date}T${apt.time}`).getTime();
      if (
        apt.status === "upcoming" &&
        aptTime - now < 86400000 &&
        aptTime > now
      ) {
        notifications.push({
          id: `apt-${apt.id}`,
          type: "appointment",
          title: "Upcoming Appointment",
          message: `Appointment with ${apt.medicName} at ${apt.time}`,
          timestamp: aptTime,
          link: "doza-medics",
        });
      }
    });

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
        healthRecords: {
          heartRate,
          bloodPressure,
          steps,
          weight,
          recentEntries,
        },
        appointments: upcomingAppointments,
        stats: {
          medsCount: Object.keys(meds).length,
          upcomingAppts: upcomingAppointments.length,
        },
      },
    });
  } catch (error) {
    logger.error({
      message: "Dashboard summary failed",
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, error: "Unable to load dashboard" },
      { status: 500 },
    );
  }
}
