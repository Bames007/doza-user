//app/api/family/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";

export async function GET(request: NextRequest) {
  const uid = await verifyIdToken(request);
  if (!uid)
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );

  try {
    const familyRef = adminDb.ref(`doza/users/${uid}/familyFriends`);
    const snapshot = await familyRef.once("value");
    const family = snapshot.val() || [];
    return NextResponse.json({ success: true, data: family });
  } catch (error) {
    console.error("GET family error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const uid = await verifyIdToken(request);
  if (!uid)
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );

  try {
    const newContact = await request.json();
    if (!newContact.name || !newContact.phone || !newContact.relationship) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Generate ID if not present
    if (!newContact.id) {
      newContact.id =
        Date.now().toString() + Math.random().toString(36).substr(2, 5);
    }

    const familyRef = adminDb.ref(`doza/users/${uid}/familyFriends`);
    const snapshot = await familyRef.once("value");
    const family = snapshot.val() || [];
    family.push(newContact);
    await familyRef.set(family);

    return NextResponse.json({ success: true, data: newContact });
  } catch (error) {
    console.error("POST family error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
