import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";

export async function POST(request: NextRequest) {
  const uid = await verifyIdToken(request);
  if (!uid)
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );

  try {
    const { medicId, content } = await request.json();
    if (!medicId || !content) {
      return NextResponse.json(
        { success: false, error: "Missing medicId or content" },
        { status: 400 },
      );
    }

    const favRef = adminDb.ref(`doza/users/${uid}/favorites`);
    const favSnapshot = await favRef.once("value");
    const favorites = favSnapshot.val() || [];
    if (!favorites.some((fav: any) => fav.id === medicId)) {
      return NextResponse.json(
        { success: false, error: "Medic not in favorites" },
        { status: 403 },
      );
    }

    const msgRef = adminDb.ref(`doza/users/${uid}/messages`);
    const snapshot = await msgRef.once("value");
    const messages = snapshot.val() || [];
    const newMessage = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      medicId,
      content,
      timestamp: new Date().toISOString(),
    };
    messages.push(newMessage);
    await msgRef.set(messages);

    return NextResponse.json({ success: true, data: newMessage });
  } catch (error) {
    console.error("POST message error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
