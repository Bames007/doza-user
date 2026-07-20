import { NextRequest, NextResponse } from "next/server";
import { verifySessionCookie } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";
import { z } from "zod";
import logger from "@/app/utils/logger";

const statusUpdateSchema = z.object({
  status: z.enum(["active", "completed", "paused"]),
});

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const uid = await verifySessionCookie(request);
  if (!uid) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { id: medicationId } = await params;
  if (!medicationId) {
    return NextResponse.json(
      { success: false, error: "Medication ID required" },
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

    logger.info({ uid, medicationId, message: "Medication deleted" });
    return NextResponse.json({
      success: true,
      data: { deleted: medicationId },
    });
  } catch (error) {
    logger.error({
      uid,
      medicationId,
      message: "DELETE medication failed",
      error,
    });
    return NextResponse.json(
      { success: false, error: "Unable to delete medication" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const uid = await verifySessionCookie(request);
  if (!uid) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { id: medicationId } = await params;
  if (!medicationId) {
    return NextResponse.json(
      { success: false, error: "Medication ID required" },
      { status: 400 },
    );
  }

  try {
    const body = await request.json();
    const parseResult = statusUpdateSchema.safeParse(body);
    if (!parseResult.success) {
      logger.warn({
        uid,
        medicationId,
        message: "Invalid status update",
        validationErrors: parseResult.error.flatten(),
      });
      return NextResponse.json(
        {
          success: false,
          error: "Invalid status",
          details: parseResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { status } = parseResult.data;
    const medsRef = adminDb.ref(`doza/users/${uid}/medications`);
    const snapshot = await medsRef.once("value");
    let medications = snapshot.val() || [];

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

    medications[medIndex].status = status;
    await medsRef.set(medications);

    logger.info({
      uid,
      medicationId,
      newStatus: status,
      message: "Medication status updated",
    });
    return NextResponse.json({ success: true, data: medications[medIndex] });
  } catch (error) {
    logger.error({
      uid,
      medicationId,
      message: "PUT medication status failed",
      error,
    });
    return NextResponse.json(
      { success: false, error: "Unable to update medication" },
      { status: 500 },
    );
  }
}
