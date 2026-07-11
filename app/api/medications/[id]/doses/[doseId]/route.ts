//app/api/medications/[id]/doses/[doseId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";
import { z } from "zod";
import logger from "@/app/utils/logger";

const doseUpdateSchema = z.object({
  taken: z.boolean().optional(),
  reaction: z.string().optional(),
});

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

  const { id: medicationId, doseId } = await params;
  if (!medicationId || !doseId) {
    return NextResponse.json(
      { success: false, error: "Missing medication or dose ID" },
      { status: 400 },
    );
  }

  try {
    const body = await request.json();
    const parseResult = doseUpdateSchema.safeParse(body);
    if (!parseResult.success) {
      logger.warn({
        uid,
        medicationId,
        doseId,
        message: "Invalid dose update payload",
        validationErrors: parseResult.error.flatten(),
      });
      return NextResponse.json(
        {
          success: false,
          error: "Invalid update data",
          details: parseResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { taken, reaction } = parseResult.data;
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

    const doses = medications[medIndex].doses || [];
    const doseIndex = doses.findIndex((d: any) => d.id === doseId);
    if (doseIndex === -1) {
      return NextResponse.json(
        { success: false, error: "Dose not found" },
        { status: 404 },
      );
    }

    if (taken) {
      doses[doseIndex].takenAt = new Date().toISOString();
    }
    if (reaction !== undefined) {
      doses[doseIndex].reaction = reaction;
    }

    await medsRef.set(medications);
    logger.info({ uid, medicationId, doseId, message: "Dose updated" });
    return NextResponse.json({ success: true, data: doses[doseIndex] });
  } catch (error) {
    logger.error({
      uid,
      medicationId,
      doseId,
      message: "PUT dose failed",
      error,
    });
    return NextResponse.json(
      { success: false, error: "Unable to update dose" },
      { status: 500 },
    );
  }
}
