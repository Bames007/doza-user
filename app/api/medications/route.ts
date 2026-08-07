// app/api/medications/route.ts

import { NextRequest, NextResponse } from "next/server";
import { verifySessionCookie } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";
import { z } from "zod";
import logger from "@/app/utils/logger";

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

// Schema with passthrough to allow extra fields
const createMedicationSchema = z
  .object({
    name: z.string().min(1),
    dosage: z.string().min(1),
    frequency: z.enum(["once", "twice", "thrice", "custom"]),
    times: z.array(z.string()).optional(),
    instructions: z.string().optional(),
    startDate: z.string().min(1),
    endDate: z.string().optional(),
    assignedTo: z.string().min(1),
    quantityPerDose: z.number().optional(),
    totalQuantity: z.number().optional(),
    durationDays: z.number().optional(),
    prescriptionId: z.string().optional(),
    centerId: z.string().optional(),
    sourceType: z.enum(["hospital", "external"]).optional(),
    status: z.enum(["active", "completed", "paused"]).optional(),
    doses: z
      .array(
        z
          .object({
            id: z.string().optional(),
            scheduledTime: z.string().datetime(),
            takenAt: z.string().datetime().optional(),
            reaction: z.string().optional(),
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

  try {
    const medsRef = adminDb.ref(`doza/users/${uid}/medications`);
    const snapshot = await medsRef.once("value");
    let medications = snapshot.val();

    if (!medications) {
      medications = [];
    } else if (!Array.isArray(medications)) {
      medications = Object.values(medications);
    }

    if (memberId !== "all") {
      medications = medications.filter((m: any) => m.assignedTo === memberId);
    }

    return NextResponse.json({ success: true, data: medications });
  } catch (error) {
    logger.error({ uid, message: "GET medications failed", error });
    return NextResponse.json(
      { success: false, error: "Unable to load medications" },
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

    // Ensure times is an array
    let finalTimes: string[] = data.times || [];
    if (!Array.isArray(finalTimes)) {
      finalTimes = [];
    }
    if (data.frequency === "once") finalTimes = ["08:00"];
    else if (data.frequency === "twice") finalTimes = ["08:00", "20:00"];
    else if (data.frequency === "thrice")
      finalTimes = ["08:00", "14:00", "20:00"];

    // Use provided doses or generate fallback
    let doses = data.doses || [];
    if (!Array.isArray(doses)) doses = [];
    if (doses.length === 0) {
      const totalQty = data.totalQuantity || 0;
      doses = generateDoses(data.startDate, data.endDate, finalTimes, totalQty);
    }

    // Build the medication object
    const newMedication = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      name: data.name,
      dosage: data.dosage,
      frequency: data.frequency,
      times: finalTimes,
      instructions: data.instructions || "",
      startDate: data.startDate,
      endDate: data.endDate || null,
      assignedTo: data.assignedTo,
      status: data.status || "active",
      doses,
      createdAt: new Date().toISOString(),
      quantityPerDose: data.quantityPerDose,
      totalQuantity: data.totalQuantity,
      durationDays: data.durationDays,
      prescriptionId: data.prescriptionId,
      centerId: data.centerId,
      sourceType: data.sourceType,
    };

    const medsRef = adminDb.ref(`doza/users/${uid}/medications`);
    const snapshot = await medsRef.once("value");
    let medications = snapshot.val();
    if (!medications) {
      medications = [];
    } else if (!Array.isArray(medications)) {
      medications = Object.values(medications);
    }
    medications.push(newMedication);
    await medsRef.set(medications);

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
