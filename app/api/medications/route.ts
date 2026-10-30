// app/api/medications/route.ts

import { NextRequest, NextResponse } from "next/server";
import { verifySessionCookie } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";
import { z } from "zod";
import logger from "@/app/utils/logger";

// ─── Deep-strip undefined (Firebase RTDB rejects any undefined) ───
// Keeps `null`, drops only `undefined`. Recurses through objects + arrays.
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

function generateDoses(
  startDate: string,
  endDate: string | undefined,
  times: string[],
  totalQuantity?: number,
) {
  const doses: any[] = [];
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDoses = totalQuantity && totalQuantity > 0 ? totalQuantity : 90;
  let doseCount = 0;
  let dayOffset = 0;
  while (doseCount < maxDoses) {
    const date = new Date(start);
    date.setDate(start.getDate() + dayOffset);
    if (end && date > end) break;
    if (date < today) {
      dayOffset++;
      continue;
    }
    const dayTimes = times.length > 0 ? times : ["08:00"];
    for (const time of dayTimes) {
      if (doseCount >= maxDoses) break;
      const [hours, minutes] = time.split(":").map(Number);
      if (isNaN(hours) || isNaN(minutes)) continue;
      const scheduled = new Date(date);
      scheduled.setHours(hours, minutes, 0, 0);
      doses.push({
        id: `${date.toISOString().split("T")[0]}-${time.replace(":", "")}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        scheduledTime: scheduled.toISOString(),
      });
      doseCount++;
    }
    dayOffset++;
  }
  return doses;
}

// `.nullish()` accepts string | null | undefined.
// This matches what our client sends (null for unknown fields).
const createMedicationSchema = z
  .object({
    name: z.string().min(1),
    dosage: z.string().min(1),
    frequency: z.enum(["once", "twice", "thrice", "custom"]),
    times: z.array(z.string()).optional(),
    instructions: z.string().nullish(),
    startDate: z.string().min(1),
    endDate: z.string().nullish(),
    assignedTo: z.string().min(1),
    quantityPerDose: z.number().optional(),
    totalQuantity: z.number().optional(),
    durationDays: z.number().nullish(),
    prescriptionId: z.string().nullish(),
    centerId: z.string().nullish(),
    sourceType: z.enum(["hospital", "external"]).nullish(),
    status: z.enum(["active", "completed", "paused"]).optional(),
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
  })
  .passthrough();

export async function GET(request: NextRequest) {
  const uid = await verifySessionCookie(request);
  if (!uid) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get("memberId") || "self";

  // ── Stage 1: Firebase read ────────────────────────────────────
  let raw: any;
  try {
    const medsRef = adminDb.ref(`doza/users/${uid}/medications`);
    const snapshot = await medsRef.once("value");
    raw = snapshot.val();
  } catch (err: any) {
    // Log EVERYTHING explicitly — do not rely on the logger to
    // serialize an Error instance (that's how you got `{}`).
    logger.error({
      uid,
      memberId,
      stage: "firebase-read",
      errorMessage: err?.message ?? String(err),
      errorCode: err?.code,
      errorName: err?.name,
      errorStack: err?.stack,
      errorKeys: err && typeof err === "object" ? Object.keys(err) : [],
    });
    return NextResponse.json(
      { success: false, error: "Unable to read medication data" },
      { status: 500 },
    );
  }

  // ── Stage 2: Data processing ──────────────────────────────────
  try {
    // Diagnostic: log the raw shape so we can spot corruption.
    logger.info({
      uid,
      memberId,
      rawType: typeof raw,
      rawIsArray: Array.isArray(raw),
      rawIsObject:
        raw !== null && typeof raw === "object" && !Array.isArray(raw),
      rawTopLevelKeys:
        raw && typeof raw === "object" && !Array.isArray(raw)
          ? Object.keys(raw).slice(0, 10)
          : null,
      rawArrayLength: Array.isArray(raw) ? raw.length : null,
      message: "GET medications — data shape",
    });

    let medications: any[] = [];

    if (!raw) {
      medications = [];
    } else if (Array.isArray(raw)) {
      // Filter out any null/undefined/primitive entries that could
      // have been written by a malformed legacy write.
      medications = raw.filter(
        (m) => m != null && typeof m === "object" && !Array.isArray(m),
      );
    } else if (typeof raw === "object") {
      medications = Object.values(raw).filter(
        (m) => m != null && typeof m === "object" && !Array.isArray(m),
      );
    } else {
      // Primitive at this node — treat as empty rather than throwing.
      logger.warn({
        uid,
        rawType: typeof raw,
        rawValue: String(raw).slice(0, 100),
        message: "GET medications — medications node has unexpected primitive",
      });
      medications = [];
    }

    if (memberId !== "all") {
      medications = medications.filter(
        (m: any) => m && m.assignedTo === memberId,
      );
    }

    return NextResponse.json({ success: true, data: medications });
  } catch (err: any) {
    logger.error({
      uid,
      memberId,
      stage: "process",
      errorMessage: err?.message ?? String(err),
      errorCode: err?.code,
      errorName: err?.name,
      errorStack: err?.stack,
    });
    return NextResponse.json(
      {
        success: false,
        error: "Unable to process medication data",
        ...(process.env.NODE_ENV !== "production" && {
          detail: err?.message ?? String(err),
        }),
      },
      { status: 500 },
    );
  }
}

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

    logger.info({ uid, body }, "Received medication creation request");

    const parseResult = createMedicationSchema.safeParse(body);
    if (!parseResult.success) {
      logger.warn({
        uid,
        message: "Invalid medication creation data",
        validationErrors: parseResult.error.flatten(),
      });
      return NextResponse.json(
        {
          success: false,
          error: "Invalid medication data",
          details: parseResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const data = parseResult.data;

    // Normalize times array
    let finalTimes: string[] = data.times || [];
    if (!Array.isArray(finalTimes)) finalTimes = [];
    if (data.frequency === "once") finalTimes = ["08:00"];
    else if (data.frequency === "twice") finalTimes = ["08:00", "20:00"];
    else if (data.frequency === "thrice")
      finalTimes = ["08:00", "14:00", "20:00"];

    // Normalize doses
    let doses = data.doses || [];
    if (!Array.isArray(doses)) doses = [];
    if (doses.length === 0) {
      const totalQty = data.totalQuantity || 0;
      doses = generateDoses(
        data.startDate,
        data.endDate ?? undefined,
        finalTimes,
        totalQty,
      );
    }

    // ─── KEY FIX ─────────────────────────────────────────────────
    // Every optional field defaults to `null`, and we wrap the whole
    // object in `stripUndefined` before writing to Firebase. This
    // makes the endpoint bulletproof against missing fields.
    const newMedication = stripUndefined({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      name: data.name,
      dosage: data.dosage,
      frequency: data.frequency,
      times: finalTimes,
      instructions: data.instructions ?? null,
      startDate: data.startDate,
      endDate: data.endDate ?? null,
      assignedTo: data.assignedTo,
      status: data.status ?? "active",
      doses,
      createdAt: new Date().toISOString(),
      quantityPerDose: data.quantityPerDose ?? 1,
      totalQuantity: data.totalQuantity ?? 0,
      durationDays: data.durationDays ?? null,
      prescriptionId: data.prescriptionId ?? null,
      centerId: data.centerId ?? null,
      sourceType: data.sourceType ?? null,
    });

    const medsRef = adminDb.ref(`doza/users/${uid}/medications`);
    const snapshot = await medsRef.once("value");
    let medications = snapshot.val();
    if (!medications) {
      medications = [];
    } else if (!Array.isArray(medications)) {
      medications = Object.values(medications);
    }
    medications.push(newMedication);

    // ─── Safety net ──────────────────────────────────────────────
    // If a legacy record somewhere in the array has undefined, this
    // prevents the WHOLE write from failing.
    await medsRef.set(stripUndefined(medications));

    logger.info({
      uid,
      medicationId: newMedication.id,
      message: "Medication created",
    });
    return NextResponse.json({ success: true, data: newMedication });
  } catch (error) {
    logger.error({
      uid,
      message: "POST medication failed",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { success: false, error: "Unable to create medication" },
      { status: 500 },
    );
  }
}
