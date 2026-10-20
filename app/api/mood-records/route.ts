// app/api/mood-records/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifySessionCookie } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";
import { z } from "zod";
import logger from "@/app/utils/logger";

const MoodPayloadSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  moodScore: z.number().int().min(1).max(6),
  comment: z.string().max(500).optional().default(""),
  talkedToMedic: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  const uid = await verifySessionCookie(request);
  if (!uid) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }
  try {
    const ref = adminDb.ref(`doza/users/${uid}/moodRecords`);
    const snapshot = await ref.get();
    if (!snapshot.exists()) {
      return NextResponse.json({ success: true, data: [] });
    }
    const val = snapshot.val();
    const records = Object.entries(val).map(([id, data]) => ({
      id,
      ...(data as any),
    }));
    records.sort(
      (a: any, b: any) =>
        new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    return NextResponse.json({ success: true, data: records.slice(0, 200) });
  } catch (error) {
    logger.error({
      uid,
      message: "GET mood records failed",
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, error: "Unable to load moods" },
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
    const validation = MoodPayloadSchema.safeParse(rawBody);

    if (!validation.success) {
      logger.warn({
        uid,
        message: "Invalid mood payload",
        validationErrors: validation.error.flatten(),
      });
      return NextResponse.json(
        {
          success: false,
          error: "Invalid mood data",
          details: validation.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { date, moodScore, comment, talkedToMedic } = validation.data;
    const userRef = adminDb.ref(`doza/users/${uid}/moodRecords`);

    // ─── Upsert: update if a record already exists for this date ───
    const snapshot = await userRef.orderByChild("date").equalTo(date).get();

    if (snapshot.exists()) {
      const val = snapshot.val();
      const keys = Object.keys(val);
      const updates: any = { moodScore, comment: comment || "" };
      if (typeof talkedToMedic === "boolean") {
        updates.talkedToMedic = talkedToMedic;
      }
      updates.updatedAt = Date.now();

      await Promise.all(keys.map((k) => userRef.child(k).update(updates)));

      const primaryKey = keys[0];
      const updatedRecord = {
        id: primaryKey,
        ...val[primaryKey],
        ...updates,
      };

      logger.info({
        uid,
        recordId: primaryKey,
        message: "Mood record updated",
      });
      return NextResponse.json({
        success: true,
        data: updatedRecord,
        updated: true,
      });
    }

    // ─── Create new ───
    const targetRef = userRef.push();
    const recordId = targetRef.key;
    const finalRecord = {
      id: recordId,
      date,
      moodScore,
      comment: comment || "",
      talkedToMedic: talkedToMedic ?? false,
      createdAt: Date.now(),
    };
    await targetRef.set(finalRecord);

    logger.info({ uid, recordId, moodScore, message: "Mood record added" });
    return NextResponse.json(
      { success: true, data: finalRecord, created: true },
      { status: 201 },
    );
  } catch (error) {
    logger.error({
      uid,
      message: "POST mood record failed",
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, error: "Unable to save mood" },
      { status: 500 },
    );
  }
}
