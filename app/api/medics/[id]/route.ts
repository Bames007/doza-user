import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/app/utils/firebaseAdmin";
import { z } from "zod";
import logger from "@/app/utils/logger";

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 10_000; // 10 seconds for single medic

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const idValidation = z.string().min(1).safeParse(id);
  if (!idValidation.success) {
    return NextResponse.json(
      { success: false, error: "Invalid medic ID" },
      { status: 400 },
    );
  }

  const cacheKey = `medic_${id}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json({ success: true, data: cached.data });
  }

  try {
    const snapshot = await adminDb.ref(`doza/medics/${id}`).once("value");
    const medic = snapshot.val();

    if (!medic) {
      logger.warn({ medicId: id, message: "Medic not found" });
      return NextResponse.json(
        { success: false, error: "Medic not found" },
        { status: 404 },
      );
    }

    cache.set(cacheKey, { data: medic, timestamp: Date.now() });
    return NextResponse.json({ success: true, data: medic });
  } catch (error) {
    logger.error({ medicId: id, message: "GET medic failed", error });
    return NextResponse.json(
      { success: false, error: "Unable to load medic" },
      { status: 500 },
    );
  }
}
