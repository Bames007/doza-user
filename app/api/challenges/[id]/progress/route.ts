import { NextRequest, NextResponse } from "next/server";
import { verifySessionCookie } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";
import { z } from "zod";
import logger from "@/app/utils/logger";
import { awardPoints, awardPointsOnce } from "@/app/server/awardPoints";

const progressSchema = z.object({
  progress: z.number().min(0).max(100000),
});

export async function POST(
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

  const { id } = await params;

  try {
    const body = await request.json();
    const parseResult = progressSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: "Invalid progress value" },
        { status: 400 },
      );
    }

    const { progress } = parseResult.data;
    const challengeRef = adminDb.ref(`doza/challenges/${id}`);
    const snapshot = await challengeRef.once("value");
    const challenge = snapshot.val();

    if (!challenge) {
      return NextResponse.json(
        { success: false, error: "Challenge not found" },
        { status: 404 },
      );
    }

    if (!challenge.participants?.[uid]) {
      return NextResponse.json(
        { success: false, error: "Not a participant" },
        { status: 400 },
      );
    }

    const now = Date.now();
    const start = new Date(challenge.startDate).getTime();
    const end = new Date(challenge.endDate).getTime();

    if (now < start || now > end) {
      return NextResponse.json(
        { success: false, error: "Challenge is not active" },
        { status: 400 },
      );
    }

    if (progress > challenge.targetValue * 2) {
      return NextResponse.json(
        { success: false, error: "Progress exceeds allowed range" },
        { status: 400 },
      );
    }

    const oldProgress = challenge.participants[uid].progress || 0;
    const progressIncrease = progress - oldProgress;

    await challengeRef.update({ [`participants/${uid}/progress`]: progress });

    if (progressIncrease > 0) {
      await awardPoints(
        uid,
        Math.floor(progressIncrease),
        "progress_update",
        id,
      );
    }

    if (
      progress >= challenge.targetValue &&
      !challenge.participants[uid].completed
    ) {
      await challengeRef.update({ [`participants/${uid}/completed`]: true });
      await awardPointsOnce(uid, 50, "challenge_completed", id);
    }

    logger.info({
      uid,
      challengeId: id,
      progress,
      message: "Progress updated",
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({
      uid,
      challengeId: id,
      message: "Progress update failed",
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, error: "Unable to update progress" },
      { status: 500 },
    );
  }
}
