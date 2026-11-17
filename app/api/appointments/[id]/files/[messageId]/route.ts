// app/api/appointments/[id]/files/[messageId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifySessionCookie } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";
import logger from "@/app/utils/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function findInList(
  path: string,
  appointmentId: string,
): Promise<any | null> {
  try {
    const snap = await adminDb.ref(path).once("value");
    const val = snap.val();
    const list = val ? (Array.isArray(val) ? val : Object.values(val)) : [];
    return (list as any[]).find((a) => a?.id === appointmentId) || null;
  } catch {
    return null;
  }
}

/**
 * 🔴 FIX 1: previously this route required `meta` to already exist,
 * so medic-first opens of /files/* returned 403 even when the medic
 * legitimately owned the appointment. Now it falls back to the same
 * patient/medic lookup the messages route uses.
 */
async function resolveAccess(
  uid: string,
  appointmentId: string,
): Promise<"patient" | "medic" | null> {
  const metaSnap = await adminDb
    .ref(`doza/chats/${appointmentId}/meta`)
    .once("value");
  const meta = metaSnap.val();

  if (meta) {
    if (meta.patientId === uid) return "patient";
    if (meta.medicId === uid) return "medic";
    return null;
  }

  const patientApt = await findInList(
    `doza/users/${uid}/appointments`,
    appointmentId,
  );
  if (patientApt) return "patient";

  const medicApt = await findInList(
    `doza_medics/${uid}/appointments`,
    appointmentId,
  );
  if (medicApt) return "medic";

  return null;
}

/**
 * 🔴 FIX 7: stream the file directly instead of wrapping it in a
 * JSON envelope. Multi-MB base64 inside JSON forces the browser
 * to parse the entire payload to extract one field.
 */
function respondRaw(mediaUrl: string): NextResponse | null {
  if (mediaUrl.startsWith("https://") || mediaUrl.startsWith("http://")) {
    return NextResponse.redirect(mediaUrl, {
      status: 302,
      headers: {
        "Cache-Control": "private, max-age=3600, immutable",
      },
    });
  }
  if (mediaUrl.startsWith("data:")) {
    const m = /^data:([^;]+);base64,(.+)$/.exec(mediaUrl);
    if (!m) return null;
    const [, contentType, b64] = m;
    const buf = Buffer.from(b64, "base64");
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(buf.length),
        "Cache-Control": "private, max-age=3600, immutable",
      },
    });
  }
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
    const role = await resolveAccess(uid, appointmentId);
    if (!role) {
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

    // ── Raw mode: stream bytes (or redirect to Storage) ──
    const url = new URL(request.url);
    if (url.searchParams.get("raw") === "1") {
      const raw = respondRaw(msg.mediaUrl);
      if (!raw) {
        return NextResponse.json(
          { success: false, error: "Unable to decode file" },
          { status: 500 },
        );
      }
      return raw;
    }

    // ── Default JSON mode (kept for backwards compat) ──
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
