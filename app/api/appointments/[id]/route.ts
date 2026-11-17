// app/api/appointments/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifySessionCookie } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";
import { z } from "zod";
import logger from "@/app/utils/logger";

/**
 * Best-effort reminder cleanup. Adjust the path if your
 * scheduleAppointmentReminder() utility writes to a different
 * node (e.g. `doza/scheduledReminders/{id}`, or a Cloud Tasks queue).
 */
async function cancelAppointmentReminder(appointmentId: string) {
  const candidates = [
    `doza/reminders/${appointmentId}`,
    `doza/scheduledReminders/${appointmentId}`,
    `doza/appointmentReminders/${appointmentId}`,
  ];
  for (const path of candidates) {
    try {
      await adminDb.ref(path).remove();
    } catch (e: any) {
      logger.warn({
        appointmentId,
        path,
        message: "Reminder removal attempt failed (non-fatal)",
        errorMessage: e?.message,
      });
    }
  }
}

export async function DELETE(
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
  const idCheck = z.string().min(1).safeParse(appointmentId);
  if (!idCheck.success) {
    return NextResponse.json(
      { success: false, error: "Invalid appointment ID" },
      { status: 400 },
    );
  }

  try {
    const appointmentsRef = adminDb.ref(`doza/users/${uid}/appointments`);

    // ── Transaction: read-modify-write atomically ──
    // 🔴 FIX 5: replaces the read → mutate → set pattern, which
    // races with the booking / rebook routes on the same node.
    // 🔴 FIX 6: adds status guards (idempotent cancel, refuse to
    // cancel completed or in-session bookings).
    let notFound = false;
    let notCancellable = false;
    let cancelledApt: any = null;

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

      const apt = list[idx];

      // Idempotent: already cancelled → return unchanged, still "success".
      if (apt.status === "cancelled") {
        cancelledApt = apt;
        return current;
      }
      // Refuse to cancel a finished or live session.
      if (apt.status === "completed" || apt.status === "inSession") {
        notCancellable = true;
        return;
      }

      const updated = {
        ...apt,
        status: "cancelled",
        cancelledAt: new Date().toISOString(),
      };
      list[idx] = updated;
      cancelledApt = updated;
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
          error: "This session can no longer be cancelled",
        },
        { status: 400 },
      );
    }
    if (!cancelledApt) {
      logger.error({
        uid,
        appointmentId,
        committed: txResult?.committed,
        message: "Cancel transaction produced no result",
      });
      return NextResponse.json(
        { success: false, error: "Unable to cancel appointment" },
        { status: 500 },
      );
    }

    // ── Mirror to medic node ──
    // 🔴 FIX 2: medic dashboard previously kept showing the booking
    // as "upcoming" forever.
    const medicId = cancelledApt.medicId;
    if (medicId) {
      try {
        await adminDb
          .ref(`doza_medics/${medicId}/appointments/${appointmentId}`)
          .update({
            status: "cancelled",
            cancelledAt: cancelledApt.cancelledAt,
          });
      } catch (e: any) {
        logger.error({
          uid,
          appointmentId,
          medicId,
          message: "Failed to mirror cancellation to medic node",
          errorMessage: e?.message,
        });
      }
    }

    // ── Remove pending reminder ──
    // 🔴 FIX 3: otherwise the reminder fires for a cancelled session.
    await cancelAppointmentReminder(appointmentId);

    logger.info({ uid, appointmentId, message: "Appointment cancelled" });
    return NextResponse.json({ success: true, data: cancelledApt });
  } catch (error: any) {
    logger.error({
      uid,
      appointmentId,
      message: "Cancel appointment failed",
      errorMessage: error?.message,
    });
    return NextResponse.json(
      { success: false, error: "Unable to cancel appointment" },
      { status: 500 },
    );
  }
}
