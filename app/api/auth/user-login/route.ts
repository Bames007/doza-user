// app/api/auth/user-login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/app/utils/firebaseAdmin";

export async function POST(request: NextRequest) {
  try {
    const { email, password, rememberMe } = await request.json();

    console.log("🔐 USER LOGIN ATTEMPT:", { email, rememberMe });

    if (!email?.trim()) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 },
      );
    }
    if (!password?.trim()) {
      return NextResponse.json(
        { success: false, error: "Password is required" },
        { status: 400 },
      );
    }

    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!apiKey) {
      console.error("❌ Missing NEXT_PUBLIC_FIREBASE_API_KEY");
      return NextResponse.json(
        { success: false, error: "Server configuration error" },
        { status: 500 },
      );
    }

    const signInUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;

    const signInResponse = await fetch(signInUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim(),
        password,
        returnSecureToken: true,
      }),
    });

    const signInData = await signInResponse.json();

    if (!signInResponse.ok) {
      let errorMessage = "Invalid email or password.";
      if (signInData.error?.message === "EMAIL_NOT_FOUND") {
        errorMessage = "No account found with this email.";
      } else if (signInData.error?.message === "INVALID_PASSWORD") {
        errorMessage = "Incorrect password.";
      } else if (signInData.error?.message === "USER_DISABLED") {
        errorMessage = "This account has been disabled.";
      }
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 401 },
      );
    }

    const { localId: uid, email: userEmail } = signInData;

    // Fetch user profile from Realtime Database using method-style
    const userRef = adminDb.ref(`doza/users/${uid}`);
    const userSnapshot = await userRef.get();

    if (!userSnapshot.exists()) {
      return NextResponse.json(
        {
          success: false,
          error: "User profile not found. Please contact support.",
        },
        { status: 404 },
      );
    }

    const userData = userSnapshot.val();

    // Set session expiry based on rememberMe
    const expiresIn = rememberMe
      ? 30 * 24 * 60 * 60 * 1000
      : 24 * 60 * 60 * 1000;
    const expiresAt = Date.now() + expiresIn;

    const sessionData = {
      user: {
        id: uid,
        email: userEmail,
        fullName:
          `${userData.personalProfile?.fname || ""} ${userData.personalProfile?.lname || ""}`.trim(),
        avatar: userData.personalProfile?.selectedImage || "",
        role: "user",
        subscription: userData.subscription?.plan || null,
        sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        expiresAt,
      },
      loginTime: new Date().toISOString(),
    };

    console.log(
      "✅ User login successful:",
      sessionData.user.fullName || sessionData.user.email,
    );
    return NextResponse.json({ success: true, data: sessionData });
  } catch (error: any) {
    console.error("❌ User login error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Authentication server error. Please try again later.",
      },
      { status: 500 },
    );
  }
}
