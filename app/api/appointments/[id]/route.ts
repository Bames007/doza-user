import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";
import { z } from "zod";
import logger from "@/app/utils/logger";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const uid = await verifyIdToken(request);
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
    const snapshot = await appointmentsRef.once("value");
    const appointments = snapshot.val() || [];

    const index = appointments.findIndex((a: any) => a.id === appointmentId);
    if (index === -1) {
      return NextResponse.json(
        { success: false, error: "Appointment not found" },
        { status: 404 },
      );
    }

    appointments[index].status = "cancelled";
    await appointmentsRef.set(appointments);

    logger.info({ uid, appointmentId, message: "Appointment cancelled" });
    return NextResponse.json({ success: true, data: appointments[index] });
  } catch (error) {
    logger.error({
      uid,
      appointmentId,
      message: "Cancel appointment failed",
      error,
    });
    return NextResponse.json(
      { success: false, error: "Unable to cancel appointment" },
      { status: 500 },
    );
  }
}
