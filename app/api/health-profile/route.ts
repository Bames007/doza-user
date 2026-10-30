import { NextRequest, NextResponse } from "next/server";
import { verifySessionCookie } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";
import { z } from "zod";
import logger from "@/app/utils/logger";

function stripUndefined<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(stripUndefined) as unknown as T;
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, stripUndefined(v)]),
    ) as T;
  }
  return value;
}

const healthProfileSchema = z.object({
  allergies: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string().min(1),
        type: z.enum(["medication", "food", "environmental", "other"]),
        severity: z.enum(["mild", "moderate", "severe"]),
        reaction: z.string().nullish(),
        notes: z.string().nullish(),
        createdAt: z.string().optional(),
      }),
    )
    .optional(),
  bloodType: z.string().nullish(),
  chronicConditions: z.array(z.string()).optional(),
  emergencyContact: z
    .object({
      name: z.string(),
      phone: z.string(),
      relationship: z.string(),
    })
    .nullish(),
});

const asArray = (v: any): any[] => {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  return Object.values(v);
};

export async function GET(request: NextRequest) {
  const uid = await verifySessionCookie(request);
  if (!uid) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const ref = adminDb.ref(`doza/users/${uid}/healthProfile`);
    const snap = await ref.once("value");
    const val = snap.val() || {};

    return NextResponse.json({
      success: true,
      data: {
        allergies: asArray(val.allergies),
        bloodType: val.bloodType ?? null,
        chronicConditions: asArray(val.chronicConditions),
        emergencyContact: val.emergencyContact ?? null,
      },
    });
  } catch (error) {
    logger.error({ uid, message: "GET healthProfile failed", error });
    return NextResponse.json(
      { success: false, error: "Unable to load health profile" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  const uid = await verifySessionCookie(request);
  if (!uid) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();
    const parse = healthProfileSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid health profile data",
          details: parse.error.flatten(),
        },
        { status: 400 },
      );
    }

    const ref = adminDb.ref(`doza/users/${uid}/healthProfile`);
    const snap = await ref.once("value");
    const current = snap.val() || {};
    const merged = stripUndefined({ ...current, ...parse.data });

    await ref.set(merged);
    logger.info({ uid, message: "Health profile updated" });

    return NextResponse.json({ success: true, data: merged });
  } catch (error) {
    logger.error({ uid, message: "PUT healthProfile failed", error });
    return NextResponse.json(
      { success: false, error: "Unable to save health profile" },
      { status: 500 },
    );
  }
}
