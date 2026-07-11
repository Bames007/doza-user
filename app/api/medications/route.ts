//app/api/medications/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";
import { z } from "zod";
import logger from "@/app/utils/logger";

function generateDoses(
  startDate: string,
  endDate: string | undefined,
  times: string[],
) {
  const doses: any[] = [];
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const maxDays = 30;
  for (let i = 0; i < maxDays; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    if (end && date > end) break;
    if (date < today) continue;

    times.forEach((time) => {
      const [hours, minutes] = time.split(":").map(Number);
      const scheduled = new Date(date);
      scheduled.setHours(hours, minutes, 0, 0);
      doses.push({
        id: `${date.toISOString().split("T")[0]}-${time.replace(":", "")}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        scheduledTime: scheduled.toISOString(),
      });
    });
  }
  return doses;
}

const createMedicationSchema = z.object({
  name: z.string().min(1),
  dosage: z.string().min(1),
  frequency: z.enum(["once", "twice", "thrice", "custom"]),
  times: z.array(z.string()).optional(),
  instructions: z.string().optional(),
  startDate: z.string().min(1),
  endDate: z.string().optional(),
  assignedTo: z.string().min(1),
});

export async function GET(request: NextRequest) {
  const uid = await verifyIdToken(request);
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
  const uid = await verifyIdToken(request);
  if (!uid) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();
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
    let finalTimes: string[] = data.times || [];
    if (data.frequency === "once") finalTimes = ["08:00"];
    else if (data.frequency === "twice") finalTimes = ["08:00", "20:00"];
    else if (data.frequency === "thrice")
      finalTimes = ["08:00", "14:00", "20:00"];

    const doses = generateDoses(data.startDate, data.endDate, finalTimes);

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
      status: "active",
      doses,
      createdAt: new Date().toISOString(),
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
    logger.error({ uid, message: "POST medication failed", error });
    return NextResponse.json(
      { success: false, error: "Unable to create medication" },
      { status: 500 },
    );
  }
}
