// app/api/appointments/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";

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
  if (!appointmentId) {
    return NextResponse.json(
      { success: false, error: "Missing appointment ID" },
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

    return NextResponse.json({ success: true, data: appointments[index] });
  } catch (error) {
    console.error("DELETE appointment error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
