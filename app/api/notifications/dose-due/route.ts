import { NextRequest, NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";
import { adminDb } from "@/app/utils/firebaseAdmin";
import { sendPushToUser } from "@/app/utils/push";
import logger from "@/app/utils/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
});

function asArray(v: any): any[] {
  if (!v) return [];
  return Array.isArray(v) ? v : Object.values(v);
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get("upstash-signature");
  const body = await request.text();
  if (!signature)
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });

  try {
    const valid = await receiver.verify({ signature, body, url: request.url });
    if (!valid)
      return NextResponse.json({ error: "Bad signature" }, { status: 401 });
  } catch (err: any) {
    logger.warn({ message: "QStash verify threw", err: err?.message });
    return NextResponse.json({ error: "Bad signature" }, { status: 401 });
  }

  let payload: { uid: string; doseIds: string[]; minuteBucket: number };
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }
  const { uid, doseIds } = payload;
  if (!uid || !Array.isArray(doseIds) || doseIds.length === 0) {
    return NextResponse.json({ skipped: "empty-payload" });
  }

  try {
    const medsSnap = await adminDb
      .ref(`doza/users/${uid}/medications`)
      .once("value");
    const meds = asArray(medsSnap.val());
    const doseIdSet = new Set(doseIds);
    const pending: {
      medName: string;
      dosage: string;
      doseId: string;
    }[] = [];

    for (const med of meds) {
      if (!med || med.status !== "active" || !med.doses) continue;
      for (const dose of asArray(med.doses)) {
        if (!dose || !doseIdSet.has(dose.id)) continue;
        if (dose.takenAt || dose.skipped) continue;
        pending.push({
          medName: med.name ?? "Medication",
          dosage: med.dosage ?? "",
          doseId: dose.id,
        });
      }
    }

    if (pending.length === 0) {
      return NextResponse.json({ skipped: "no-pending-doses" });
    }

    let title: string, bodyText: string, tag: string;
    if (pending.length === 1) {
      const p = pending[0];
      title = "Medication due";
      bodyText = `${p.medName}${p.dosage ? ` ${p.dosage}` : ""} — take it now`;
      tag = `dose-${p.doseId}`;
    } else {
      const names = Array.from(new Set(pending.map((p) => p.medName)));
      title = `${pending.length} medications due`;
      bodyText =
        names.slice(0, 3).join(", ") +
        (names.length > 3 ? ` +${names.length - 3} more` : "");
      tag = `dose-bucket-${payload.minuteBucket}`;
    }

    const result = await sendPushToUser(uid, {
      title,
      body: bodyText,
      url: "/dashboard?panel=medications",
      tag,
    });

    logger.info({
      uid,
      doseCount: pending.length,
      ...result,
      message: "Dose push delivered",
    });
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    logger.error({
      uid,
      message: "dose-due handler failed",
      errorMessage: err?.message,
      errorStack: err?.stack,
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
