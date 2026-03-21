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
    const body = await request.json();
    const { progress } = body;

    if (progress === undefined) {
      return NextResponse.json(
        { success: false, error: "Missing progress" },
        { status: 400 },
      );
    }

    const challengeRef = adminDb.ref(`doza/challenges/${id}`);
    const snapshot = await challengeRef.once("value");
    const challenge = snapshot.val();

    if (!challenge) {
      return NextResponse.json(
        { success: false, error: "Challenge not found" },
        { status: 404 },
      );
    }

    if (!challenge.participants || !challenge.participants[uid]) {
      return NextResponse.json(
        { success: false, error: "You are not a participant" },
        { status: 400 },
      );
    }

    await challengeRef.update({
      [`participants/${uid}/progress`]: progress,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST progress error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
