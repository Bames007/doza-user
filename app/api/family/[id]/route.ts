//app/api/family/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const uid = await verifyIdToken(request);
  if (!uid)
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );

  const id = params.id;
  try {
    const updates = await request.json();
    delete updates.id; // don't allow ID change

    const familyRef = adminDb.ref(`doza/users/${uid}/familyFriends`);
    const snapshot = await familyRef.once("value");
    let family = snapshot.val() || [];
    const index = family.findIndex((c: any) => c.id === id);
    if (index === -1) {
      return NextResponse.json(
        { success: false, error: "Contact not found" },
        { status: 404 },
      );
    }

    family[index] = { ...family[index], ...updates };
    await familyRef.set(family);

    return NextResponse.json({ success: true, data: family[index] });
  } catch (error) {
    console.error("PUT family error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const uid = await verifyIdToken(request);
  if (!uid)
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );

  const id = params.id;
  try {
    const familyRef = adminDb.ref(`doza/users/${uid}/familyFriends`);
    const snapshot = await familyRef.once("value");
    let family = snapshot.val() || [];
    const newFamily = family.filter((c: any) => c.id !== id);
    await familyRef.set(newFamily);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE family error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
