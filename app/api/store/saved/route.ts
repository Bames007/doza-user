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

    const userRef = adminDb.ref(`doza/users/${userId}/store/savedItems`);
    const snapshot = await userRef.get();
    const savedItems = snapshot.exists() ? Object.values(snapshot.val()) : [];

    return NextResponse.json({ success: true, data: savedItems });
  } catch (error) {
    console.error("Error fetching saved items:", error);
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
    const { product, action } = await req.json();

    const userRef = adminDb.ref(`doza/users/${userId}/store/savedItems`);
    const snapshot = await userRef.get();
    let savedItems = snapshot.exists() ? snapshot.val() : {};

    if (action === "add") {
      // Add product with timestamp
      const item = {
        id: product.id,
        name: product.name,
        price: product.price,
        imageUrl: product.imageUrl,
        brand: product.brand,
        description: product.description,
        savedAt: Date.now(),
      };
      savedItems[product.id] = item;
    } else if (action === "remove") {
      delete savedItems[product.id];
    }

    await userRef.set(savedItems);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating saved items:", error);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 },
    );
  }
}
