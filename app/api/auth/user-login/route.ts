// app/api/auth/user-login/route.ts

import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/app/utils/firebaseAdmin";
import { z } from "zod";
import logger from "@/app/utils/logger";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  rememberMe: z.boolean().optional().default(false),
});

// ─── GET handler for testing ──────────────────────────────────────
export async function GET() {
  return NextResponse.json({ message: "Login route is working" });
}

// ─── POST handler ─────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = loginSchema.safeParse(body);
    if (!parseResult.success) {
      logger.warn({
        message: "Invalid login request",
        validationErrors: parseResult.error.flatten(),
      });
      return NextResponse.json(
        { success: false, error: "Invalid login data" },
        { status: 400 },
      );
    }

    const { email, password, rememberMe } = parseResult.data;

    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!apiKey) {
      logger.error({ message: "FIREBASE_API_KEY missing" });
      return NextResponse.json(
        { success: false, error: "Service configuration error" },
        { status: 500 },
      );
    }

    // 1) Authenticate with Firebase REST API
    const signInUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
    let signInResponse;
    try {
      signInResponse = await fetch(signInUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      });
    } catch (fetchError) {
      logger.error(
        { error: String(fetchError) },
        "Firebase REST API fetch failed",
      );
      return NextResponse.json(
        { success: false, error: "Unable to authenticate with Firebase" },
        { status: 500 },
      );
    }

    const signInData = await signInResponse.json();
    if (!signInResponse.ok) {
      logger.warn({ email, reason: signInData.error?.message });
      return NextResponse.json(
        { success: false, error: "User does not exist" },
        { status: 401 },
      );
    }

    const { localId: uid, idToken } = signInData;

    // 2) Fetch user profile
    let userData;
    try {
      const userRef = adminDb.ref(`doza/users/${uid}`);
      const userSnapshot = await userRef.get();
      userData = userSnapshot.val();
    } catch (dbError) {
      logger.error(
        { uid, error: String(dbError) },
        "Failed to fetch user profile",
      );
      return NextResponse.json(
        { success: false, error: "Unable to retrieve user profile" },
        { status: 500 },
      );
    }

    // 3) Check role – must be "user"
    if (!userData || userData.role !== "user") {
      logger.warn({ uid, email, message: "Invalid role – not a user" });
      return NextResponse.json(
        { success: false, error: "User does not exist" },
        { status: 401 },
      );
    }

    // 4) Create session cookie
    const expiresIn = rememberMe
      ? 14 * 24 * 60 * 60 * 1000 // 14 days
      : 24 * 60 * 60 * 1000; // 1 day

    let sessionCookie;
    try {
      sessionCookie = await adminAuth.createSessionCookie(idToken, {
        expiresIn,
      });
    } catch (cookieError) {
      logger.error(
        { uid, error: String(cookieError) },
        "Failed to create session cookie",
      );
      return NextResponse.json(
        { success: false, error: "Unable to create session" },
        { status: 500 },
      );
    }

    // 5) Build response
    const fullName = `${userData.personalProfile?.fname || ""} ${
      userData.personalProfile?.lname || ""
    }`.trim();

    const response = NextResponse.json({
      success: true,
      data: {
        user: {
          id: uid,
          email,
          fullName: fullName || email,
          avatar: userData.personalProfile?.selectedImage || "",
          role: "user",
          subscription: userData.subscription?.plan || null,
        },
      },
    });

    response.cookies.set("__session", sessionCookie, {
      maxAge: expiresIn / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    logger.info({ uid, email }, "User logged in successfully");
    return response;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error({ error: errorMsg }, "Login error");
    return NextResponse.json(
      { success: false, error: "Unable to login" },
      { status: 500 },
    );
  }
}
