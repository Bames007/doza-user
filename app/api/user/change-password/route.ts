import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/app/utils/auth";
import { adminAuth } from "@/app/utils/firebaseAdmin";

export async function POST(request: NextRequest) {
  const uid = await verifyIdToken(request);
  if (!uid) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const { currentPassword, newPassword } = await request.json();

    // Get user's email from Auth
    const user = await adminAuth.getUser(uid);
    const email = user.email;
    if (!email) {
      return NextResponse.json(
        { success: false, error: "User has no email" },
        { status: 400 },
      );
    }

    // Verify current password by signing in with Firebase Auth REST API
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY!;
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
      return NextResponse.json(
        { success: false, error: "Current password is incorrect" },
        { status: 403 },
      );
    }

    // Update password using Admin SDK
    await adminAuth.updateUser(uid, { password: newPassword });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
