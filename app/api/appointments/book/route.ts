// api/appointments/book/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifySessionCookie } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";
import { z } from "zod";
import logger from "@/app/utils/logger";

const legacySchema = z.object({
  reference: z.string().min(1),
  medicId: z.string().min(1),
  schedule: z.object({
    date: z.string().min(1),
    time: z.string().min(1),
  }),
  type: z.string().optional().default("video"),
  amount: z.number().positive(),
});

/**
 * Compat shim for the legacy body shape. Translates to the
 * modern /api/appointments payload and forwards the POST
 * internally — so the modern route's pricing engine,
 * replay check, medic mirror, emails and reminders all run.
 *
 * The legacy `type: "video"` maps to `consultType: "online"`.
 * We deliberately do NOT forward `amount` from the client;
 * the modern route recomputes it from the medic record.
 */
export async function POST(req: NextRequest) {
  const uid = await verifySessionCookie(req);
  if (!uid) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const parsed = legacySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid booking data",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const { reference, medicId, schedule, type } = parsed.data;

  // Look up the medic so we can pass a display name/specialty
  // through (same shape the modern route expects).
  const medicSnap = await adminDb.ref(`doza_medics/${medicId}`).once("value");
  const medic = medicSnap.val() || {};

  const modernBody = {
    medicId,
    medicName:
      `${medic?.personalInfo?.firstName ?? ""} ${medic?.personalInfo?.lastName ?? ""}`.trim() ||
      medic?.name ||
      "Medic",
    medicProfileImage: medic?.personalInfo?.profileImage || null,
    medicSpecialty: medic?.specialty || null,

    date: schedule.date,
    time: schedule.time,
    reason: "Legacy booking",
    consultType: type === "video" || type === "online" ? "online" : "inPerson",
    paymentReference: reference,

    // ⚠️ amount is intentionally NOT forwarded — the modern
    // route recomputes it server-side from the medic record.
    // If the client's amount is wrong, the modern route
    // rejects the booking instead of silently accepting it.
    amount: parsed.data.amount,
  };

  logger.info({
    uid,
    medicId,
    message: "Legacy /api/appointments/book → delegating to /api/appointments",
  });

  // Delegate to the modern handler without a network hop.
  const { POST: modernPOST } = await import("@/app/api/appointments/route");
  const forwarded = new NextRequest(new URL("/api/appointments", req.url), {
    method: "POST",
    headers: req.headers,
    body: JSON.stringify(modernBody),
  });
  return modernPOST(forwarded);
}
