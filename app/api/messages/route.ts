import { NextRequest, NextResponse } from "next/server";
import { verifySessionCookie } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";
import { z } from "zod";
import logger from "@/app/utils/logger";

const sendMessageSchema = z.object({
  medicId: z.string().min(1),
  content: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const uid = await verifySessionCookie(request);
  if (!uid) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();
    const parseResult = sendMessageSchema.safeParse(body);

    if (!parseResult.success) {
      logger.warn({
        uid,
        message: "Invalid message payload",
        validationErrors: parseResult.error.flatten(),
      });
      return NextResponse.json(
        {
          success: false,
          error: "Invalid data provided",
          details: parseResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { medicId, content } = parseResult.data;

    const favRef = adminDb.ref(`doza/users/${uid}/favorites`);
    const favSnapshot = await favRef.once("value");
    const favorites = favSnapshot.val() || [];

    if (!favorites.some((fav: any) => fav.id === medicId)) {
      return NextResponse.json(
        { success: false, error: "Medic not in favorites" },
        { status: 403 },
      );
    }

    const msgRef = adminDb.ref(`doza/users/${uid}/messages`);
    const snapshot = await msgRef.once("value");
    const messages = snapshot.val() || [];

    const newMessage = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      medicId,
      content,
      timestamp: new Date().toISOString(),
    };

    messages.push(newMessage);
    await msgRef.set(messages);

    logger.info({
      uid,
      medicId,
      messageId: newMessage.id,
      message: "Message sent",
    });
    return NextResponse.json({ success: true, data: newMessage });
  } catch (error) {
    logger.error({ uid, message: "Failed to send message", error });
    return NextResponse.json(
      { success: false, error: "Unable to send message" },
      { status: 500 },
    );
  }
}
