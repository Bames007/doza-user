import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/app/utils/firebaseAdmin";
import { cookies } from "next/headers";
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

async function getUserIdFromSession(): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;
  if (!sessionCookie) return null;
  const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
  return decoded.uid;
}

export async function GET() {
  try {
    const userId = await getUserIdFromSession();
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

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromSession();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await req.json();
    const parseResult = savedItemActionSchema.safeParse(body);
    if (!parseResult.success) {
      logger.warn({
        userId,
        message: "Invalid saved item action",
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

    const { product, action } = parseResult.data;
    const userRef = adminDb.ref(
      `doza/users/${userId}/medical-store/savedItems`,
    );
    const snapshot = await userRef.get();
    let savedItems = snapshot.exists() ? snapshot.val() : {};

    if (action === "add") {
      savedItems[product.id] = {
        ...product,
        savedAt: Date.now(),
      };
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
