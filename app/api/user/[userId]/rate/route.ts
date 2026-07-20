// app/api/user/[userId]/rate/route.ts
// POST – user rates a completed session

import { NextRequest, NextResponse } from "next/server";
import { ref, update } from "firebase/database";
import { db } from "@/app/utils/firebaseConfig";
import { adminAuth } from "@/app/utils/firebaseAdmin";
import { verifySessionCookie } from "@/app/utils/auth";
import logger from "@/app/utils/logger";
import { rateLimiter } from "@/app/lib/rateLimit";
import { z } from "zod";
import {
  unauthorized,
  tooManyRequests,
  handleError,
} from "@/app/lib/apiHelpers";

const ratingSchema = z.object({
  centerId: z.string(),
  sessionId: z.string(),
  rating: z.number().min(1).max(5),
  comment: z.string().optional().default(""),
});

export async function POST(
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

    const body = await request.json();
    const { centerId, sessionId, rating, comment } = ratingSchema.parse(body);

    // Rate limit
    const rateKey = `${userId}:rate:${centerId}`;
    if (!rateLimiter.check(rateKey, 10, 60)) return tooManyRequests();

    // Store rating
    const ratingRef = ref(
      db,
      `doza/users/${userId}/ratings/${centerId}/${sessionId}`,
    );
    await update(ratingRef, {
      rating,
      comment,
      timestamp: Date.now(),
      centerId,
      sessionId,
    });

    logger.info({ userId, centerId, sessionId, rating }, "User rated session");
    return NextResponse.json({
      success: true,
      message: "Rating submitted successfully",
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
