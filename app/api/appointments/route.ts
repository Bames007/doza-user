import { NextRequest, NextResponse } from "next/server";
import { verifySessionCookie } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";
import { z } from "zod";
import logger from "@/app/utils/logger";

const createAppointmentSchema = z.object({
  medicId: z.string().min(1),
  medicName: z.string().optional(),
  date: z.string().min(1),
  time: z.string().min(1),
  reason: z.string().min(1),
  notes: z.string().optional(),
  consultType: z.enum(["online", "inPerson"]).optional(),
});

export async function GET(request: NextRequest) {
  const uid = await verifySessionCookie(request);
  if (!uid) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const appointmentsRef = adminDb.ref(`doza/users/${uid}/appointments`);
    const snapshot = await appointmentsRef.get();
    const val = snapshot.val();

    let appointments = val
      ? Array.isArray(val)
        ? val
        : Object.values(val)
      : [];
    return NextResponse.json({ success: true, data: appointments });
  } catch (error) {
    logger.error({
      uid,
      message: "GET appointments failed",
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, error: "Unable to load appointments" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const uid = await verifySessionCookie(request);
  if (!uid) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();
    const parseResult = createAppointmentSchema.safeParse(body);
    if (!parseResult.success) {
      logger.warn({
        uid,
        message: "Invalid appointment data",
        validationErrors: parseResult.error.flatten(),
      });
      return NextResponse.json(
        {
          success: false,
          error: "Invalid appointment data",
          details: parseResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const appointment = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      ...parseResult.data,
      status: "upcoming",
      createdAt: new Date().toISOString(),
    };

    const appointmentsRef = adminDb.ref(`doza/users/${uid}/appointments`);
    const snapshot = await appointmentsRef.get();
    const val = snapshot.val();
    let appointments = val
      ? Array.isArray(val)
        ? val
        : Object.values(val)
      : [];

    appointments.push(appointment);
    await appointmentsRef.set(appointments);

    logger.info({
      uid,
      appointmentId: appointment.id,
      message: "Appointment created",
    });
    return NextResponse.json(
      { success: true, data: appointment },
      { status: 201 },
    );
  } catch (error) {
    logger.error({
      uid,
      message: "POST appointment failed",
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, error: "Unable to create appointment" },
      { status: 500 },
    );
  }
}
