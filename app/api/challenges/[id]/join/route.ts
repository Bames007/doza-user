import { NextRequest, NextResponse } from "next/server";
import { verifySessionCookie } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";
import { getProfile } from "@/app/server/getProfile";

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

  // Join-limit check (must happen outside the transaction)
  const allSnap = await adminDb.ref("doza/challenges").once("value");
  const all = allSnap.val() || {};
  const joinedCount = Object.values(all).filter(
    (c: any) => c.participants && c.participants[uid],
  ).length;
  if (joinedCount >= 10) {
    return NextResponse.json(
      { success: false, error: "You can join up to 10 challenges" },
      { status: 400 },
    );
  }

  const profile = await getProfile(uid);
  const challengeRef = adminDb.ref(`doza/challenges/${id}`);

  try {
    await challengeRef.transaction((challenge) => {
      if (!challenge) throw new Error("not_found");
      if (!challenge.isPublic) throw new Error("private");
      if (challenge.participants?.[uid]) throw new Error("already_joined");

      challenge.participants = challenge.participants || {};
      challenge.participants[uid] = {
        userId: uid,
        name: profile.name,
        photo: profile.photo,
        joinedAt: Date.now(),
        progress: 0,
        completed: false,
      };
      challenge.participantCount = Object.keys(challenge.participants).length;
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
    if (message === "private") {
      return NextResponse.json(
        {
          success: false,
          error: "This challenge is private. Use the request endpoint.",
        },
        { status: 400 },
      );
    }
    if (message === "already_joined") {
      return NextResponse.json(
        { success: false, error: "Already joined" },
        { status: 400 },
      );
    }
    console.error("join error:", err);
    return NextResponse.json(
      { success: false, error: "Unable to join" },
      { status: 500 },
    );
  }
}
