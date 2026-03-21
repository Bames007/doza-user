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
    const { text } = body;

    if (!text) {
      return NextResponse.json(
        { success: false, error: "Missing comment text" },
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
        { success: false, error: "Only participants can comment" },
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

    const commentData = {
      authorId: uid,
      authorName: userName,
      authorImage: userPhoto,
      text,
      timestamp: Date.now(),
    };

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
