import { NextRequest, NextResponse } from "next/server";
import { verifySessionCookie } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";
import logger from "@/app/utils/logger";

export async function GET(request: NextRequest) {
  const uid = await verifySessionCookie(request);
  if (!uid) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10");

    const leaderboardRef = adminDb.ref("doza/leaderboard");
    const snapshot = await leaderboardRef
      .orderByChild("totalPoints")
      .limitToLast(limit)
      .once("value");
    const data = snapshot.val() || {};

    const leaderboard = Object.values(data)
      .sort((a: any, b: any) => b.totalPoints - a.totalPoints)
      .slice(0, limit);

    // Enrich with user profile data
    const enriched = await Promise.all(
      leaderboard.map(async (entry: any) => {
        const userSnap = await adminDb
          .ref(`doza/users/${entry.uid}/personalProfile`)
          .once("value");
        const profile = userSnap.val() || {};
        return {
          ...entry,
          name:
            `${profile.fname || ""} ${profile.lname || ""}`.trim() ||
            "Anonymous",
          avatar: profile.avatarId
            ? `/assets/avatars/${profile.avatarId}.jpg`
            : null,
        };
      }),
    );

    return NextResponse.json({ success: true, data: enriched });
  } catch (error) {
    logger.error({
      message: "Leaderboard fetch failed",
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, error: "Unable to load leaderboard" },
      { status: 500 },
    );
  }
}
