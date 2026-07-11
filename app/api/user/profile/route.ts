// app/api/user/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";
import { z } from "zod";
import logger from "@/app/utils/logger";

const profileUpdateSchema = z.object({
  displayName: z.string().optional(),
  phone: z.string().optional(),
  emergencyContacts: z
    .array(
      z.object({
        name: z.string(),
        phone: z.string(),
        relationship: z.string().optional(),
      }),
    )
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
    const profileRef = adminDb.ref(`doza/users/${uid}/personalProfile`);
    const snapshot = await profileRef.once("value");
    const profile = snapshot.val() || {};

    if (!profile.emergencyContacts) profile.emergencyContacts = [];

    // Build fullName from fname and lname (first & last name in your DB)
    const fullName = `${profile.fname || ""} ${profile.lname || ""}`.trim();

    return NextResponse.json({
      success: true,
      data: {
        ...profile,
        fullName,
      },
    });
  } catch (error) {
    logger.error({ uid, message: "GET profile error", error });
    return NextResponse.json(
      { success: false, error: "Unable to retrieve profile" },
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
    const parseResult = profileUpdateSchema.safeParse(body);

    if (!parseResult.success) {
      logger.warn({ uid, validationErrors: parseResult.error.flatten() });
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

    const profileRef = adminDb.ref(`doza/users/${uid}/personalProfile`);
    await profileRef.update(updates);

    logger.info({ uid, message: "Profile updated" });
    return NextResponse.json({ success: true, data: updates });
  } catch (error) {
    logger.error({ uid, message: "PUT profile error", error });
    return NextResponse.json(
      { success: false, error: "Unable to update profile" },
      { status: 500 },
    );
  }
}
