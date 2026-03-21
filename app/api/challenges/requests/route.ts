import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";

export async function GET(request: NextRequest) {
  const uid = await verifyIdToken(request);
  if (!uid) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const challengesRef = adminDb.ref("doza/challenges");
    const snapshot = await challengesRef.once("value");
    const allChallenges = snapshot.val() || {};

    const requests: any[] = [];
    Object.entries(allChallenges).forEach(
      ([challengeId, challenge]: [string, any]) => {
        if (challenge.creatorId === uid && challenge.joinRequests) {
          Object.entries(challenge.joinRequests).forEach(
            ([userId, req]: [string, any]) => {
              if (req.status === "pending") {
                requests.push({
                  id: `${challengeId}_${userId}`,
                  challengeId,
                  challengeName: challenge.name,
                  userId,
                  name: req.name,
                  photo: req.photo,
                  requestedAt: req.requestedAt,
                  status: req.status,
                });
              }
            },
          );
        }
      },
    );

    return NextResponse.json({ success: true, data: requests });
  } catch (error) {
    console.error("GET requests error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
