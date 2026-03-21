import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";

// POST /api/calls – log a call to a medic (only if medic is in favorites)
export async function POST(request: NextRequest) {
  const uid = await verifyIdToken(request);
  if (!uid) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const { medicId } = await request.json();
    if (!medicId) {
      return NextResponse.json(
        { success: false, error: "Missing medicId" },
        { status: 400 },
      );
    }

    // Verify medic is in user's favorites
    const favRef = adminDb.ref(`doza/users/${uid}/favorites`);
    const favSnapshot = await favRef.once("value");
    const favorites = favSnapshot.val() || [];
    const isFav = favorites.some((fav: any) => fav.id === medicId);
    if (!isFav) {
      return NextResponse.json(
        { success: false, error: "You can only call medics in your favorites" },
        { status: 403 },
      );
    }

    // Log the call
    const callRef = adminDb.ref(`doza/users/${uid}/calls`);
    const snapshot = await callRef.once("value");
    const calls = snapshot.val() || [];

    const newCall = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      medicId,
      timestamp: new Date().toISOString(),
    };
    calls.push(newCall);
    await callRef.set(calls);

    return NextResponse.json({ success: true, data: newCall });
  } catch (error) {
    console.error("POST call error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
