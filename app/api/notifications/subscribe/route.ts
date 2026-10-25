// app/api/notifications/subscribe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifySessionCookie } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";
import { z } from "zod";
import logger from "@/app/utils/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

function endpointKey(endpoint: string): string {
  // RTDB keys cannot contain . # $ [ ] / - base64url is safe
  return Buffer.from(endpoint).toString("base64url").slice(0, 48);
}

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

    const sub = parseResult.data;

    await adminDb
      .ref(`doza/users/${uid}/pushSubscriptions/${endpointKey(sub.endpoint)}`)
      .set({
        endpoint: sub.endpoint,
        keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
        createdAt: new Date().toISOString(),
        userAgent: request.headers.get("user-agent") || "",
      });

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

export async function DELETE(request: NextRequest) {
  const uid = await verifySessionCookie(request);
  if (!uid) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const body = await request.json().catch(() => null);
    const endpoint: string | undefined = body?.endpoint;
    if (!endpoint) {
      return NextResponse.json({ success: true });
    }

    await adminDb
      .ref(`doza/users/${uid}/pushSubscriptions/${endpointKey(endpoint)}`)
      .remove();

    logger.info({ uid, message: "Push subscription removed" });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ uid, message: "Failed to remove subscription", error });
    return NextResponse.json(
      { success: false, error: "Unable to remove subscription" },
      { status: 500 },
    );
  }
}
