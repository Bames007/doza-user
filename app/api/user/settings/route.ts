// app/api/user/settings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";
import { z } from "zod";
import logger from "@/app/utils/logger";

const settingsUpdateSchema = z.object({
  notifications: z
    .object({
      email: z.boolean().optional(),
      push: z.boolean().optional(),
    })
    .optional(),
  privacy: z
    .object({
      shareWithFamily: z.boolean().optional(),
      dataRetention: z.enum(["forever", "1year", "30days"]).optional(),
    })
    .optional(),
});

export async function GET(request: NextRequest) {
  const uid = await verifyIdToken(request);
  if (!uid) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const settingsRef = adminDb.ref(`doza/users/${uid}/settings`);
    const snapshot = await settingsRef.once("value");
    const settings = snapshot.val() || {};

    const defaultSettings = {
      notifications: { email: true, push: false },
      privacy: { shareWithFamily: true, dataRetention: "forever" },
      subscription: { plan: "free" },
    };

    const merged = { ...defaultSettings, ...settings };
    return NextResponse.json({ success: true, data: merged });
  } catch (error) {
    logger.error({ uid, message: "GET settings failed", error });
    return NextResponse.json(
      { success: false, error: "Unable to load settings" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  const uid = await verifyIdToken(request);
  if (!uid) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();
    const parseResult = settingsUpdateSchema.safeParse(body);

    if (!parseResult.success) {
      logger.warn({
        uid,
        message: "Invalid settings update",
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

    const updates = parseResult.data;

    if ("subscription" in updates) {
      delete (updates as any).subscription;
    }

    const settingsRef = adminDb.ref(`doza/users/${uid}/settings`);
    await settingsRef.update(updates);

    logger.info({ uid, message: "Settings updated" });
    return NextResponse.json({ success: true, data: updates });
  } catch (error) {
    logger.error({ uid, message: "PUT settings failed", error });
    return NextResponse.json(
      { success: false, error: "Unable to update settings" },
      { status: 500 },
    );
  }
}
