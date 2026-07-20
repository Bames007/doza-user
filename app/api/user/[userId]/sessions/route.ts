// app/api/user/[userId]/sessions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/app/utils/firebaseAdmin";
import { verifySessionCookie } from "@/app/utils/auth";
import logger from "@/app/utils/logger";
import { rateLimiter } from "@/app/lib/rateLimit";
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
    const rateKey = `${userId}:session-history`;
    if (!rateLimiter.check(rateKey, 30, 60)) return tooManyRequests();

    // Fetch session summaries
    const sessionsRef = adminDb.ref(`doza/users/${userId}/sessions`);
    const snapshot = await sessionsRef.get();
    let sessions: any[] = [];
    if (snapshot.exists()) {
      const data = snapshot.val();
      sessions = Object.values(data).map((s: any) => ({
        ...s,
        startTime: s.startTime || s.startedAt,
        endTime: s.endTime || s.endedAt,
      }));
      sessions.sort((a, b) => (b.startTime || 0) - (a.startTime || 0));
    }

    return NextResponse.json({ success: true, data: sessions });
  } catch (error) {
    return handleError(error);
  }
}
