// app/api/user/[userId]/confirm-link/route.ts
// URL: /api/user/[userId]/confirm-link
// Method: POST

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/app/utils/firebaseAdmin";
import logger from "@/app/utils/logger";
import { rateLimiter } from "@/app/lib/rateLimit";
import { cache } from "@/app/lib/cache";
import { z } from "zod";
import {
  unauthorized,
  tooManyRequests,
  handleError,
} from "@/app/lib/apiHelpers";

// ─── Validation Schema ──────────────────────────────────────────────

const confirmLinkSchema = z.object({
  requestId: z.string().min(1, "requestId is required"),
  otp: z.string().min(6, "OTP must be 6 digits").max(6, "OTP must be 6 digits"),
});

// ─── POST ────────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  try {
    // 1. Authentication (ensure the user is confirming their own link)
    const authUserId = request.headers.get("x-user-id");
    if (!authUserId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // The user can only confirm their own link
    if (authUserId !== userId) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    // 2. Rate limit (5 attempts per 5 minutes per user)
    const rateKey = `${userId}:confirm-link`;
    if (!rateLimiter.check(rateKey, 5, 300)) {
      return tooManyRequests();
    }

    // 3. Parse and validate body
    const body = await request.json();
    const validated = confirmLinkSchema.parse(body);
    const { requestId, otp } = validated;

    // 4. Fetch pending request
    const requestRef = adminDb.ref(
      `doza/users/${userId}/pendingRequests/${requestId}`,
    );
    const snapshot = await requestRef.get();
    if (!snapshot.exists()) {
      return NextResponse.json(
        { success: false, error: "Request not found" },
        { status: 404 },
      );
    }

    const requestData = snapshot.val();

    // 5. Check request status
    if (requestData.status !== "pending") {
      return NextResponse.json(
        { success: false, error: "Request already processed" },
        { status: 400 },
      );
    }

    // 6. Check OTP expiry
    if (Date.now() > requestData.otpExpires) {
      return NextResponse.json(
        { success: false, error: "OTP has expired" },
        { status: 400 },
      );
    }

    // 7. Verify OTP
    if (requestData.otp !== otp) {
      // Log failed attempt
      logger.warn({ userId, requestId }, "Invalid OTP attempt");
      return NextResponse.json(
        { success: false, error: "Invalid OTP" },
        { status: 400 },
      );
    }

    const centerId = requestData.centerId;

    // 8. Mark request as confirmed
    await requestRef.update({ status: "confirmed" });

    // 9. Add center to user's linkedCenters
    const linkedCentersRef = adminDb.ref(
      `doza/users/${userId}/linkedCenters/${centerId}`,
    );
    await linkedCentersRef.set({
      linkedAt: Date.now(),
      status: "active",
    });

    // 10. Create/update patient record in the center
    const userProfileSnapshot = await adminDb
      .ref(`doza/users/${userId}/personalProfile`)
      .get();
    const userProfile = userProfileSnapshot.val() || {};

    const centerPatientRef = adminDb.ref(
      `doza_centers/${centerId}/patients/${userId}`,
    );

    // Build patient data
    const patientData = {
      fullName:
        `${(userProfile.fname || "").trim()} ${(userProfile.lname || "").trim()}`.trim() ||
        "Unknown Patient",
      email: userProfile.email || "",
      phone: userProfile.phone || "",
      dateOfBirth: userProfile.age || "",
      gender: userProfile.gender || "",
      linkedAt: Date.now(),
      userId,
      isLinked: true,
      patientType: "outpatient", // default
      status: "active",
      registeredAt: new Date().toISOString(),
    };

    await centerPatientRef.set(patientData);

    // 11. Copy medical profile (allergies, conditions) if available
    const medicalProfileSnapshot = await adminDb
      .ref(`doza/users/${userId}/medicalProfile`)
      .get();
    const medicalProfile = medicalProfileSnapshot.val();
    if (medicalProfile) {
      await centerPatientRef.update({
        allergies: medicalProfile.allergies || "",
        conditions: {
          asthma: medicalProfile.asthma || false,
          diabetic: medicalProfile.diabetic || false,
          heartDisease: medicalProfile.heartDisease || false,
          hypertension: medicalProfile.hypertension || false,
          ulcer: medicalProfile.ulcer || false,
        },
      });
    }

    // 12. Invalidate caches
    cache.set(`pending-requests:${userId}`, null, 0);
    cache.set(`patient:${centerId}:${userId}`, null, 0);
    cache.set(`patients:${centerId}`, null, 0);

    // 13. Audit log
    logger.info(
      {
        userId,
        centerId,
        requestId,
        action: "confirm-link",
      },
      "User confirmed link with center",
    );

    // 14. Return success
    return NextResponse.json({
      success: true,
      data: {
        centerId,
        linkedAt: Date.now(),
      },
      message: "Link confirmed successfully",
    });
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join("; ");
      return NextResponse.json(
        { success: false, error: errorMessages },
        { status: 400 },
      );
    }
    return handleError(error);
  }
}
