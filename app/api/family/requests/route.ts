import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";

export async function GET(request: NextRequest) {
  const uid = await verifyIdToken(request);
  if (!uid) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const requestsRef = adminDb.ref(`doza/users/${uid}/familyRequests`);
    const snapshot = await requestsRef.once("value");
    const requests = snapshot.val() || [];
    return NextResponse.json({ success: true, data: requests });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Internal error" },
      { status: 500 },
    );
  }
}
