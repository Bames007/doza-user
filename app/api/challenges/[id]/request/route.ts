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

    if (challenge.isPublic) {
      return NextResponse.json(
        {
          success: false,
          error: "This challenge is public. Use join endpoint.",
        },
        { status: 400 },
      );
    }

    if (challenge.participants?.[uid]) {
      return NextResponse.json(
        { success: false, error: "Already a participant" },
        { status: 400 },
      );
    }

    if (challenge.joinRequests?.[uid]?.status === "pending") {
      return NextResponse.json(
        { success: false, error: "Request already pending" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const userName = body.userName || "Anonymous";
    const userPhoto = body.userPhoto || null;

    await challengeRef.update({
      [`joinRequests/${uid}`]: {
        userId: uid,
        name: userName,
        photo: userPhoto,
        requestedAt: Date.now(),
        status: "pending",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST request error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
