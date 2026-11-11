// app/api/appointments/[id]/files/[messageId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifySessionCookie } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";
import logger from "@/app/utils/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function resolveAccess(uid: string, appointmentId: string) {
  const metaSnap = await adminDb
    .ref(`doza/chats/${appointmentId}/meta`)
    .once("value");
  const meta = metaSnap.val();
  if (!meta) return null;
  if (meta.patientId === uid) return true;
  if (meta.medicId === uid) return true;
  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> },
) {
  const uid = await verifySessionCookie(request);
  if (!uid) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { id: appointmentId, messageId } = await params;

  try {
    const allowed = await resolveAccess(uid, appointmentId);
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: "Not authorized" },
        { status: 403 },
      );
    }

    const msgSnap = await adminDb
      .ref(`doza/chats/${appointmentId}/messages/${messageId}`)
      .once("value");
    const msg = msgSnap.val();

    if (!msg) {
      return NextResponse.json(
        { success: false, error: "Message not found" },
        { status: 404 },
      );
    }

    if (!msg.mediaUrl) {
      return NextResponse.json(
        { success: false, error: "Message has no file" },
        { status: 404 },
      );
    }

    // Cache aggressively — the bytes never change
    return NextResponse.json(
      {
        success: true,
        data: {
          dataUrl: msg.mediaUrl,
          mediaType: msg.mediaType,
          fileName: msg.fileName,
          fileSize: msg.fileSize,
        },
      },
      {
        headers: {
          "Cache-Control": "private, max-age=3600, immutable",
        },
      },
    );
  } catch (err: any) {
    logger.error({
      uid,
      appointmentId,
      messageId,
      message: "GET file failed",
      errorMessage: err?.message,
    });
    return NextResponse.json(
      { success: false, error: "Unable to load file" },
      { status: 500 },
    );
  }
}
