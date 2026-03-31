//app/api/medics/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/app/utils/firebaseAdmin";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const id = params.id;
  try {
    const medicsRef = adminDb.ref("doza/medics");
    const snapshot = await medicsRef.once("value");
    const medics = snapshot.val() || [];
    const medic = medics.find((m: any) => m.id === id);
    if (!medic) {
      return NextResponse.json(
        { success: false, error: "Medic not found" },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true, data: medic });
  } catch (error) {
    console.error("GET medic by id error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
