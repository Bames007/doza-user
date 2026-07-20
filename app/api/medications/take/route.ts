import { NextRequest, NextResponse } from "next/server";
import { verifySessionCookie } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";
import { z } from "zod";
import logger from "@/app/utils/logger";

const takeDoseSchema = z.object({
  medicationId: z.string().min(1),
  scheduledTime: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const uid = await verifySessionCookie(request);
  if (!uid) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();
    const parseResult = takeDoseSchema.safeParse(body);
    if (!parseResult.success) {
      logger.warn({
        uid,
        message: "Invalid take dose request",
        validationErrors: parseResult.error.flatten(),
      });
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request data",
          details: parseResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { medicationId, scheduledTime } = parseResult.data;
    const medsRef = adminDb.ref(`doza/users/${uid}/medications`);
    const snapshot = await medsRef.once("value");
    let medications = snapshot.val();

    if (!medications) {
      return NextResponse.json(
        { success: false, error: "No medications found" },
        { status: 404 },
      );
    }

    const isArray = Array.isArray(medications);
    const medEntries: [string | number, any][] = isArray
      ? medications.map((m: any, idx: number) => [idx, m])
      : Object.entries(medications);

    let targetMed: any = null;
    let targetKey: string | number | null = null;

    for (const [key, val] of medEntries) {
      if (val.id === medicationId) {
        targetMed = val;
        targetKey = key;
        break;
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
      await adminDb
        .ref(`doza/users/${uid}/medications/${targetKey}/doses/${doseIndex}`)
        .update({ takenAt: new Date().toISOString() });
      logger.info({ uid, medicationId, doseIndex, message: "Dose taken" });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, error: "Dose not found" },
      { status: 404 },
    );
  } catch (error) {
    logger.error({ uid, message: "Take dose failed", error });
    return NextResponse.json(
      { success: false, error: "Unable to record dose" },
      { status: 500 },
    );
  }
}
