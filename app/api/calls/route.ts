import { NextRequest, NextResponse } from "next/server";
import { verifySessionCookie } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";
import { z } from "zod";
import logger from "@/app/utils/logger";

const callLogSchema = z.object({
  medicId: z.string().min(1),
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
    const parseResult = callLogSchema.safeParse(body);
    if (!parseResult.success) {
      logger.warn({
        uid,
        message: "Invalid call log request",
        validationErrors: parseResult.error.flatten(),
      });
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request data",
          details: parseResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { medicId } = parseResult.data;

    const favRef = adminDb.ref(`doza/users/${uid}/favorites`);
    const favSnapshot = await favRef.once("value");
    const favorites = favSnapshot.val() || [];
    const isFav = favorites.some((fav: any) => fav.id === medicId);
    if (!isFav) {
      return NextResponse.json(
        { success: false, error: "You can only call medics in your favorites" },
        { status: 403 },
      );
    }

    const callRef = adminDb.ref(`doza/users/${uid}/calls`);
    const snapshot = await callRef.once("value");
    const calls = snapshot.val() || [];

    const newCall = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      medicId,
      timestamp: new Date().toISOString(),
    };
    calls.push(newCall);
    await callRef.set(calls);

    logger.info({ uid, medicId, callId: newCall.id, message: "Call logged" });
    return NextResponse.json({ success: true, data: newCall });
  } catch (error) {
    logger.error({ uid, message: "Failed to log call", error });
    return NextResponse.json(
      { success: false, error: "Unable to log call" },
      { status: 500 },
    );
  }
}
