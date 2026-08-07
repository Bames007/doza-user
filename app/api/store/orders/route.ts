import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/app/utils/firebaseAdmin";
import { verifySessionCookie } from "@/app/utils/auth";
import { z } from "zod";
import logger from "@/app/utils/logger";

const orderSchema = z.object({
  items: z.array(z.any()).min(1),
  total: z.number().positive(),
  shippingAddress: z.string().min(1),
  paymentMethod: z.string().optional(),
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
    const parseResult = orderSchema.safeParse(body);
    if (!parseResult.success) {
      logger.warn({
        userId,
        message: "Invalid order payload",
        validationErrors: parseResult.error.flatten(),
      });
      return NextResponse.json(
        { success: false, error: "Invalid order data" },
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
