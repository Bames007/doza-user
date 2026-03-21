//app/api/medications/[id]/doses/[doseId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; doseId: string }> },
) {
  const uid = await verifyIdToken(request);
  if (!uid) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  // Await the params Promise
  const { id: medicationId, doseId } = await params;

  if (!medicationId || !doseId) {
    return NextResponse.json(
      { success: false, error: "Missing IDs" },
      { status: 400 },
    );
  }

  try {
    const { taken, reaction } = await request.json();
    const medsRef = adminDb.ref(`doza/users/${uid}/medications`);
    const snapshot = await medsRef.once("value");
    let medications = snapshot.val() || [];

    // Handle object‑style storage
    if (!Array.isArray(medications)) {
      medications = Object.values(medications);
    }

    const medIndex = medications.findIndex((m: any) => m.id === medicationId);
    if (medIndex === -1) {
      return NextResponse.json(
        { success: false, error: "Medication not found" },
        { status: 404 },
      );
    }

    const doseIndex = medications[medIndex].doses.findIndex(
      (d: any) => d.id === doseId,
    );
    if (doseIndex === -1) {
      return NextResponse.json(
        { success: false, error: "Dose not found" },
        { status: 404 },
      );
    }

    if (taken) {
      medications[medIndex].doses[doseIndex].takenAt = new Date().toISOString();
    }
    if (reaction) {
      medications[medIndex].doses[doseIndex].reaction = reaction;
    }

    await medsRef.set(medications);

    return NextResponse.json({
      success: true,
      data: medications[medIndex].doses[doseIndex],
    });
  } catch (error) {
    console.error("PUT dose error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
