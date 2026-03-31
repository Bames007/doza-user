import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";

export async function GET(request: NextRequest) {
  const uid = await verifyIdToken(request);
  if (!uid)
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );

  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get("memberId") || "self";

  try {
    const medsRef = adminDb.ref(`doza/users/${uid}/medications`);
    const snapshot = await medsRef.once("value");
    let medications = snapshot.val() || [];

    // Ensure it's an array (Firebase sometimes returns objects if keys are strings)
    if (medications && !Array.isArray(medications)) {
      medications = Object.values(medications);
    }

    const now = new Date();
    const upcoming: any[] = [];

    medications.forEach((med: any) => {
      // CRITICAL FIX: Ensure med.doses exists and is an array before looping
      if (med?.status === "active" && Array.isArray(med?.doses)) {
        med.doses.forEach((dose: any) => {
          const doseTime = new Date(dose.scheduledTime);
          if (doseTime > now && !dose.takenAt) {
            upcoming.push({
              id: med.id + dose.scheduledTime, // Unique key for UI
              medicationId: med.id,
              medicationName: med.name,
              dosage: med.dosage,
              scheduledTime: dose.scheduledTime,
              assignedToName:
                med.assignedTo === "self"
                  ? "Myself"
                  : med.assignedToName || "Family",
            });
          }
        });
      }
    });

    // Sort by soonest first
    upcoming.sort(
      (a, b) =>
        new Date(a.scheduledTime).getTime() -
        new Date(b.scheduledTime).getTime(),
    );

    return NextResponse.json({ success: true, data: upcoming });
  } catch (error) {
    console.error("GET upcoming doses error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
