// app/api/medications/[id]/route.ts

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

// ─── UPDATED SCHEMA ──────────────────────────────────────────────
// Now accepts `endDate` (previously stripped → bug where stopping a
// medication never persisted the end date). Also `.nullish()` so a
// client can clear `endDate` by sending null.
const medicationUpdateSchema = z.object({
  status: z.enum(["active", "completed", "paused"]).optional(),
  endDate: z.string().nullish(),
  doses: z
    .array(
      z
        .object({
          id: z.string().optional(),
          scheduledTime: z.string().datetime(),
          takenAt: z.string().datetime().nullish(),
          reaction: z.string().nullish(),
          skipped: z.boolean().optional(),
        })
        .passthrough(),
    )
    .optional(),
});

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
    const parseResult = medicationUpdateSchema.safeParse(body);
    if (!parseResult.success) {
      logger.warn({
        uid,
        medicationId,
        message: "Invalid update",
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

    const updateData = parseResult.data;
    const medsRef = adminDb.ref(`doza/users/${uid}/medications`);
    const snapshot = await medsRef.once("value");
    let medications = snapshot.val() || [];
    if (!Array.isArray(medications)) medications = Object.values(medications);

    const medIndex = medications.findIndex((m: any) => m.id === medicationId);
    if (medIndex === -1) {
      return NextResponse.json(
        { success: false, error: "Medication not found" },
        { status: 404 },
      );
    }

    if (updateData.status !== undefined) {
      medications[medIndex].status = updateData.status;
    }
    // ─── KEY FIX: now applies endDate ───────────────────────────
    if (updateData.endDate !== undefined) {
      medications[medIndex].endDate = updateData.endDate;
    }
    if (updateData.doses !== undefined) {
      medications[medIndex].doses = updateData.doses;
    }

    // Safety net: strip any undefined from legacy records
    await medsRef.set(stripUndefined(medications));

    logger.info({
      uid,
      medicationId,
      update: updateData,
      message: "Medication updated",
    });
    return NextResponse.json({ success: true, data: medications[medIndex] });
  } catch (error) {
    logger.error({
      uid,
      medicationId,
      message: "PUT medication failed",
      error,
    });
    return NextResponse.json(
      { success: false, error: "Unable to update medication" },
      { status: 500 },
    );
  }
}

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
    await medsRef.set(stripUndefined(newMeds));

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
