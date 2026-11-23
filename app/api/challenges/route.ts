import { NextRequest, NextResponse } from "next/server";
import { verifySessionCookie } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";
import { z } from "zod";
import logger from "@/app/utils/logger";
import { awardPoints } from "@/app/server/awardPoints";
import { getProfile } from "@/app/server/getProfile";

// ─── Schemas ─────────────────────────────────────────────────

const ChallengeCreateSchema = z
  .object({
    name: z.string().min(3).max(50),
    description: z.string().min(5).max(250),
    activity: z.string(),
    targetValue: z.number().positive(),
    targetUnit: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    isPublic: z.boolean(),
    imageUrl: z
      .string()
      .optional()
      .nullable()
      .refine((v) => !v || /^https?:\/\/.+/.test(v), {
        message: "imageUrl must be a valid http(s) URL",
      }),
    invitedEmails: z.string().optional().nullable(),
  })
  .refine((d) => new Date(d.endDate) > new Date(d.startDate), {
    message: "End date must be after start date",
    path: ["endDate"],
  });

function generateInviteCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// ─── GET ─────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const uid = await verifySessionCookie(request);
  if (!uid) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type"); // "my" or null
  const visibility = searchParams.get("visibility"); // "public" or null
  const search = (searchParams.get("search") || "").toLowerCase();
  const activity = searchParams.get("activity") || "";

  try {
    const snapshot = await adminDb.ref("doza/challenges").once("value");
    const allChallenges = snapshot.val() || {};

    let challenges = Object.entries(allChallenges).map(([id, data]) => ({
      id,
      ...(data as any),
    }));

    // Privacy gate: hide private challenges the user isn't involved in
    challenges = challenges.filter(
      (c: any) =>
        c.isPublic === true ||
        c.creatorId === uid ||
        (c.participants && c.participants[uid]),
    );

    // type=my → only challenges the user created or joined
    if (type === "my") {
      challenges = challenges.filter(
        (c: any) =>
          c.creatorId === uid || (c.participants && c.participants[uid]),
      );
    }

    // visibility=public → only public challenges
    if (visibility === "public") {
      challenges = challenges.filter((c: any) => c.isPublic === true);
    }

    if (search) {
      challenges = challenges.filter((c: any) =>
        (c.name || "").toLowerCase().includes(search),
      );
    }

    if (activity) {
      challenges = challenges.filter((c: any) => c.activity === activity);
    }

    challenges.sort(
      (a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0),
    );

    return NextResponse.json({ success: true, data: challenges });
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

// ─── POST ────────────────────────────────────────────────────

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
          code: "VALIDATION_ERROR",
          details: result.error.flatten(),
        },
        { status: 400 },
      );
    }

    const body = result.data;
    const challengesRef = adminDb.ref("doza/challenges");

    // 5-active-challenge limit
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
          code: "ACTIVE_LIMIT",
          meta: { activeChallenges, limit: 5 },
        },
        { status: 400 },
      );
    }

    // 24h cooldown
    const lastCreated = Object.values(existingChallenges)
      .filter((c: any) => c.creatorId === uid)
      .sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0))[0] as
      | any
      | undefined;

    if (lastCreated && Date.now() - (lastCreated.createdAt || 0) < 86400000) {
      const nextAllowedAt = (lastCreated.createdAt || 0) + 86400000;
      return NextResponse.json(
        {
          success: false,
          error: "You can only create one challenge per day",
          code: "DAILY_LIMIT",
          meta: { nextAllowedAt },
        },
        { status: 400 },
      );
    }

    const profile = await getProfile(uid);
    const newChallengeRef = challengesRef.push();
    const challengeId = newChallengeRef.key as string;

    const challengeData: any = {
      name: body.name,
      description: body.description,
      activity: body.activity,
      targetValue: body.targetValue,
      targetUnit: body.targetUnit,
      startDate: body.startDate,
      endDate: body.endDate,
      isPublic: body.isPublic,
      imageUrl: body.imageUrl || null,
      invitedEmails: body.invitedEmails || null,
      id: challengeId,
      creatorId: uid,
      creatorName: profile.name,
      creatorPhoto: profile.photo,
      createdAt: Date.now(),
      participantCount: 1,
      participants: {
        [uid]: {
          userId: uid,
          name: profile.name,
          photo: profile.photo,
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
    await awardPoints(uid, 20, "challenge_created", challengeId);

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
