// app/api/user/[userId]/linked-centers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/app/utils/firebaseAdmin";
import { verifySessionCookie } from "@/app/utils/auth";
import { rateLimiter } from "@/app/lib/rateLimit";
import {
  unauthorized,
  tooManyRequests,
  handleError,
} from "@/app/lib/apiHelpers";
import logger from "@/app/utils/logger";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  try {
    // Authenticate
    let authUserId: string | null = await verifySessionCookie(request);

    if (!authUserId) {
      authUserId = request.headers.get("x-user-id") || null;
    }

    if (!authUserId) {
      const authHeader = request.headers.get("Authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.split("Bearer ")[1];
        try {
          const decoded = await adminAuth.verifyIdToken(token);
          authUserId = decoded.uid;
        } catch {}
      }
    }

    if (!authUserId) return unauthorized();

    if (authUserId !== userId) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    // Rate limit
    const rateKey = `${userId}:linked-centers`;
    if (!rateLimiter.check(rateKey, 30, 60)) return tooManyRequests();

    // Fetch linked centers
    const linkedRef = adminDb.ref(`doza/users/${userId}/linkedCenters`);
    const snapshot = await linkedRef.get();
    let centers: any[] = [];
    if (snapshot.exists()) {
      const data = snapshot.val();
      const centerIds = Object.keys(data);
      const centerPromises = centerIds.map(async (centerId) => {
        const centerSnap = await adminDb.ref(`doza_centers/${centerId}`).get();
        const centerData = centerSnap.exists() ? centerSnap.val() : {};
        return {
          centerId,
          linkedAt: data[centerId].linkedAt,
          status: data[centerId].status || "active",
          centerName: centerData.centerName || "Unknown Center",
          centerType: centerData.centerType || "Clinic",
        };
      });
      centers = await Promise.all(centerPromises);
      centers.sort((a, b) => (b.linkedAt || 0) - (a.linkedAt || 0));
    }

    return NextResponse.json({ success: true, data: centers });
  } catch (error) {
    logger.error({ error: String(error) }, "Linked centers fetch failed");
    return handleError(error);
  }
}
