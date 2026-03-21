import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";

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
    const { code } = body;
    if (!code) {
      return NextResponse.json(
        { success: false, error: "Missing code" },
        { status: 400 },
      );
    }

    // Find challenge with this code
    const challengesRef = adminDb.ref("doza/challenges");
    const snapshot = await challengesRef
      .orderByChild("code")
      .equalTo(code)
      .once("value");
    const challenges = snapshot.val();
    if (!challenges) {
      return NextResponse.json(
        { success: false, error: "Invalid code" },
        { status: 404 },
      );
    }

    // There should be only one (code is unique)
    const challengeId = Object.keys(challenges)[0];
    const challenge = challenges[challengeId];

    // Check if already participant
    if (challenge.participants && challenge.participants[uid]) {
      return NextResponse.json(
        { success: false, error: "Already joined" },
        { status: 400 },
      );
    }

    // Check join limit
    const allChallengesRef = adminDb.ref("doza/challenges");
    const allSnapshot = await allChallengesRef.once("value");
    const allChallenges = allSnapshot.val() || {};
    const joinedCount = Object.values(allChallenges).filter(
      (c: any) => c.participants && c.participants[uid],
    ).length;
    if (joinedCount >= 10) {
      return NextResponse.json(
        { success: false, error: "You can join up to 10 challenges" },
        { status: 400 },
      );
    }

    // Add participant (similar to join)
    const userName = body.userName || "Anonymous";
    const userPhoto = body.userPhoto || null;

    const challengeRef = adminDb.ref(`doza/challenges/${challengeId}`);
    const updates: any = {};
    updates[`participants/${uid}`] = {
      userId: uid,
      name: userName,
      photo: userPhoto,
      joinedAt: Date.now(),
      progress: 0,
      completed: false,
    };
    updates.participantCount = (challenge.participantCount || 0) + 1;

    await challengeRef.update(updates);

    return NextResponse.json({ success: true, data: { challengeId } });
  } catch (error) {
    console.error("POST join-by-code error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
