import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";
import { UserSettings } from "@/app/types";

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
    const settings = snapshot.val() || {
      notifications: { email: true, push: false },
      privacy: { shareWithFamily: true, dataRetention: "forever" },
      subscription: { plan: "free" },
    };

    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error("GET settings error:", error);
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
    const updates: Partial<UserSettings> = await request.json();

    // Prevent subscription updates via this endpoint (use a separate one)
    delete updates.subscription;

    const settingsRef = adminDb.ref(`doza/users/${uid}/settings`);
    await settingsRef.update(updates);

    return NextResponse.json({ success: true, data: updates });
  } catch (error) {
    console.error("PUT settings error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
