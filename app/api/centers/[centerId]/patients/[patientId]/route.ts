// app/api/centers/[centerId]/patients/[patientId]/route.ts (extended)

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
    let requesterId: string | null = await verifySessionCookie(request);
    if (!requesterId) requesterId = request.headers.get("x-user-id") || null;
    if (!requesterId) {
      const authHeader = request.headers.get("Authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.split("Bearer ")[1];
        try {
          const decoded = await adminAuth.verifyIdToken(token);
          requesterId = decoded.uid;
        } catch {}
      }
    }
    if (!requesterId) return unauthorized();
    if (requesterId !== patientId) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    const rateKey = `${requesterId}:patient:${centerId}:${patientId}`;
    if (!rateLimiter.check(rateKey, 30, 60)) return tooManyRequests();

    const cacheKey = `patient:${centerId}:${patientId}`;
    const cached = cache.get<any>(cacheKey);
    if (cached) return NextResponse.json({ success: true, data: cached });

    // Patient data
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

    // Tests
    const testsRef = ref(db, `doza_centers/${centerId}/tests`);
    const testsSnap = await get(testsRef);
    let tests: any[] = [];
    if (testsSnap.exists()) {
      const allTests = testsSnap.val();
      tests = Object.values(allTests)
        .filter((t: any) => t.patientId === patientId)
        .map((t: any) => ({ ...t }));
    }

    // Follow‑up appointments
    const followUpRef = ref(
      db,
      `doza_centers/${centerId}/patients/${patientId}/followUpAppointments`,
    );
    const followUpSnap = await get(followUpRef);
    let followUps: any[] = [];
    if (followUpSnap.exists()) {
      const data = followUpSnap.val();
      followUps = Object.entries(data).map(([id, val]) => ({
        id,
        ...(val as any),
      }));
      followUps.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
    }

    // Take‑home medications – we'll treat prescriptions with source === "external" or dispensed === true and a flag
    // For now, we'll filter prescriptions where dispensedStatus !== "none" and source === "external"
    const prescriptions = patientData.prescriptions || [];
    const takeHomeMeds = prescriptions
      .filter(
        (rx: any) =>
          rx.dispensedStatus &&
          rx.dispensedStatus !== "none" &&
          (rx.source === "external" || rx.source === "hospital"),
      )
      .map((rx: any) => ({
        ...rx,
        id: `takehome-${Date.now()}-${Math.random()}`,
      })); // pseudo id

    // Center name
    const centerRef = ref(db, `doza_centers/${centerId}`);
    const centerSnap = await get(centerRef);
    const centerName = centerSnap.exists()
      ? centerSnap.val().centerName || "Unknown Center"
      : "Unknown Center";

    const fullData = {
      id: patientId,
      centerName,
      ...patientData,
      tests,
      followUpAppointments: followUps,
      takeHomeMedications: takeHomeMeds,
    };

    cache.set(cacheKey, fullData, 30);
    return NextResponse.json({ success: true, data: fullData });
  } catch (error) {
    return handleError(error);
  }
}
