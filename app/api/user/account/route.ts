import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/app/utils/auth";
import { adminDb, adminAuth } from "@/app/utils/firebaseAdmin";
import logger from "@/app/utils/logger";

export async function DELETE(request: NextRequest) {
  const uid = await verifyIdToken(request);
  if (!uid) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    await adminDb.ref(`doza/users/${uid}`).remove();
    await adminAuth.deleteUser(uid);

    logger.info({ uid, message: "Account deleted" });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ uid, message: "Delete account error", error });
    return NextResponse.json(
      { success: false, error: "Unable to delete account" },
      { status: 500 },
    );
  }
}
