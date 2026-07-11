import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/app/utils/firebaseAdmin";
import { z } from "zod";
import logger from "@/app/utils/logger";

const feedbackSchema = z.object({
  rating: z.number().min(0).max(5).optional().default(0),
  text: z.string().optional().default(""),
  screenshot: z.string().optional().nullable(),
  anonymous: z.boolean().optional().default(false),
  contact: z.string().optional().nullable(),
  timestamp: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = feedbackSchema.safeParse(body);

    if (!parseResult.success) {
      logger.warn({
        message: "Invalid feedback payload",
        validationErrors: parseResult.error.flatten(),
      });
      return NextResponse.json(
        {
          success: false,
          error: "Invalid feedback data",
          details: parseResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { rating, text, screenshot, anonymous, contact, timestamp } =
      parseResult.data;

    if (!text && rating === 0 && !screenshot) {
      return NextResponse.json(
        {
          success: false,
          error: "At least one of rating, text, or screenshot required",
        },
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

    logger.info({ feedbackId, message: "Feedback submitted" });
    return NextResponse.json(
      { success: true, id: feedbackId },
      { status: 201 },
    );
  } catch (error) {
    logger.error({ message: "Failed to save feedback", error });
    return NextResponse.json(
      { success: false, error: "Unable to save feedback" },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const snapshot = await adminDb.ref("doza/feedback").once("value");
    const data = snapshot.val() || {};
    const feedbackList = Object.values(data).sort(
      (a: any, b: any) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
    return NextResponse.json({ success: true, data: feedbackList });
  } catch (error) {
    logger.error({ message: "Failed to fetch feedback", error });
    return NextResponse.json(
      { success: false, error: "Unable to load feedback" },
      { status: 500 },
    );
  }
}
