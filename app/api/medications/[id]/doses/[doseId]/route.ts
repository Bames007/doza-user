// app/api/medications/[id]/doses/[doseId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifySessionCookie } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";
import { z } from "zod";
import logger from "@/app/utils/logger";

// ─── Deep-strip undefined (Firebase RTDB rejects any undefined) ───
function stripUndefined<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    return value.map(stripUndefined) as unknown as T;
  }
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, stripUndefined(v)]),
    ) as T;
  }
  return value;
}

const doseUpdateSchema = z.object({
  taken: z.boolean().optional(),
  // nullish so the client can send null to explicitly clear a reaction
  reaction: z.string().nullish(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; doseId: string }> },
) {
  const uid = await verifySessionCookie(request);
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

    // Normalize doses to an array; re-assign so mutations persist on set().
    let doses = medications[medIndex].doses || [];
    if (!Array.isArray(doses)) {
      doses = Object.values(doses);
      medications[medIndex].doses = doses;
    }

    const doseIndex = doses.findIndex((d: any) => d.id === doseId);
    if (doseIndex === -1) {
      return NextResponse.json(
        { success: false, error: "Dose not found" },
        { status: 404 },
      );
    }

    // ── taken: true → set takenAt. taken: false → clear takenAt. ──
    if (taken === true) {
      doses[doseIndex].takenAt = new Date().toISOString();
    } else if (taken === false) {
      delete doses[doseIndex].takenAt;
    }

    // ── reaction: null → clear. "" → no-op (preserve existing). ──
    if (reaction === null) {
      delete doses[doseIndex].reaction;
    } else if (typeof reaction === "string" && reaction.trim() !== "") {
      doses[doseIndex].reaction = reaction;
    }

    // ── AUTO-COMPLETE: last dose done → mark medication completed ──
    const med = medications[medIndex];
    const allDone =
      doses.length > 0 && doses.every((d: any) => d.takenAt || d.skipped);
    if (allDone && med.status === "active") {
      med.status = "completed";
      if (!med.endDate) {
        med.endDate = new Date().toISOString().split("T")[0];
      }
    }

    await medsRef.set(stripUndefined(medications));
    logger.info({
      uid,
      medicationId,
      doseId,
      autoCompleted: allDone,
      message: "Dose updated",
    });

    return NextResponse.json({
      success: true,
      data: doses[doseIndex],
      medication: med,
    });
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
