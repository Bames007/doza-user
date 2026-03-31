import { NextRequest, NextResponse } from "next/server";
import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
}

const db = admin.database();

export async function POST(req: NextRequest) {
  try {
    const { reference, medicId, patientId, schedule, type, amount } =
      await req.json();

    // 1. Verify with Paystack
    const paystackRes = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      },
    );

    const verification = await paystackRes.json();

    if (verification.data.status !== "success") {
      return NextResponse.json(
        { success: false, error: "Payment verification failed" },
        { status: 400 },
      );
    }

    // 2. Save Appointment to Firebase
    const appointmentRef = db.ref("appointments").push();
    await appointmentRef.set({
      medicId,
      patientId,
      schedule,
      consultType: type,
      amountPaid: amount,
      paymentReference: reference,
      status: "confirmed",
      createdAt: new Date().toISOString(),
    });

    // 3. Optional: Trigger notification to medic here

    return NextResponse.json({
      success: true,
      appointmentId: appointmentRef.key,
    });
  } catch (error) {
    console.error("Booking Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
