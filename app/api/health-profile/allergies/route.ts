import { NextRequest, NextResponse } from "next/server";
import { verifySessionCookie } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";
import { z } from "zod";
import logger from "@/app/utils/logger";

const allergySchema = z.object({
  name: z.string().min(1, "Allergy name required"),
  type: z.enum(["medication", "food", "environmental", "other"]),
  severity: z.enum(["mild", "moderate", "severe"]),
  reaction: z.string().nullish(),
  notes: z.string().nullish(),
});

function asArray(v: any): any[] {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  return Object.values(v);
}

export async function POST(request: NextRequest) {
  const uid = await verifySessionCookie(request);
  if (!uid) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();
    const parse = allergySchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid allergy data",
          details: parse.error.flatten(),
        },
        { status: 400 },
      );
    }

    const newAllergy = {
      id: `alg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      name: parse.data.name.trim(),
      type: parse.data.type,
      severity: parse.data.severity,
      reaction: parse.data.reaction ?? null,
      notes: parse.data.notes ?? null,
      createdAt: new Date().toISOString(),
    };

    const ref = adminDb.ref(`doza/users/${uid}/healthProfile/allergies`);
    const snap = await ref.once("value");
    const existing = asArray(snap.val());
    const updated = [...existing, newAllergy];

    await ref.set(updated);
    logger.info({
      uid,
      allergyId: newAllergy.id,
      message: "Allergy added",
    });

    return NextResponse.json({ success: true, data: newAllergy });
  } catch (error) {
    logger.error({ uid, message: "POST allergy failed", error });
    return NextResponse.json(
      { success: false, error: "Unable to add allergy" },
      { status: 500 },
    );
  }
}
