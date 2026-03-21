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

    if (!challenge.isPublic) {
      return NextResponse.json(
        { success: false, error: "This challenge is private" },
        { status: 400 },
      );
    }

    if (challenge.participants?.[uid]) {
      return NextResponse.json(
        { success: false, error: "Already joined" },
        { status: 400 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const userName = body.userName || "Anonymous";
    const userPhoto = body.userPhoto || null;

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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ POST join challenge error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
