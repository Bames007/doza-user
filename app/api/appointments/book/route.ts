import { NextRequest, NextResponse } from "next/server";
import { verifySessionCookie } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";
import { z } from "zod";
import logger from "@/app/utils/logger";

const paystackBookingSchema = z.object({
  reference: z.string().min(1),
  medicId: z.string().min(1),
  schedule: z.object({
    date: z.string().min(1),
    time: z.string().min(1),
  }),
  type: z.string().optional().default("video"),
  amount: z.number().positive(),
});

export async function POST(req: NextRequest) {
  const uid = await verifySessionCookie(req);
  if (!uid) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const body = await req.json();
    const parseResult = paystackBookingSchema.safeParse(body);
    if (!parseResult.success) {
      logger.warn({
        uid,
        message: "Invalid Paystack booking data",
        validationErrors: parseResult.error.flatten(),
      });
      return NextResponse.json(
        {
          success: false,
          error: "Invalid booking data",
          details: parseResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { reference, medicId, schedule, type, amount } = parseResult.data;

    // Verify payment with Paystack
    const paystackRes = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      },
    );

    const verification = await paystackRes.json();
    if (!paystackRes.ok || verification.data?.status !== "success") {
      logger.warn({ uid, reference, message: "Payment verification failed" });
      return NextResponse.json(
        { success: false, error: "Payment verification failed" },
        { status: 400 },
      );
    }

    // Save appointment under the authenticated user
    const appointmentRef = adminDb.ref(`doza/users/${uid}/appointments`).push();
    const appointment = {
      id: appointmentRef.key,
      medicId,
      schedule,
      consultType: type,
      amountPaid: amount,
      paymentReference: reference,
      status: "confirmed",
      createdAt: new Date().toISOString(),
    };

    await appointmentRef.set(appointment);

    logger.info({
      uid,
      appointmentId: appointment.id,
      medicId,
      reference,
      message: "Paystack appointment booked",
    });

    return NextResponse.json({
      success: true,
      appointmentId: appointment.id,
    });
  } catch (error) {
    logger.error({ uid, message: "Paystack booking failed", error });
    return NextResponse.json(
      { success: false, error: "Unable to book appointment" },
      { status: 500 },
    );
  }
}
