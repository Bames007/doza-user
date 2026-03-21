// app/api/appointments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";

export async function POST(request: NextRequest) {
  const uid = await verifyIdToken(request);
  if (!uid)
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );

  try {
    const appointment = await request.json();
    if (
      !appointment.medicId ||
      !appointment.date ||
      !appointment.time ||
      !appointment.reason
    ) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Generate ID
    appointment.id =
      Date.now().toString() + Math.random().toString(36).substr(2, 5);
    appointment.status = "upcoming";
    appointment.createdAt = new Date().toISOString();

    const appointmentsRef = adminDb.ref(`doza/users/${uid}/appointments`);
    const snapshot = await appointmentsRef.once("value");
    const appointments = snapshot.val() || [];
    appointments.push(appointment);
    await appointmentsRef.set(appointments);

    return NextResponse.json({ success: true, data: appointment });
  } catch (error) {
    console.error("POST appointment error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

// app/api/appointments/route.ts (add GET)
export async function GET(request: NextRequest) {
  const uid = await verifyIdToken(request);
  if (!uid)
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  try {
    const appointmentsRef = adminDb.ref(`doza/users/${uid}/appointments`);
    const snapshot = await appointmentsRef.once("value");
    let appointments = snapshot.val() || [];
    if (status) {
      appointments = appointments.filter((a: any) => a.status === status);
    }
    return NextResponse.json({ success: true, data: appointments });
  } catch (error) {
    console.error("GET appointments error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
