import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";

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
    const challengeRef = adminDb.ref(`doza/challenges/${id}`);
    const snapshot = await challengeRef.once("value");
    const challenge = snapshot.val();

    if (!challenge) {
      return NextResponse.json(
        { success: false, error: "Challenge not found" },
        { status: 404 },
      );
    }

    if (challenge.creatorId !== uid) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const requestingUserId = body.userId;
    if (!requestingUserId) {
      return NextResponse.json(
        { success: false, error: "Missing userId" },
        { status: 400 },
      );
    }

    const requestData = challenge.joinRequests?.[requestingUserId];
    if (!requestData || requestData.status !== "pending") {
      return NextResponse.json(
        { success: false, error: "No pending request from this user" },
        { status: 404 },
      );
    }

    // Optional: limit check for the requesting user
    const allChallengesRef = adminDb.ref("doza/challenges");
    const allSnapshot = await allChallengesRef.once("value");
    const allChallenges = allSnapshot.val() || {};
    const joinedCount = Object.values(allChallenges).filter(
      (c: any) => c.participants && c.participants[requestingUserId],
    ).length;
    if (joinedCount >= 10) {
      return NextResponse.json(
        { success: false, error: "User has already joined maximum challenges" },
        { status: 400 },
      );
    }

    const updates: any = {};
    updates[`participants/${requestingUserId}`] = {
      userId: requestingUserId,
      name: requestData.name,
      photo: requestData.photo,
      joinedAt: Date.now(),
      progress: 0,
      completed: false,
    };
    updates[`joinRequests/${requestingUserId}`] = null;
    updates.participantCount = (challenge.participantCount || 0) + 1;

    await challengeRef.update(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST approve request error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
