//app/api/medications/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const uid = await verifyIdToken(request);
  if (!uid) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const medicationId = params.id;
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
