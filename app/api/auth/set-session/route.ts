import { NextRequest, NextResponse } from "next/server";
import { serialize } from "cookie";

export async function POST(request: NextRequest) {
  try {
    const sessionData = await request.json();

    // Validate session data
    if (!sessionData?.user?.id || !sessionData?.user?.email) {
      return NextResponse.json(
        { success: false, error: "Invalid session data" },
        { status: 400 },
      );
    }

    // Serialize session to JSON string
    const sessionString = JSON.stringify(sessionData);

    // Determine cookie expiry from sessionData.user.expiresAt
    const expiresAt = sessionData.user.expiresAt;
    const maxAge = Math.floor((expiresAt - Date.now()) / 1000); // in seconds

    // Set cookie
    const cookie = serialize("session", sessionString, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: maxAge > 0 ? maxAge : 0, // if expired, set to 0
    });

    const response = NextResponse.json({ success: true });
    response.headers.set("Set-Cookie", cookie);
    return response;
  } catch (error) {
    console.error("❌ Set session error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to set session" },
      { status: 500 },
    );
  }
}
