//app/api/medications/upcoming/route.ts

import { NextRequest, NextResponse } from "next/server";
import { verifySessionCookie } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";
import logger from "@/app/utils/logger";

export async function GET(request: NextRequest) {
  const uid = await verifySessionCookie(request);
  if (!uid) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const medsRef = adminDb.ref(`doza/users/${uid}/medications`);
    const snapshot = await medsRef.once("value");
    const val = snapshot.val();

    if (!val) return NextResponse.json({ success: true, data: [] });

    const medications = Array.isArray(val) ? val : Object.values(val);
    const nowTime = Date.now();
    const upcoming: any[] = [];

    medications.forEach((med: any) => {
      if (med?.status !== "active" || !med.doses) return;
      const dosesArray = Array.isArray(med.doses)
        ? med.doses
        : Object.values(med.doses);
      dosesArray.forEach((dose: any) => {
        if (!dose?.scheduledTime) return;
        const doseTime = new Date(dose.scheduledTime).getTime();
        if (isNaN(doseTime)) return;
        if (doseTime > nowTime && !dose.takenAt) {
          upcoming.push({
            id: `${med.id}-${doseTime}`,
            medicationId: med.id,
            medicationName: med.name || "Unknown",
            dosage: med.dosage || "",
            scheduledTime: dose.scheduledTime,
            assignedToName:
              med.assignedTo === "self"
                ? "Myself"
                : med.assignedToName || "Family",
          });
        }
      });
    });

    upcoming.sort(
      (a, b) =>
        new Date(a.scheduledTime).getTime() -
        new Date(b.scheduledTime).getTime(),
    );

    return NextResponse.json({ success: true, data: upcoming.slice(0, 20) });
  } catch (error) {
    logger.error({
      uid,
      message: "Upcoming medications failed",
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, error: "Unable to load upcoming medications" },
      { status: 500 },
    );
  }
}
