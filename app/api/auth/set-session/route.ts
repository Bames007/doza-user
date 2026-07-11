import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/app/utils/firebaseAdmin";
import { z } from "zod";
import logger from "@/app/utils/logger";

const setSessionSchema = z.object({
  idToken: z.string().min(1),
  rememberMe: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = setSessionSchema.safeParse(body);
    if (!parseResult.success) {
      logger.warn({
        message: "Invalid set-session request",
        validationErrors: parseResult.error.flatten(),
      });
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request data",
          details: parseResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { idToken, rememberMe } = parseResult.data;
    await adminAuth.verifyIdToken(idToken);

    const expiresIn = rememberMe
      ? 14 * 24 * 60 * 60 * 1000
      : 24 * 60 * 60 * 1000;

    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn,
    });

    const response = NextResponse.json({ success: true });
    response.cookies.set("__session", sessionCookie, {
      maxAge: expiresIn / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return response;
  } catch (error) {
    logger.error({ message: "Set session failed", error });
    return NextResponse.json(
      { success: false, error: "Unable to set session" },
      { status: 500 },
    );
  }
}
