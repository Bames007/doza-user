// app/api/appointments/[id]/rebook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifySessionCookie } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";
import { z } from "zod";
import logger from "@/app/utils/logger";
import { scheduleAppointmentReminder } from "@/app/utils/scheduleAppointmentReminder";
import { sendMail } from "@/app/utils/mailer";
import { bookingConfirmedMedic } from "@/app/utils/emailTemplates";

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

    // ── Pre-read for async eligibility checks (chat, timing) ──
    // The actual state transition is done inside a transaction
    // below; this pre-read just powers the async checks that
    // can't run inside a transaction.
    const { apt } = await getAppointment(uid, appointmentId);
    if (!apt) {
      return NextResponse.json(
        { success: false, error: "Appointment not found" },
        { status: 404 },
      );
    }

    // ── Basic eligibility ──
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

    // ── Session must be over ──
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

    // ── Payment must exist ──
    const paidAmount = Number(apt.amount) || 0;
    const hadPayment = !!apt.paymentReference || paidAmount > 0;
    if (!hadPayment) {
      return NextResponse.json(
        { success: false, error: "No payment on file for original session" },
        { status: 400 },
      );
    }

    // ── Chat must be untouched (free rebook = session never started) ──
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

    // ── New slot must be at least 15 min in future ──
    const [y, m, d] = date.split("-").map(Number);
    const [hh, mm] = time.split(":").map(Number);
    const newScheduled = new Date(y, m - 1, d, hh, mm, 0, 0);
    if (newScheduled.getTime() < now + 15 * 60 * 1000) {
      return NextResponse.json(
        { success: false, error: "New slot must be at least 15 minutes away" },
        { status: 400 },
      );
    }

    // ── Transaction: atomically push new + mark original ──
    // 🔴 FIX 5: prevents the race that used to allow two concurrent
    // rebooks (or a rebook + a cancel) to overwrite each other.
    const appointmentsRef = adminDb.ref(`doza/users/${uid}/appointments`);

    let notFound = false;
    let notCancellable = false;
    let txNewApt: any = null;

    const txResult = await appointmentsRef.transaction((current) => {
      if (!current) {
        notFound = true;
        return;
      }
      const list: any[] = Array.isArray(current)
        ? current
        : Object.values(current);

      const idx = list.findIndex((a: any) => a?.id === appointmentId);
      if (idx === -1) {
        notFound = true;
        return;
      }
      const currentApt = list[idx];

      // Re-verify state inside the transaction — someone could have
      // cancelled or rebooked between the pre-read and now.
      if (
        currentApt.status === "completed" ||
        currentApt.status === "cancelled" ||
        currentApt.status === "inSession" ||
        currentApt.rebookedTo
      ) {
        notCancellable = true;
        return;
      }

      const curScheduledMs = currentApt.scheduledAt
        ? new Date(currentApt.scheduledAt).getTime()
        : new Date(`${currentApt.date}T${currentApt.time}`).getTime();
      const curDurationMs = parseDurationToMs(currentApt.duration);
      if (Date.now() < curScheduledMs + curDurationMs) {
        notCancellable = true;
        return;
      }

      const newId = `apt-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;

      const newAppointment = {
        id: newId,
        medicId: currentApt.medicId,
        medicName: currentApt.medicName,
        medicEmail: currentApt.medicEmail || null,
        medicProfileImage: currentApt.medicProfileImage || null,
        medicSpecialty: currentApt.medicSpecialty || null,
        date,
        time,
        scheduledAt: newScheduled.toISOString(),
        reason: currentApt.reason || "Consultation",
        notes: null,
        consultType: currentApt.consultType || "online",
        duration: currentApt.duration || "60 min",
        address: currentApt.address || null,
        amount: 0,
        // 🔴 FIX 4: don't reuse the original payment reference.
        // Keep it on a dedicated field for reconciliation instead.
        paymentReference: null,
        originalPaymentReference: currentApt.paymentReference || null,
        paymentStatus: "waived",
        originalAmount: currentApt.amount || 0,
        patientEmail: currentApt.patientEmail || null,
        patientName: currentApt.patientName || "Patient",
        status: "upcoming" as const,
        rebookedFrom: appointmentId,
        createdAt: new Date().toISOString(),
      };

      list[idx] = {
        ...currentApt,
        rebookedTo: newId,
        rebookedAt: new Date().toISOString(),
      };
      list.push(newAppointment);

      txNewApt = newAppointment;
      return list;
    });

    if (notFound) {
      return NextResponse.json(
        { success: false, error: "Appointment not found" },
        { status: 404 },
      );
    }
    if (notCancellable) {
      return NextResponse.json(
        {
          success: false,
          error: "This session is no longer eligible for rebook",
        },
        { status: 400 },
      );
    }
    if (!txNewApt || !txResult.committed) {
      logger.error({
        uid,
        appointmentId,
        committed: txResult?.committed,
        message: "Rebook transaction produced no result",
      });
      return NextResponse.json(
        { success: false, error: "Unable to rebook" },
        { status: 500 },
      );
    }

    const newAppointment = txNewApt;
    const newId = newAppointment.id;

    // ── Mirror to medic node ──
    // 🔴 FIX 2: previously the medic never saw the rebooked slot.
    if (newAppointment.medicId) {
      try {
        await adminDb
          .ref(`doza_medics/${newAppointment.medicId}/appointments/${newId}`)
          .set({
            ...newAppointment,
            patientUid: uid,
            patientName: newAppointment.patientName,
            patientEmail: newAppointment.patientEmail,
            patientProfileImage: apt.patientProfileImage || null,
          });
        await adminDb
          .ref(
            `doza_medics/${newAppointment.medicId}/appointments/${appointmentId}/rebookedTo`,
          )
          .set(newId);
        await adminDb
          .ref(
            `doza_medics/${newAppointment.medicId}/appointments/${appointmentId}/rebookedAt`,
          )
          .set(newAppointment.createdAt);
      } catch (e: any) {
        logger.error({
          uid,
          appointmentId,
          newId,
          message: "Failed to mirror rebook to medic node",
          errorMessage: e?.message,
        });
      }
    }

    // ── Schedule reminder for the new slot ──
    // 🔴 FIX 3: previously the reminder never fired for the new slot.
    try {
      await scheduleAppointmentReminder({
        uid,
        appointmentId: newId,
        medicId: newAppointment.medicId,
        scheduledAtISO: newAppointment.scheduledAt,
      });
    } catch (e: any) {
      logger.error({
        uid,
        newId,
        message: "Failed to schedule reminder for rebook",
        errorMessage: e?.message,
      });
    }

    // ── Notify the medic (non-fatal) ──
    // 🟡 FIX: previously the medic got no email about the new slot.
    if (newAppointment.medicEmail) {
      try {
        const tpl = bookingConfirmedMedic(
          newAppointment,
          newAppointment.patientName || "Patient",
        );
        await sendMail({
          to: newAppointment.medicEmail,
          subject: `[Rebook] ${tpl.subject}`,
          html: tpl.html,
        });
      } catch (e: any) {
        logger.error({
          uid,
          newId,
          message: "Medic rebook notification email failed",
          errorMessage: e?.message,
        });
      }
    }

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
