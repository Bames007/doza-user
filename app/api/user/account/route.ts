import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/app/utils/auth";
import { adminDb, adminAuth } from "@/app/utils/firebaseAdmin";

export async function DELETE(request: NextRequest) {
  const uid = await verifyIdToken(request);
  if (!uid) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    // Delete user data from Realtime Database
    await adminDb.ref(`doza/users/${uid}`).remove();

    // Delete the user from Firebase Auth
    await adminAuth.deleteUser(uid);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete account error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
