import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/app/utils/firebaseAdmin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rating, text, screenshot, anonymous, contact, timestamp } = body;

    if (!text && rating === 0 && !screenshot) {
      return NextResponse.json(
        { error: "At least one of rating, text, or screenshot required" },
        { status: 400 },
      );
    }

    const feedbackId = Date.now().toString();
    const newFeedback = {
      id: feedbackId,
      rating,
      text,
      screenshot,
      anonymous,
      contact: anonymous ? null : contact,
      timestamp: timestamp || new Date().toISOString(),
    };

    await adminDb.ref(`doza/feedback/${feedbackId}`).set(newFeedback);
    return NextResponse.json(
      { success: true, id: feedbackId },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error saving feedback:", error);
    return NextResponse.json(
      { error: "Failed to save feedback" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const snapshot = await adminDb.ref("doza/feedback").once("value");
    const data = snapshot.val() || {};
    const feedbackList = Object.values(data).sort(
      (a: any, b: any) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
    return NextResponse.json(feedbackList);
  } catch (error) {
    console.error("Error fetching feedback:", error);
    return NextResponse.json(
      { error: "Failed to fetch feedback" },
      { status: 500 },
    );
  }
}
