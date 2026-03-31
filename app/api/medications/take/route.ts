import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";

export async function POST(request: NextRequest) {
  const uid = await verifyIdToken(request);
  if (!uid)
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );

  try {
    const { medicationId, scheduledTime } = await request.json();
    const medsRef = adminDb.ref(`doza/users/${uid}/medications`);
    const snapshot = await medsRef.once("value");

    // Normalize: Handle if Firebase returns an object instead of an array
    let medications = snapshot.val();
    if (!medications)
      return NextResponse.json(
        { success: false, error: "No meds found" },
        { status: 404 },
      );

    const isArray = Array.isArray(medications);
    const medEntries = isArray ? medications : Object.entries(medications);

    let targetMed: any = null;
    let targetKey: string | number | null = null;

    if (isArray) {
      const idx = medications.findIndex((m: any) => m?.id === medicationId);
      if (idx !== -1) {
        targetMed = medications[idx];
        targetKey = idx;
      }
    } else {
      for (const [key, val] of medEntries as any) {
        if (val.id === medicationId) {
          targetMed = val;
          targetKey = key;
          break;
        }
      }
    }

    if (!targetMed || targetKey === null) {
      return NextResponse.json(
        { success: false, error: "Medication not found" },
        { status: 404 },
      );
    }

    const doses = targetMed.doses || [];
    const doseIndex = doses.findIndex(
      (d: any) => d.scheduledTime === scheduledTime,
    );

    if (doseIndex !== -1) {
      // Update specific dose
      await adminDb
        .ref(`doza/users/${uid}/medications/${targetKey}/doses/${doseIndex}`)
        .update({
          takenAt: new Date().toISOString(),
        });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, error: "Dose not found" },
      { status: 404 },
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
