import { NextRequest, NextResponse } from "next/server";
import { verifySessionCookie } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";
import logger from "@/app/utils/logger";

function asArray(v: any): any[] {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  return Object.values(v);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ allergyId: string }> },
) {
  const uid = await verifySessionCookie(request);
  if (!uid) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { allergyId } = await params;
  if (!allergyId) {
    return NextResponse.json(
      { success: false, error: "Missing allergy ID" },
      { status: 400 },
    );
  }

  try {
    const ref = adminDb.ref(`doza/users/${uid}/healthProfile/allergies`);
    const snap = await ref.once("value");
    const existing = asArray(snap.val());
    const filtered = existing.filter((a: any) => a.id !== allergyId);

    if (filtered.length === existing.length) {
      return NextResponse.json(
        { success: false, error: "Allergy not found" },
        { status: 404 },
      );
    }

    await ref.set(filtered);
    logger.info({ uid, allergyId, message: "Allergy deleted" });

    return NextResponse.json({ success: true, data: { deleted: allergyId } });
  } catch (error) {
    logger.error({ uid, allergyId, message: "DELETE allergy failed", error });
    return NextResponse.json(
      { success: false, error: "Unable to delete allergy" },
      { status: 500 },
    );
  }
}
