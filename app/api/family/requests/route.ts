import { NextRequest, NextResponse } from "next/server";
import { verifySessionCookie } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";
import logger from "@/app/utils/logger";

export async function GET(request: NextRequest) {
  const uid = await verifySessionCookie(request);
  if (!uid) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const requestsRef = adminDb.ref(`doza/users/${uid}/familyRequests`);
    const snapshot = await requestsRef.get(); // ✅ modern API
    const raw = snapshot.val();
    const requests: any[] = !raw
      ? []
      : Array.isArray(raw)
        ? raw
        : Object.entries(raw).map(([id, data]) => ({ id, ...(data as any) }));

    return NextResponse.json({ success: true, data: requests });
  } catch (error) {
    logger.error({
      uid,
      message: "GET family requests failed",
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, error: "Unable to load requests" },
      { status: 500 },
    );
  }
}
