// app/api/appointments/[id]/messages/[messageId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifySessionCookie } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";
import { z } from "zod";
import logger from "@/app/utils/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const editSchema = z.object({
  text: z.string().trim().min(1).max(2000),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> },
) {
  const uid = await verifySessionCookie(req);
  if (!uid) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { id: appointmentId, messageId } = await params;

  try {
    // Authorise via chat meta — it is always created before any
    // message can be sent (see POST in the parent route).
    const metaSnap = await adminDb
      .ref(`doza/chats/${appointmentId}/meta`)
      .once("value");
    const meta = metaSnap.val();
    if (!meta) {
      return NextResponse.json(
        { success: false, error: "Chat not found" },
        { status: 404 },
      );
    }

    // 🔴 FIX 1: allow patient OR medic to reach the PATCH.
    // The per-message check below still enforces "only the author".
    if (meta.patientId !== uid && meta.medicId !== uid) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const parsed = editSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid payload",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const msgRef = adminDb.ref(
      `doza/chats/${appointmentId}/messages/${messageId}`,
    );
    const msgSnap = await msgRef.once("value");
    const msg = msgSnap.val();
    if (!msg) {
      return NextResponse.json(
        { success: false, error: "Message not found" },
        { status: 404 },
      );
    }

    // 🔴 FIX 2: only the message author can edit their own message.
    // Previously: `msg.senderRole !== "medic" || msg.senderId !== uid`
    // which blocked patients from editing their own messages.
    if (msg.senderId !== uid) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    if (msg.mediaType) {
      return NextResponse.json(
        { success: false, error: "Only text messages can be edited" },
        { status: 400 },
      );
    }

    // Session must still be editable
    const now = Date.now();
    if (meta.endedMs && now > meta.endedMs) {
      return NextResponse.json(
        {
          success: false,
          error: "Session has ended — chat is read-only",
          sessionEnded: true,
        },
        { status: 403 },
      );
    }

    const editedAt = Date.now();
    await msgRef.update({ text: parsed.data.text, editedAt });

    return NextResponse.json({
      success: true,
      data: { id: messageId, text: parsed.data.text, editedAt },
    });
  } catch (err) {
    logger.error({
      uid,
      appointmentId,
      messageId,
      message: "PATCH edit message failed",
      errorMessage: err instanceof Error ? err.message : String(err),
      errorStack: err instanceof Error ? err.stack : undefined,
    });
    return NextResponse.json(
      { success: false, error: "Unable to save edit" },
      { status: 500 },
    );
  }
}
