// app/api/centers/[centerId]/patients/[patientId]/route.ts
// For patients to fetch their own clinical data from a center, including tests

import { NextRequest, NextResponse } from "next/server";
import { ref, get } from "firebase/database";
import { db } from "@/app/utils/firebaseConfig";
import { adminAuth } from "@/app/utils/firebaseAdmin";
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
  { params }: { params: Promise<{ centerId: string; patientId: string }> },
) {
  const { centerId, patientId } = await params;
  try {
    // 1. Authenticate: try session cookie, then x-user-id, then Bearer
    let requesterId: string | null = await verifySessionCookie(request);

    if (!requesterId) {
      requesterId = request.headers.get("x-user-id") || null;
    }

    if (!requesterId) {
      const authHeader = request.headers.get("Authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.split("Bearer ")[1];
        try {
          const decoded = await adminAuth.verifyIdToken(token);
          requesterId = decoded.uid;
        } catch {
          // invalid token – ignore
        }
      }
    }

    if (!requesterId) {
      return unauthorized();
    }

    // 2. Ensure patient can only access their own data
    if (requesterId !== patientId) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden: You can only access your own data",
        },
        { status: 403 },
      );
    }

    // 3. Rate limit
    const rateKey = `${requesterId}:patient:${centerId}:${patientId}`;
    if (!rateLimiter.check(rateKey, 30, 60)) return tooManyRequests();

    // 4. Cache check
    const cacheKey = `patient:${centerId}:${patientId}`;
    const cached = cache.get<any>(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, data: cached });
    }

    // 5. Fetch patient data
    const patientRef = ref(
      db,
      `doza_centers/${centerId}/patients/${patientId}`,
    );
    const patientSnap = await get(patientRef);
    if (!patientSnap.exists()) {
      return NextResponse.json(
        { success: false, error: "Patient not found" },
        { status: 404 },
      );
    }
    const patientData = patientSnap.val();

    // 6. Fetch tests for this patient
    const testsRef = ref(db, `doza_centers/${centerId}/tests`);
    const testsSnap = await get(testsRef);
    let tests: any[] = [];
    if (testsSnap.exists()) {
      const allTests = testsSnap.val();
      tests = Object.values(allTests)
        .filter((t: any) => t.patientId === patientId)
        .map((t: any) => ({ ...t }));
    }

    const fullData = {
      id: patientId,
      ...patientData,
      tests,
    };

    cache.set(cacheKey, fullData, 30);
    return NextResponse.json({ success: true, data: fullData });
  } catch (error) {
    return handleError(error);
  }
}
