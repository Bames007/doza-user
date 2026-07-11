import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/app/utils/firebaseAdmin";
import { z } from "zod";
import logger from "@/app/utils/logger";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ centerId: string }> },
) {
  const { centerId } = await params;
  const idCheck = z.string().min(1).safeParse(centerId);
  if (!idCheck.success) {
    return NextResponse.json(
      { success: false, error: "Invalid center ID" },
      { status: 400 },
    );
  }

  try {
    const centerRef = adminDb.ref(`doza_centers/${centerId}`);
    const snapshot = await centerRef.get();
    if (!snapshot.exists()) {
      return NextResponse.json(
        { success: false, error: "Center not found" },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true, data: snapshot.val() });
  } catch (error) {
    logger.error({ centerId, message: "Failed to fetch center", error });
    return NextResponse.json(
      { success: false, error: "Unable to load center" },
      { status: 500 },
    );
  }
}
