// app/api/centers/[id]/appointments/route.ts
// URL: /api/centers/[id]/appointments
// Methods: GET, POST

import { NextRequest, NextResponse } from "next/server";
import { ref, get, push, set } from "firebase/database";
import { db } from "@/app/utils/firebaseConfig";
import logger from "@/app/utils/logger";
import { rateLimiter } from "@/app/lib/rateLimit";
import { cache } from "@/app/lib/cache";
import { z } from "zod";
import {
  unauthorized,
  tooManyRequests,
  handleError,
} from "@/app/lib/apiHelpers";

// ─── Extended schema to accept extra fields for drugs/tests ──────
const appointmentCreateSchema = z
  .object({
    patientName: z.string().min(1),
    patientPhone: z.string().optional(),
    dozaUserId: z.string().optional(),
    title: z.string().optional(),
    type: z
      .enum([
        "checkup",
        "consultation",
        "follow-up",
        "emergency",
        "procedure",
        "test",
        "other",
        "prescription",
      ])
      .default("consultation"),
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    notes: z.string().optional().default(""),
    reminders: z
      .object({
        email: z.boolean().default(false),
        sms: z.boolean().default(false),
      })
      .optional()
      .default({ email: false, sms: false }),
    medication: z.string().optional(),
    dosage: z.string().optional(),
    quantity: z.number().optional(),
    testName: z.string().optional(),
    status: z.string().optional(),
  })
  .passthrough();

// ─── GET ─────────────────────────────────────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: centerId } = await params;
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) return unauthorized();

    const rateKey = `${userId}:appointments-list:${centerId}`;
    if (!rateLimiter.check(rateKey, 30, 60)) return tooManyRequests();

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || "";

    const cacheKey = `appointments:${centerId}:${date}`;
    const cached = cache.get<any[]>(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, data: cached });
    }

    const appointmentsRef = ref(db, `doza_centers/${centerId}/appointments`);
    const snapshot = await get(appointmentsRef);
    let appointments = snapshot.exists() ? snapshot.val() : {};
    let list = Object.entries(appointments).map(([id, data]) => ({
      id,
      ...(data as object),
    }));

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      list = list.filter((a: any) => {
        const s = new Date(a.startTime);
        return s >= start && s <= end;
      });
    }

    cache.set(cacheKey, list, 30);
    logger.info({ centerId, count: list.length }, "Appointments fetched");
    return NextResponse.json({ success: true, data: list });
  } catch (error) {
    return handleError(error);
  }
}

// ─── POST ────────────────────────────────────────────────────────────
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: centerId } = await params;
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) return unauthorized();

    const rateKey = `${userId}:create-appointment:${centerId}`;
    if (!rateLimiter.check(rateKey, 20, 60)) return tooManyRequests();

    const body = await request.json();
    const validated = appointmentCreateSchema.parse(body);

    const newAppointment = {
      ...validated,
      status: validated.status || "scheduled",
      createdBy: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const appointmentsRef = ref(db, `doza_centers/${centerId}/appointments`);
    const newRef = push(appointmentsRef);
    await set(newRef, newAppointment);

    cache.set(`appointments:${centerId}:*`, null, 0);

    // ─── 1. Notify patient (if dozaUserId) ──────────────────────────
    if (validated.dozaUserId) {
      try {
        if (!centerId) {
          logger.warn(
            { centerId },
            "centerId is undefined – cannot send patient notification",
          );
          throw new Error("centerId is undefined");
        }
        const notificationRef = ref(
          db,
          `doza/users/${validated.dozaUserId}/notifications`,
        );
        const notifRef = push(notificationRef);
        await set(notifRef, {
          title: "Appointment Scheduled",
          message: `Your appointment at ${newAppointment.patientName || "the center"} is scheduled for ${new Date(validated.startTime).toLocaleString()}.`,
          type: "appointment",
          link: `/dashboard/appointments/${newRef.key}`,
          read: false,
          timestamp: Date.now(),
          centerId,
        });
      } catch (notifErr) {
        logger.warn(notifErr, "Failed to send patient notification");
      }
    }

    // ─── 2. Notify center staff ──────────────────────────────────────
    try {
      const centerSnap = await get(ref(db, `doza_centers/${centerId}`));
      let targetUserId: string | null = null;
      if (centerSnap.exists()) {
        const centerData = centerSnap.val();
        if (centerData.ownerInfo?.userId) {
          targetUserId = centerData.ownerInfo.userId;
        } else if (centerData.createdBy) {
          targetUserId = centerData.createdBy;
        }
      }

      // Fallback to "center" so all staff can see it
      const notifUserId = targetUserId || "center";

      const centerNotifRef = ref(db, `doza_centers/${centerId}/notifications`);
      const notifRef = push(centerNotifRef);

      let title = "New Appointment";
      let message = `${validated.patientName} booked an appointment.`;

      if (validated.type === "prescription") {
        title = "New Medication Order";
        message = `${validated.patientName} ordered ${validated.medication || "medication"}.`;
      } else if (validated.type === "test") {
        title = "New Test Request";
        message = `${validated.patientName} requested ${validated.testName || "a lab test"}.`;
      }

      await set(notifRef, {
        title,
        message,
        type: validated.type || "appointment",
        status: "pending",
        relatedId: newRef.key,
        timestamp: Date.now(),
        read: false,
        userId: notifUserId,
        link: "appointments",
      });

      logger.info(
        { centerId, notifUserId, type: validated.type },
        "Center notification sent",
      );
    } catch (notifErr) {
      logger.warn(notifErr, "Failed to send center notification");
    }

    logger.info(
      { centerId, appointmentId: newRef.key },
      "Appointment created with notifications",
    );
    return NextResponse.json({
      success: true,
      data: { id: newRef.key, ...newAppointment },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0].message },
        { status: 400 },
      );
    }
    return handleError(error);
  }
}
