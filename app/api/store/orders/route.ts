import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/app/utils/firebaseAdmin";
import { cookies } from "next/headers";
import { z } from "zod";
import logger from "@/app/utils/logger";

const orderSchema = z.object({
  items: z.array(z.any()).min(1),
  total: z.number().positive(),
  shippingAddress: z.string().min(1),
  paymentMethod: z.string().optional(),
});

async function getUserIdFromSession(): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("__session")?.value;
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

    const ordersRef = adminDb.ref(`doza/users/${userId}/store/orders`);
    const snapshot = await ordersRef.get();
    const orders = snapshot.exists() ? snapshot.val() : {};

    return NextResponse.json({ success: true, data: orders });
  } catch (error) {
    logger.error({ message: "GET orders failed", error });
    return NextResponse.json(
      { success: false, error: "Unable to load orders" },
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
    const parseResult = orderSchema.safeParse(body);
    if (!parseResult.success) {
      logger.warn({
        userId,
        message: "Invalid order payload",
        validationErrors: parseResult.error.flatten(),
      });
      return NextResponse.json(
        {
          success: false,
          error: "Invalid order data",
          details: parseResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const orderId = `DOZA-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newOrder = {
      orderId,
      ...parseResult.data,
      createdAt: Date.now(),
      status: "processing",
    };

    const orderRef = adminDb.ref(
      `doza/users/${userId}/store/orders/${orderId}`,
    );
    await orderRef.set(newOrder);

    logger.info({ userId, orderId, message: "Order created" });
    return NextResponse.json({ success: true, data: orderId });
  } catch (error) {
    logger.error({ message: "POST order failed", error });
    return NextResponse.json(
      { success: false, error: "Unable to create order" },
      { status: 500 },
    );
  }
}
