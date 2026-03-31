import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const uid = await verifyIdToken(request);
  if (!uid) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { id: medicationId } = await params;
  if (!medicationId) {
    return NextResponse.json(
      { success: false, error: "Missing medication ID" },
      { status: 400 },
    );
  }

  try {
    const medsRef = adminDb.ref(`doza/users/${uid}/medications`);
    const snapshot = await medsRef.once("value");
    let medications = snapshot.val() || [];
    if (!Array.isArray(medications)) medications = Object.values(medications);

    const newMeds = medications.filter((m: any) => m.id !== medicationId);
    await medsRef.set(newMeds);

    return NextResponse.json({
      success: true,
      data: { deleted: medicationId },
    });
  } catch (error) {
    console.error("DELETE medication error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const uid = await verifyIdToken(request);
  if (!uid) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { id: medicationId } = await params;
  if (!medicationId) {
    return NextResponse.json(
      { success: false, error: "Missing medication ID" },
      { status: 400 },
    );
  }

  try {
    const body = await request.json();
    const { status } = body; // e.g., "completed", "paused"

    if (!status) {
      return NextResponse.json(
        { success: false, error: "Missing status field" },
        { status: 400 },
      );
    }

    const medsRef = adminDb.ref(`doza/users/${uid}/medications`);
    const snapshot = await medsRef.once("value");
    let medications = snapshot.val() || [];

    // Normalize to array
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

    // Update status
    medications[medIndex].status = status;

    // Optional: you might also want to mark all remaining doses as "skipped"
    // For now, just update status.

    await medsRef.set(medications);

    return NextResponse.json({ success: true, data: medications[medIndex] });
  } catch (error) {
    console.error("PUT medication error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
