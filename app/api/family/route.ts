import { NextRequest, NextResponse } from "next/server";
import { verifySessionCookie } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";
import { z } from "zod";
import logger from "@/app/utils/logger";

const familyContactSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  relationship: z.string().min(1),
  email: z.string().email().optional(),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const uid = await verifySessionCookie(request);
  if (!uid) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const familyRef = adminDb.ref(`doza/users/${uid}/familyFriends`);
    const snapshot = await familyRef.once("value");
    const family = snapshot.val() || [];
    return NextResponse.json({ success: true, data: family });
  } catch (error) {
    logger.error({ uid, message: "GET family contacts failed", error });
    return NextResponse.json(
      { success: false, error: "Unable to load family contacts" },
      { status: 500 },
    );
  }
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
    const parseResult = familyContactSchema.safeParse(body);
    if (!parseResult.success) {
      logger.warn({
        uid,
        message: "Invalid family contact payload",
        validationErrors: parseResult.error.flatten(),
      });
      return NextResponse.json(
        {
          success: false,
          error: "Invalid contact data",
          details: parseResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const newContact = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      ...parseResult.data,
    };

    const familyRef = adminDb.ref(`doza/users/${uid}/familyFriends`);
    const snapshot = await familyRef.once("value");
    const family = snapshot.val() || [];
    family.push(newContact);
    await familyRef.set(family);

    logger.info({
      uid,
      contactId: newContact.id,
      message: "Family contact added",
    });
    return NextResponse.json(
      { success: true, data: newContact },
      { status: 201 },
    );
  } catch (error) {
    logger.error({ uid, message: "POST family contact failed", error });
    return NextResponse.json(
      { success: false, error: "Unable to add contact" },
      { status: 500 },
    );
  }
}
