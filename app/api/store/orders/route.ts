import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/app/utils/firebaseAdmin";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = cookies();
    const sessionCookie = (await cookieStore).get("session")?.value;
    if (!sessionCookie) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }
    const session = JSON.parse(sessionCookie);
    const userId = session.user.id;

    const ordersRef = adminDb.ref(`doza/users/${userId}/store/orders`);
    const snapshot = await ordersRef.get();
    const orders = snapshot.exists() ? snapshot.val() : {};

    return NextResponse.json({ success: true, data: orders });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const sessionCookie = (await cookieStore).get("session")?.value;
    if (!sessionCookie) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }
    const session = JSON.parse(sessionCookie);
    const userId = session.user.id;
    const orderData = await req.json();

    // Generate a unique order ID
    const orderId = `DOZA-${Date.now()}`;
    const newOrder = {
      orderId,
      ...orderData,
      createdAt: Date.now(),
      status: "processing",
    };

    const orderRef = adminDb.ref(
      `doza/users/${userId}/store/orders/${orderId}`,
    );
    await orderRef.set(newOrder);

    // Optionally clear the cart (client should handle that)
    return NextResponse.json({ success: true, data: orderId });
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 },
    );
  }
}
