import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";

// GET /api/user/favorites – retrieve user's favorite medics
export async function GET(request: NextRequest) {
  const uid = await verifyIdToken(request);
  if (!uid) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const favRef = adminDb.ref(`doza/users/${uid}/favorites`);
    const snapshot = await favRef.once("value");
    const favorites = snapshot.val() || [];
    return NextResponse.json({ success: true, data: favorites });
  } catch (error) {
    console.error("GET favorites error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/user/favorites – add a medic to favorites
export async function POST(request: NextRequest) {
  const uid = await verifyIdToken(request);
  if (!uid) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const { medicId, medicData } = await request.json();
    if (!medicId || !medicData) {
      return NextResponse.json(
        { success: false, error: "Missing medicId or medicData" },
        { status: 400 },
      );
    }

    const favRef = adminDb.ref(`doza/users/${uid}/favorites`);
    const snapshot = await favRef.once("value");
    let favorites = snapshot.val() || [];

    // Check if already in favorites
    const exists = favorites.some((fav: any) => fav.id === medicId);
    if (exists) {
      return NextResponse.json(
        { success: false, error: "Medic already in favorites" },
        { status: 400 },
      );
    }

    // Add new favorite
    const newFavorite = {
      id: medicId,
      name: medicData.name,
      specialty: medicData.specialty,
      profileImage: medicData.profileImage,
      address: medicData.address,
      addedAt: new Date().toISOString(),
    };
    favorites.push(newFavorite);
    await favRef.set(favorites);

    return NextResponse.json({ success: true, data: newFavorite });
  } catch (error) {
    console.error("POST favorite error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE /api/user/favorites – remove a medic from favorites (via query param)
export async function DELETE(request: NextRequest) {
  const uid = await verifyIdToken(request);
  if (!uid) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const medicId = searchParams.get("medicId");

  if (!medicId) {
    return NextResponse.json(
      { success: false, error: "Missing medicId query parameter" },
      { status: 400 },
    );
  }

  try {
    const favRef = adminDb.ref(`doza/users/${uid}/favorites`);
    const snapshot = await favRef.once("value");
    let favorites = snapshot.val() || [];

    const newFavorites = favorites.filter((fav: any) => fav.id !== medicId);
    await favRef.set(newFavorites);

    return NextResponse.json({ success: true, data: { removed: medicId } });
  } catch (error) {
    console.error("DELETE favorite error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
