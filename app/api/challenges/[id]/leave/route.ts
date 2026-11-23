import { NextRequest, NextResponse } from "next/server";
import { verifySessionCookie } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const uid = await verifySessionCookie(req);
  if (!uid) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { id } = await params;
  const challengeRef = adminDb.ref(`doza/challenges/${id}`);

  try {
    await challengeRef.transaction((challenge) => {
      if (!challenge) throw new Error("not_found");
      if (challenge.creatorId === uid) throw new Error("creator_cannot_leave");
      if (!challenge.participants?.[uid]) throw new Error("not_participant");

      delete challenge.participants[uid];
      challenge.participantCount = Math.max(
        0,
        Object.keys(challenge.participants).length,
      );
      return challenge;
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message === "not_found") {
      return NextResponse.json(
        { success: false, error: "Challenge not found" },
        { status: 404 },
      );
    }
    if (message === "creator_cannot_leave") {
      return NextResponse.json(
        {
          success: false,
          error: "Creator cannot leave. Delete the challenge instead.",
        },
        { status: 400 },
      );
    }
    if (message === "not_participant") {
      return NextResponse.json(
        { success: false, error: "You are not a participant" },
        { status: 400 },
      );
    }
    console.error("leave error:", err);
    return NextResponse.json(
      { success: false, error: "Unable to leave" },
      { status: 500 },
    );
  }
}
