// app/api/user/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifySessionCookie } from "@/app/utils/auth";
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

// GET
export async function GET(request: NextRequest) {
  let uid: string | null = null;
  try {
    // verifySessionCookie extracts and verifies the session cookie
    uid = await verifySessionCookie(request);
    if (!uid) {
      logger.warn("Profile GET: Missing or invalid session cookie");
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const profileRef = adminDb.ref(`doza/users/${uid}/personalProfile`);
    const snapshot = await profileRef.once("value");
    const profile = snapshot.val() || {};

    if (!profile.emergencyContacts) profile.emergencyContacts = [];
    const fullName = `${profile.fname || ""} ${profile.lname || ""}`.trim();

    logger.info({ uid }, "Profile fetched successfully");
    return NextResponse.json({ success: true, data: { ...profile, fullName } });
  } catch (error) {
    logger.error({ uid, error: String(error) }, "GET profile error");
    return NextResponse.json(
      { success: false, error: "Unable to retrieve profile" },
      { status: 500 },
    );
  }
}

// PUT
export async function PUT(request: NextRequest) {
  let uid: string | null = null;
  try {
    uid = await verifySessionCookie(request);
    if (!uid) {
      logger.warn("Profile PUT: Missing or invalid session cookie");
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

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
    logger.info({ uid, updates }, "Profile updated");
    return NextResponse.json({ success: true, data: updates });
  } catch (error) {
    logger.error({ uid, error: String(error) }, "PUT profile error");
    return NextResponse.json(
      { success: false, error: "Unable to update profile" },
      { status: 500 },
    );
  }
}
