import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";
import { UserProfile } from "@/app/types";

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

    // Ensure emergencyContacts exists
    if (!profile.emergencyContacts) profile.emergencyContacts = [];

    return NextResponse.json({ success: true, data: profile });
  } catch (error) {
    console.error("GET profile error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
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
    const updates: Partial<UserProfile> = await request.json();

    // Remove email if present (read‑only)
    delete updates.email;

    // Validate required fields? We'll allow partial updates.
    const profileRef = adminDb.ref(`doza/users/${uid}/personalProfile`);
    await profileRef.update(updates);

    return NextResponse.json({ success: true, data: updates });
  } catch (error) {
    console.error("PUT profile error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
