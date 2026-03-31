//api/challenges/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";

function generateInviteCode(length = 6) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
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
  const search = searchParams.get("search") || "";
  const activity = searchParams.get("activity") || "";
  const visibility = searchParams.get("visibility");

  try {
    const challengesRef = adminDb.ref("doza/challenges");
    const snapshot = await challengesRef.once("value");
    const allChallenges = snapshot.val() || {};

    let challenges = Object.entries(allChallenges).map(([id, data]) => ({
      id,
      ...(data as any),
    }));

    if (type === "my") {
      // ✅ Only challenges where user is creator OR participant
      challenges = challenges.filter(
        (c: any) =>
          c.creatorId === uid || (c.participants && c.participants[uid]),
      );
    } else if (visibility === "public") {
      challenges = challenges.filter((c: any) => c.isPublic === true);
      if (activity) {
        challenges = challenges.filter((c: any) => c.activity === activity);
      }
      if (search) {
        challenges = challenges.filter((c: any) =>
          c.name?.toLowerCase().includes(search.toLowerCase()),
        );
      }
    }

    return NextResponse.json({ success: true, data: challenges });
  } catch (error) {
    console.error("GET challenges error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
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
    if (
      !body.name ||
      !body.description ||
      !body.activity ||
      !body.targetValue ||
      !body.targetUnit ||
      !body.startDate ||
      !body.endDate
    ) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    const challengesRef = adminDb.ref("doza/challenges");
    const snapshot = await challengesRef.once("value");
    const allChallenges = snapshot.val() || {};
    const createdByUser = Object.values(allChallenges).filter(
      (c: any) => c.creatorId === uid,
    ).length;
    if (createdByUser >= 5) {
      return NextResponse.json(
        { success: false, error: "You can only create up to 5 challenges" },
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

    return NextResponse.json({ success: true, data: { id: challengeId } });
  } catch (error) {
    console.error("POST challenge error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
