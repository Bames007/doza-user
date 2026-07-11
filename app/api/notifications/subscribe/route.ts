import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";
import { z } from "zod";
import logger from "@/app/utils/logger";

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});

export async function POST(request: NextRequest) {
  const uid = await verifyIdToken(request);
  if (!uid) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();
    const parseResult = subscriptionSchema.safeParse(body);

    if (!parseResult.success) {
      logger.warn({
        uid,
        message: "Invalid push subscription payload",
        validationErrors: parseResult.error.flatten(),
      });
      return NextResponse.json(
        { success: false, error: "Invalid subscription data" },
        { status: 400 },
      );
    }

    const subscription = parseResult.data;
    const subsRef = adminDb.ref(`doza/users/${uid}/pushSubscriptions`);
    const snapshot = await subsRef.once("value");
    const subs: any[] = snapshot.val() || [];
    subs.push(subscription);
    await subsRef.set(subs);

    logger.info({ uid, message: "Push subscription saved" });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ uid, message: "Failed to save push subscription", error });
    return NextResponse.json(
      { success: false, error: "Unable to save subscription" },
      { status: 500 },
    );
  }
}
