//app/api/health-records/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";

export async function GET(request: NextRequest) {
  const uid = await verifyIdToken(request);
  if (!uid)
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const type = searchParams.get("type");

  try {
    const recordsRef = adminDb.ref(`doza/users/${uid}/healthRecords`);
    const snapshot = await recordsRef.once("value");
    let records = snapshot.val() || [];

    // Filter by date range if provided
    if (from) {
      records = records.filter((r: any) => r.date >= from);
    }
    if (to) {
      records = records.filter((r: any) => r.date <= to);
    }
    if (type) {
      records = records.filter((r: any) => r.type === type);
    }

    return NextResponse.json({ success: true, data: records });
  } catch (error) {
    console.error("GET health records error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const uid = await verifyIdToken(request);
  if (!uid)
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );

  try {
    const record = await request.json();
    // Validate required fields
    if (!record.date || !record.type || record.value === undefined) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Generate an ID if not provided
    if (!record.id) {
      record.id =
        Date.now().toString() + Math.random().toString(36).substr(2, 5);
    }

    const recordsRef = adminDb.ref(`doza/users/${uid}/healthRecords`);
    // Get current records, append new one, and set back
    const snapshot = await recordsRef.once("value");
    const records = snapshot.val() || [];
    records.push(record);
    await recordsRef.set(records);

    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    console.error("POST health record error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
