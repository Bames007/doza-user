import { NextRequest, NextResponse } from "next/server";
import { verifySessionCookie } from "@/app/utils/auth";
import { adminAuth } from "@/app/utils/firebaseAdmin";
import { z } from "zod";
import logger from "@/app/utils/logger";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[0-9]/, "Must contain a number"),
});

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
    const parseResult = changePasswordSchema.safeParse(body);

    if (!parseResult.success) {
      logger.warn({
        uid,
        message: "Invalid password change request",
        validationErrors: parseResult.error.flatten(),
      });
      return NextResponse.json(
        {
          success: false,
          error: "Invalid input",
          details: parseResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { currentPassword, newPassword } = parseResult.data;

    const user = await adminAuth.getUser(uid);
    const email = user.email;
    if (!email) {
      logger.error({ uid, message: "User has no email for password change" });
      return NextResponse.json(
        { success: false, error: "Unable to verify identity" },
        { status: 400 },
      );
    }

    const apiKey = process.env.FIREBASE_API_KEY;
    if (!apiKey) {
      logger.error({ uid, message: "Missing FIREBASE_API_KEY server-side" });
      return NextResponse.json(
        { success: false, error: "Service configuration error" },
        { status: 500 },
      );
    }

    const verifyUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
    const verifyRes = await fetch(verifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password: currentPassword,
        returnSecureToken: true,
      }),
    });

    if (!verifyRes.ok) {
      logger.warn({ uid, message: "Current password verification failed" });
      return NextResponse.json(
        { success: false, error: "Current password is incorrect" },
        { status: 403 },
      );
    }

    await adminAuth.updateUser(uid, { password: newPassword });
    logger.info({ uid, message: "Password changed successfully" });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ uid, message: "Change password failed", error });
    return NextResponse.json(
      { success: false, error: "Unable to change password" },
      { status: 500 },
    );
  }
}
