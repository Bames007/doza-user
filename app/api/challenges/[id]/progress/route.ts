import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";
import { z } from "zod";
import logger from "@/app/utils/logger";

const progressSchema = z.object({
  progress: z.number().min(0),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const uid = await verifyIdToken(request);
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

    const oldProgress = challenge.participants[uid].progress || 0;
    const progressIncrease = progress - oldProgress;

    await challengeRef.update({
      [`participants/${uid}/progress`]: progress,
    });

    // Award points for progress (1 point per unit of progress)
    if (progressIncrease > 0) {
      await awardPoints(
        uid,
        Math.floor(progressIncrease),
        "progress_update",
        id,
      );
    }

    // Check if challenge completed
    if (progress >= challenge.targetValue) {
      await challengeRef.update({
        [`participants/${uid}/completed`]: true,
      });

      // Bonus completion points
      await awardPoints(uid, 50, "challenge_completed", id);
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

async function awardPoints(
  uid: string,
  points: number,
  reason: string,
  challengeId: string,
) {
  const pointsRef = adminDb.ref(`doza/users/${uid}/points`);
  const pointsSnap = await pointsRef.once("value");
  const currentPoints = pointsSnap.val() || { total: 0, history: [] };

  const newTotal = currentPoints.total + points;
  await pointsRef.set({
    total: newTotal,
    history: [
      ...(currentPoints.history || []),
      { points, reason, challengeId, timestamp: Date.now() },
    ],
  });

  await adminDb.ref("doza/leaderboard").child(uid).set({
    uid,
    totalPoints: newTotal,
    updatedAt: Date.now(),
  });
}
