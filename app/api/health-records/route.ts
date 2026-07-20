import { NextRequest, NextResponse } from "next/server";
import { verifySessionCookie } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";
import { z } from "zod";
import logger from "@/app/utils/logger";

const BloodPressureSchema = z.object({
  systolic: z.number().min(50).max(250),
  diastolic: z.number().min(30).max(150),
});

const RecordPayloadSchema = z.object({
  date: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  type: z.enum(["heartRate", "bloodPressure", "steps", "weight"]),
  value: z.any(),
});

export async function GET(request: NextRequest) {
  const uid = await verifySessionCookie(request);
  if (!uid) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const type = searchParams.get("type");

  try {
    // Use .get() instead of .once("value") to avoid listen() errors
    const recordsRef = adminDb.ref(`doza/users/${uid}/healthRecords`);
    const snapshot = await recordsRef.get();

    if (!snapshot.exists()) {
      return NextResponse.json({ success: true, data: [] });
    }

    const val = snapshot.val();
    let records = Object.entries(val).map(([id, data]) => ({
      id,
      ...(data as any),
    }));

    // Filter by type
    if (type) {
      records = records.filter((r: any) => r.type === type);
    }

    // Filter by date range
    if (from) {
      records = records.filter((r: any) => r.date >= from);
    }
    if (to) {
      records = records.filter((r: any) => r.date <= to);
    }

    // Sort by date (newest first)
    records.sort(
      (a: any, b: any) =>
        new Date(b.date || b.createdAt).getTime() -
        new Date(a.date || a.createdAt).getTime(),
    );

    // Limit to last 200 records
    return NextResponse.json({
      success: true,
      data: records.slice(0, 200),
    });
  } catch (error) {
    logger.error({
      uid,
      message: "GET health records failed",
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, error: "Unable to load health records" },
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
    const rawBody = await request.json();
    const validation = RecordPayloadSchema.safeParse(rawBody);

    if (!validation.success) {
      logger.warn({
        uid,
        message: "Invalid health record payload",
        validationErrors: validation.error.flatten(),
      });
      return NextResponse.json(
        {
          success: false,
          error: "Invalid data provided",
          details: validation.error.flatten(),
        },
        { status: 400 },
      );
    }

    const record = validation.data;

    // Validate blood pressure specifically
    if (record.type === "bloodPressure") {
      const bpValidation = BloodPressureSchema.safeParse(record.value);
      if (!bpValidation.success) {
        logger.warn({
          uid,
          message: "Invalid blood pressure values",
          validationErrors: bpValidation.error.flatten(),
        });
        return NextResponse.json(
          {
            success: false,
            error:
              "Blood pressure requires systolic & diastolic (numbers 50-250 / 30-150)",
          },
          { status: 400 },
        );
      }
    } else if (typeof record.value !== "number") {
      // Ensure other types have numeric values
      const coerced = parseFloat(record.value);
      if (isNaN(coerced)) {
        return NextResponse.json(
          { success: false, error: "Value must be a valid number" },
          { status: 400 },
        );
      }
      record.value = coerced;
    }

    // Save to Firebase
    const userRecordsRef = adminDb.ref(`doza/users/${uid}/healthRecords`);
    const targetRef = userRecordsRef.push();
    const recordId = targetRef.key;

    const finalRecord = {
      ...record,
      id: recordId,
      createdAt: Date.now(),
    };

    await targetRef.set(finalRecord);

    logger.info({
      uid,
      recordId,
      recordType: record.type,
      message: "Health record added",
    });

    return NextResponse.json(
      { success: true, data: finalRecord },
      { status: 201 },
    );
  } catch (error) {
    logger.error({
      uid,
      message: "POST health record failed",
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, error: "Unable to save health record" },
      { status: 500 },
    );
  }
}
