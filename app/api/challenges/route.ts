import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";
import { z } from "zod";
import logger from "@/app/utils/logger";

const ChallengeCreateSchema = z.object({
  name: z.string().min(3).max(50),
  description: z.string().min(5).max(250),
  activity: z.string(),
  targetValue: z.number().positive(),
  targetUnit: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  isPublic: z.boolean(),
  creatorName: z.string().optional(),
  creatorPhoto: z.string().url().optional().nullable(),
});

function generateInviteCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function awardPoints(
  uid: string,
  points: number,
  reason: string,
  challengeId: string | null,
) {
  if (!challengeId) return;

  const pointsRef = adminDb.ref(`doza/users/${uid}/points`);
  const pointsSnap = await pointsRef.once("value");
  const currentPoints = pointsSnap.val() || { total: 0, history: [] };

  const newTotal = currentPoints.total + points;
  const entry = {
    points,
    reason,
    challengeId,
    timestamp: Date.now(),
  };

  await pointsRef.set({
    total: newTotal,
    history: [...(currentPoints.history || []), entry],
  });

  const leaderboardRef = adminDb.ref("doza/leaderboard");
  await leaderboardRef.child(uid).set({
    uid,
    totalPoints: newTotal,
    updatedAt: Date.now(),
  });
}

export async function GET(request: NextRequest) {
  const uid = await verifyIdToken(request);
  if (!uid) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const visibility = searchParams.get("visibility");
  const search = searchParams.get("search") || "";
  const activity = searchParams.get("activity") || "";

  try {
    let challengesRef: any = adminDb.ref("doza/challenges");

    if (visibility === "public") {
      challengesRef = challengesRef.orderByChild("isPublic").equalTo(true);
    } else if (type === "my") {
      challengesRef = challengesRef.limitToLast(100);
    }

    const snapshot = await challengesRef.once("value");
    const allChallenges = snapshot.val() || {};

    let challenges = Object.entries(allChallenges).map(([id, data]) => ({
      id,
      ...(data as any),
    }));

    if (type === "my") {
      challenges = challenges.filter(
        (c: any) =>
          c.creatorId === uid || (c.participants && c.participants[uid]),
      );
    }

    if (search) {
      challenges = challenges.filter((c: any) =>
        c.name?.toLowerCase().includes(search.toLowerCase()),
      );
    }

    if (activity) {
      challenges = challenges.filter((c: any) => c.activity === activity);
    }

    return NextResponse.json({ success: true, data: challenges.reverse() });
  } catch (error) {
    logger.error({
      uid,
      message: "GET challenges failed",
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, error: "Unable to load challenges" },
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
    const rawBody = await request.json();
    const result = ChallengeCreateSchema.safeParse(rawBody);

    if (!result.success) {
      logger.warn({
        uid,
        message: "Invalid challenge creation",
        validationErrors: result.error.flatten(),
      });
      return NextResponse.json(
        {
          success: false,
          error: "Invalid challenge data",
          details: result.error.flatten(),
        },
        { status: 400 },
      );
    }

    const body = result.data;
    const challengesRef = adminDb.ref("doza/challenges");

    // Check 5-challenge limit
    const snapshot = await challengesRef
      .orderByChild("creatorId")
      .equalTo(uid)
      .once("value");
    const existingChallenges = snapshot.val() || {};

    const activeChallenges = Object.values(existingChallenges).filter(
      (c: any) => new Date(c.endDate) >= new Date(),
    ).length;

    if (activeChallenges >= 5) {
      return NextResponse.json(
        {
          success: false,
          error: "You can only have 5 active challenges at a time",
        },
        { status: 400 },
      );
    }

    // Check cooldown (1 challenge per 24 hours)
    const lastCreated = Object.values(existingChallenges)
      .filter((c: any) => c.creatorId === uid)
      .sort((a: any, b: any) => b.createdAt - a.createdAt)[0] as any;

    if (lastCreated && Date.now() - lastCreated.createdAt < 86400000) {
      return NextResponse.json(
        { success: false, error: "You can only create one challenge per day" },
        { status: 400 },
      );
    }

    const newChallengeRef = challengesRef.push();
    const challengeId = newChallengeRef.key;

    const challengeData: any = {
      ...body,
      id: challengeId,
      creatorId: uid,
      creatorName: body.creatorName || "Anonymous",
      creatorPhoto: body.creatorPhoto || null,
      createdAt: Date.now(),
      participantCount: 1,
      participants: {
        [uid]: {
          userId: uid,
          name: body.creatorName || "Anonymous",
          photo: body.creatorPhoto || null,
          joinedAt: Date.now(),
          progress: 0,
          completed: false,
        },
      },
      joinRequests: {},
      comments: {},
    };

    if (!body.isPublic) {
      let code = generateInviteCode();
      let existing = await challengesRef
        .orderByChild("code")
        .equalTo(code)
        .once("value");
      while (existing.exists()) {
        code = generateInviteCode();
        existing = await challengesRef
          .orderByChild("code")
          .equalTo(code)
          .once("value");
      }
      challengeData.code = code;
    }

    await newChallengeRef.set(challengeData);

    if (challengeId) {
      await awardPoints(uid, 20, "challenge_created", challengeId);
    }

    logger.info({ uid, challengeId, message: "Challenge created" });
    return NextResponse.json({
      success: true,
      data: { id: challengeId, code: challengeData.code || null },
    });
  } catch (error) {
    logger.error({
      uid,
      message: "POST challenge failed",
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, error: "Unable to create challenge" },
      { status: 500 },
    );
  }
}
