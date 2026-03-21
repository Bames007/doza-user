import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";

export async function GET(request: NextRequest) {
  const uid = await verifyIdToken(request);
  if (!uid) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get("memberId") || "self";

  try {
    const medsRef = adminDb.ref(`doza/users/${uid}/medications`);
    const snapshot = await medsRef.once("value");
    let medications = snapshot.val() || [];
    if (!Array.isArray(medications)) medications = Object.values(medications);

    // Filter by member
    if (memberId !== "all") {
      medications = medications.filter((m: any) => m.assignedTo === memberId);
    }

    const now = new Date();
    const upcoming: any[] = [];

    medications.forEach((med: any) => {
      if (med.status !== "active") return;

      med.doses.forEach((dose: any) => {
        const doseTime = new Date(dose.scheduledTime);
        if (doseTime > now && !dose.takenAt) {
          upcoming.push({
            medicationId: med.id,
            medicationName: med.name,
            dosage: med.dosage,
            scheduledTime: dose.scheduledTime,
            assignedToName: med.assignedTo === "self" ? "Myself" : "Family", // You may want to store names
          });
        }
      });
    });

    // Sort by scheduledTime
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
