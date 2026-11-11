// app/api/appointments/[id]/rebook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifySessionCookie } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";
import { z } from "zod";
import logger from "@/app/utils/logger";

const rebookSchema = z.object({
  date: z.string().min(1),
  time: z.string().min(1),
});

function parseDurationToMs(label: string | null | undefined): number {
  if (!label) return 60 * 60 * 1000;
  const lower = label.toLowerCase();
  const match = lower.match(/(\d+(?:\.\d+)?)/);
  if (!match) return 60 * 60 * 1000;
  const n = parseFloat(match[1]);
  if (lower.includes("min")) return n * 60 * 1000;
  if (lower.includes("h")) return n * 60 * 60 * 1000;
  return 60 * 60 * 1000;
}

async function getAppointment(uid: string, appointmentId: string) {
  const ref = adminDb.ref(`doza/users/${uid}/appointments`);
  const snap = await ref.once("value");
  const val = snap.val();
  const list = val ? (Array.isArray(val) ? val : Object.values(val)) : [];
  return {
    ref,
    list: list as any[],
    apt: (list as any[]).find((a) => a?.id === appointmentId) || null,
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const uid = await verifySessionCookie(request);
  if (!uid) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { id: appointmentId } = await params;

  try {
    const body = await request.json();
    const parsed = rebookSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid rebook data",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { date, time } = parsed.data;

    const { ref, list, apt } = await getAppointment(uid, appointmentId);
    if (!apt) {
      return NextResponse.json(
        { success: false, error: "Appointment not found" },
        { status: 404 },
      );
    }

    // ── Basic eligibility ────────────────────────────
    if (apt.status === "completed") {
      return NextResponse.json(
        { success: false, error: "This session was already completed" },
        { status: 400 },
      );
    }
    if (apt.status === "cancelled") {
      return NextResponse.json(
        { success: false, error: "This session was cancelled" },
        { status: 400 },
      );
    }
    if (apt.rebookedTo) {
      return NextResponse.json(
        { success: false, error: "Already rebooked" },
        { status: 400 },
      );
    }

    // ── Session must be over ─────────────────────────
    const scheduledMs = apt.scheduledAt
      ? new Date(apt.scheduledAt).getTime()
      : new Date(`${apt.date}T${apt.time}`).getTime();
    const durationMs = parseDurationToMs(apt.duration);
    const endedMs = scheduledMs + durationMs;
    const now = Date.now();

    if (now < endedMs) {
      return NextResponse.json(
        { success: false, error: "Session hasn't ended yet" },
        { status: 400 },
      );
    }

    // ── Payment must exist ───────────────────────────
    const paidAmount = Number(apt.amount) || 0;
    const hadPayment = !!apt.paymentReference || paidAmount > 0;
    if (!hadPayment) {
      return NextResponse.json(
        { success: false, error: "No payment on file for original session" },
        { status: 400 },
      );
    }

    // ── KEY FIX: user must NOT have chatted ─────────
    // If any message exists in the chat, the session was actually used —
    // no free rebook.
    const msgSnap = await adminDb
      .ref(`doza/chats/${appointmentId}/messages`)
      .limitToFirst(1)
      .once("value");
    if (msgSnap.exists()) {
      return NextResponse.json(
        {
          success: false,
          error:
            "You used this session — free rebook is only for sessions that weren't started",
        },
        { status: 400 },
      );
    }

    // ── New date must be at least 15 min in future ──
    const [y, m, d] = date.split("-").map(Number);
    const [hh, mm] = time.split(":").map(Number);
    const newScheduled = new Date(y, m - 1, d, hh, mm, 0, 0);
    if (newScheduled.getTime() < now + 15 * 60 * 1000) {
      return NextResponse.json(
        { success: false, error: "New slot must be at least 15 minutes away" },
        { status: 400 },
      );
    }

    // ── Create rebook ───────────────────────────────
    const newId = `apt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const newAppointment = {
      id: newId,
      medicId: apt.medicId,
      medicName: apt.medicName,
      medicEmail: apt.medicEmail || null,
      medicProfileImage: apt.medicProfileImage || null,
      medicSpecialty: apt.medicSpecialty || null,
      date,
      time,
      scheduledAt: newScheduled.toISOString(),
      reason: apt.reason || "Consultation",
      notes: null,
      consultType: apt.consultType || "online",
      duration: apt.duration || "60 min",
      address: apt.address || null,
      amount: 0,
      paymentReference: apt.paymentReference || null,
      paymentStatus: "waived",
      originalAmount: apt.amount || 0,
      patientEmail: apt.patientEmail || null,
      patientName: apt.patientName || "Patient",
      status: "upcoming" as const,
      rebookedFrom: appointmentId,
      createdAt: new Date().toISOString(),
    };

    list.push(newAppointment);
    const origIdx = list.findIndex((a) => a?.id === appointmentId);
    if (origIdx >= 0) {
      list[origIdx].rebookedTo = newId;
      list[origIdx].rebookedAt = new Date().toISOString();
    }
    await ref.set(list);

    logger.info({
      uid,
      originalId: appointmentId,
      newId,
      message: "Free rebook created",
    });

    return NextResponse.json({ success: true, data: newAppointment });
  } catch (err: any) {
    logger.error({
      uid,
      appointmentId,
      message: "Rebook failed",
      errorMessage: err?.message,
    });
    return NextResponse.json(
      { success: false, error: "Unable to rebook" },
      { status: 500 },
    );
  }
}
