import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/app/utils/firebaseAdmin";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    if (!rawBody) {
      return NextResponse.json(
        { success: false, error: "Empty request body" },
        { status: 400 },
      );
    }

    const { idToken, rememberMe } = JSON.parse(rawBody);

    if (!idToken) {
      return NextResponse.json(
        { success: false, error: "Missing ID token" },
        { status: 400 },
      );
    }

    await adminAuth.verifyIdToken(idToken);

    const expiresInMs = rememberMe
      ? 14 * 24 * 60 * 60 * 1000 // 14 days
      : 24 * 60 * 60 * 1000; // 1 day

    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: expiresInMs,
    });

    const response = NextResponse.json({ success: true });

    response.cookies.set("__session", sessionCookie, {
      maxAge: expiresInMs / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("❌ Set session error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to set session" },
      { status: 500 },
    );
  }
}
