import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";
import { z } from "zod";
import logger from "@/app/utils/logger";

const addFavoriteSchema = z.object({
  medicId: z.string().min(1),
  medicData: z.object({
    name: z.string().min(1),
    specialty: z.string().optional(),
    profileImage: z.string().url().optional().nullable(),
    address: z.string().optional(),
  }),
});

const favoriteItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  specialty: z.string().optional(),
  profileImage: z.string().nullable().optional(),
  address: z.string().optional(),
  addedAt: z.string().datetime(),
});

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
    const favorites: unknown[] = snapshot.val() || [];

    const validated = favorites.map((item) =>
      favoriteItemSchema.safeParse(item),
    );
    const cleanFavorites = validated
      .filter((v) => v.success)
      .map((v) => (v as { data: unknown }).data);

    return NextResponse.json({ success: true, data: cleanFavorites });
  } catch (error) {
    logger.error({ uid, message: "GET favorites failed", error });
    return NextResponse.json(
      { success: false, error: "Unable to load favorites" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const uid = await verifyIdToken(request);
  if (!uid) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();
    const parseResult = addFavoriteSchema.safeParse(body);

    if (!parseResult.success) {
      logger.warn({
        uid,
        message: "Invalid favorite add request",
        validationErrors: parseResult.error.flatten(),
      });
      return NextResponse.json(
        {
          success: false,
          error: "Invalid data provided",
          details: parseResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { medicId, medicData } = parseResult.data;

    const favRef = adminDb.ref(`doza/users/${uid}/favorites`);
    const snapshot = await favRef.once("value");
    let favorites: any[] = snapshot.val() || [];

    const exists = favorites.some((fav) => fav.id === medicId);
    if (exists) {
      return NextResponse.json(
        { success: false, error: "Medic already in favorites" },
        { status: 409 },
      );
    }

    const newFavorite = {
      id: medicId,
      name: medicData.name,
      specialty: medicData.specialty || null,
      profileImage: medicData.profileImage || null,
      address: medicData.address || null,
      addedAt: new Date().toISOString(),
    };

    favorites.push(newFavorite);
    await favRef.set(favorites);

    logger.info({ uid, message: "Favorite added", medicId });
    return NextResponse.json(
      { success: true, data: newFavorite },
      { status: 201 },
    );
  } catch (error) {
    logger.error({ uid, message: "POST favorite failed", error });
    return NextResponse.json(
      { success: false, error: "Unable to add favorite" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const uid = await verifyIdToken(request);
  if (!uid) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const medicId = searchParams.get("medicId");

    if (!medicId) {
      return NextResponse.json(
        { success: false, error: "medicId is required" },
        { status: 400 },
      );
    }

    const favRef = adminDb.ref(`doza/users/${uid}/favorites`);
    const snapshot = await favRef.once("value");
    let favorites: any[] = snapshot.val() || [];

    const originalLength = favorites.length;
    const newFavorites = favorites.filter((fav) => fav.id !== medicId);

    if (newFavorites.length === originalLength) {
      return NextResponse.json(
        { success: false, error: "Favorite not found" },
        { status: 404 },
      );
    }

    await favRef.set(newFavorites);
    logger.info({ uid, message: "Favorite removed", medicId });
    return NextResponse.json({ success: true, data: { removed: medicId } });
  } catch (error) {
    logger.error({ uid, message: "DELETE favorite failed", error });
    return NextResponse.json(
      { success: false, error: "Unable to remove favorite" },
      { status: 500 },
    );
  }
}
