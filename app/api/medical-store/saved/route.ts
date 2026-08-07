import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/app/utils/firebaseAdmin";
import { verifySessionCookie } from "@/app/utils/auth";
import { z } from "zod";
import logger from "@/app/utils/logger";

const productSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  price: z.number().positive(),
  imageUrl: z.string().url(),
  brand: z.string().optional().default(""),
  description: z.string().optional().default(""),
});

const savedItemActionSchema = z.object({
  product: productSchema,
  action: z.enum(["add", "remove"]),
});

export async function GET(request: NextRequest) {
  try {
    const userId = await verifySessionCookie(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const userRef = adminDb.ref(
      `doza/users/${userId}/medical-store/savedItems`,
    );
    const snapshot = await userRef.get();
    const savedItems = snapshot.exists() ? Object.values(snapshot.val()) : [];

    return NextResponse.json({ success: true, data: savedItems });
  } catch (error) {
    logger.error({ message: "GET medical saved items failed", error });
    return NextResponse.json(
      { success: false, error: "Unable to load saved items" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await verifySessionCookie(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const parseResult = savedItemActionSchema.safeParse(body);
    if (!parseResult.success) {
      logger.warn({
        userId,
        message: "Invalid saved item action",
        validationErrors: parseResult.error.flatten(),
      });
      return NextResponse.json(
        { success: false, error: "Invalid data provided" },
        { status: 400 },
      );
    }

    const { product, action } = parseResult.data;
    const userRef = adminDb.ref(
      `doza/users/${userId}/medical-store/savedItems`,
    );
    const snapshot = await userRef.get();
    let savedItems = snapshot.exists() ? snapshot.val() : {};

    if (action === "add") {
      savedItems[product.id] = { ...product, savedAt: Date.now() };
    } else {
      delete savedItems[product.id];
    }

    await userRef.set(savedItems);

    logger.info({
      userId,
      productId: product.id,
      action,
      message: "Medical saved items updated",
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ message: "POST medical saved items failed", error });
    return NextResponse.json(
      { success: false, error: "Unable to update saved items" },
      { status: 500 },
    );
  }
}
