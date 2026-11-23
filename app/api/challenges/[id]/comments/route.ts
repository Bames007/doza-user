// api/challenges/[id]/comments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifySessionCookie } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";

const VALID_TYPES = new Set(["comment", "share"]);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const uid = await verifySessionCookie(request);
  if (!uid) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { text, type, shareUrl, shareMethod } = body ?? {};

    const entryType = VALID_TYPES.has(type) ? type : "comment";

    if (entryType === "comment" && (!text || !text.trim())) {
      return NextResponse.json(
        { success: false, error: "Missing comment text" },
        { status: 400 },
      );
    }

    if (entryType === "share" && (!shareUrl || typeof shareUrl !== "string")) {
      return NextResponse.json(
        { success: false, error: "Missing shareUrl" },
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
        { success: false, error: "Only participants can post" },
        { status: 403 },
      );
    }

    const userName =
      body.userName || challenge.participants?.[uid]?.name || "Anonymous";
    const userPhoto =
      body.userPhoto || challenge.participants?.[uid]?.photo || null;

    const commentsRef = challengeRef.child("comments");
    const newCommentRef = commentsRef.push();
    const commentId = newCommentRef.key;

    const commentData: any = {
      authorId: uid,
      authorName: userName,
      authorImage: userPhoto,
      text:
        (text && String(text).trim()) ||
        `Shared this challenge via ${shareMethod || "link"}`,
      timestamp: Date.now(),
      type: entryType,
    };

    if (entryType === "share") {
      commentData.shareUrl = shareUrl;
      commentData.shareMethod = shareMethod || "link";
    }

    await newCommentRef.set(commentData);

    return NextResponse.json({
      success: true,
      data: { id: commentId, ...commentData },
    });
  } catch (error) {
    console.error("POST comment error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
