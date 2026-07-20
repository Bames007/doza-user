// app/api/user/[userId]/pending-requests/route.ts
// URL: /api/user/[userId]/pending-requests
// Method: GET

import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/app/utils/firebaseAdmin";
import { verifySessionCookie } from "@/app/utils/auth";
import logger from "@/app/utils/logger";
import { rateLimiter } from "@/app/lib/rateLimit";
import { cache } from "@/app/lib/cache";
import {
  unauthorized,
  tooManyRequests,
  handleError,
} from "@/app/lib/apiHelpers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  try {
    let authUserId: string | null = await verifySessionCookie(request);

    if (!authUserId) {
      authUserId = request.headers.get("x-user-id") || null;
    }

    if (!authUserId) {
      const authHeader = request.headers.get("Authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.split("Bearer ")[1];
        try {
          const decodedToken = await adminAuth.verifyIdToken(token);
          authUserId = decodedToken.uid;
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
    const rateKey = `${authUserId}:pending-requests`;
    if (!rateLimiter.check(rateKey, 30, 60)) return tooManyRequests();

    // Cache check
    const cacheKey = `pending-requests:${userId}`;
    const cached = cache.get<any[]>(cacheKey);
    if (cached) {
      logger.debug({ userId }, "Pending requests from cache");
      return NextResponse.json({ success: true, data: cached });
    }

    // Fetch pending requests
    const pendingRef = adminDb.ref(`doza/users/${userId}/pendingRequests`);
    const snapshot = await pendingRef.get();

    let pendingRequests: any[] = [];
    if (snapshot.exists()) {
      const data = snapshot.val();
      pendingRequests = Object.entries(data)
        .map(([id, request]) => ({
          id,
          ...(request as any),
        }))
        .filter((req) => req.status === "pending")
        .sort((a, b) => b.requestedAt - a.requestedAt);
    }

    cache.set(cacheKey, pendingRequests, 30);
    logger.info(
      { userId, count: pendingRequests.length },
      "Pending requests fetched",
    );

    return NextResponse.json({
      success: true,
      data: pendingRequests,
    });
  } catch (error) {
    return handleError(error);
  }
}
