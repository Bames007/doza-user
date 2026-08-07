// User App: /app/api/doza-requests/route.ts

import { NextRequest, NextResponse } from "next/server";
import { ref, push, set, get } from "firebase/database";
import { db } from "@/app/utils/firebaseConfig";
import logger from "@/app/utils/logger";
import { rateLimiter } from "@/app/lib/rateLimit";
import { z } from "zod";

// ─── Schema ─────────────────────────────────────────────────────
const createSchema = z.object({
  centerId: z.string().min(1),
  patientName: z.string().min(1),
  patientPhone: z.string().optional(),
  patientEmail: z.string().optional(),
  dozaUserId: z.string().min(1),
  type: z.enum(["consultation", "prescription", "test"]),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  notes: z.string().optional().default(""),
  medication: z.string().optional(),
  dosage: z.string().optional(),
  quantity: z.number().optional(),
  testName: z.string().optional(),
  // Added fulfilment fields
  fulfillmentMethod: z.enum(["pickup", "delivery"]).optional(),
  deliveryAddress: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const ip = request.headers.get("x-forwarded-for") || "unknown";
    if (!rateLimiter.check(ip, 10, 60)) {
      return NextResponse.json(
        { success: false, error: "Too many requests" },
        { status: 429 },
      );
    }

    const body = await request.json();
    const validated = createSchema.parse(body);

    const newRequest = {
      ...validated,
      status: "pending",
      createdBy: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      responseNotes: "",
      respondedBy: null,
      respondedAt: null,
    };

    // Store in center's dozaRequests node
    const requestsRef = ref(
      db,
      `doza_centers/${validated.centerId}/dozaRequests`,
    );
    const newRef = push(requestsRef);
    await set(newRef, newRequest);

    // Also store in the user's own requests node for easy listing
    if (validated.dozaUserId) {
      // Fetch the full centre object to get the correct name field
      const centerSnap = await get(
        ref(db, `doza_centers/${validated.centerId}`),
      );
      const centerName = centerSnap.exists()
        ? centerSnap.val().centerName ||
          centerSnap.val().name ||
          "Unknown Center"
        : "Unknown Center";

      const userRequestRef = ref(
        db,
        `doza_users/${validated.dozaUserId}/requests/${newRef.key}`,
      );
      await set(userRequestRef, {
        ...newRequest,
        centerName,
      });
    }

    // Notify Doza user
    try {
      const notifRef = ref(
        db,
        `doza/users/${validated.dozaUserId}/notifications`,
      );
      const notif = push(notifRef);
      await set(notif, {
        title: "Request Submitted",
        message: `Your ${validated.type} request has been sent to the center.`,
        type: "doza-request",
        link: `/dashboard/doza-requests/${newRef.key}`,
        read: false,
        timestamp: Date.now(),
        centerId: validated.centerId,
      });
    } catch (e) {
      logger.warn(e, "Failed to notify user");
    }

    // Notify center admin/owner
    try {
      const centerSnap = await get(
        ref(db, `doza_centers/${validated.centerId}`),
      );
      let targetUserId: string | null = null;
      if (centerSnap.exists()) {
        const centerData = centerSnap.val();
        targetUserId =
          centerData.ownerInfo?.userId || centerData.createdBy || null;
      }

      if (targetUserId) {
        const centerNotifRef = ref(
          db,
          `doza_centers/${validated.centerId}/notifications`,
        );
        const notif = push(centerNotifRef);
        await set(notif, {
          userId: targetUserId,
          title: `New ${validated.type} Request`,
          message: `${validated.patientName} requested ${validated.type === "consultation" ? "an appointment" : validated.type === "prescription" ? "medication" : "a test"}.`,
          type: "doza-request",
          status: "pending",
          relatedId: newRef.key,
          timestamp: Date.now(),
          read: false,
          link: "doza-requests",
        });
      }
    } catch (e) {
      logger.warn(e, "Failed to notify center");
    }

    logger.info(
      { centerId: validated.centerId, requestId: newRef.key },
      "Doza request created directly",
    );

    return NextResponse.json({
      success: true,
      data: { id: newRef.key, ...newRequest },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0].message },
        { status: 400 },
      );
    }
    logger.error(error, "Error creating doza request");
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
