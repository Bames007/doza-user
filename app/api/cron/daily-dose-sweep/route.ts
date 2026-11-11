import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/app/utils/firebaseAdmin";
import { scheduleAllForUser } from "@/app/utils/scheduleReminders";
import logger from "@/app/utils/logger";

export const maxDuration = 300;
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function asArray(v: any): any[] {
  if (!v) return [];
  return Array.isArray(v) ? v : Object.values(v);
}

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  let users = 0,
    meds = 0,
    scheduled = 0,
    skipped = 0,
    errors = 0;

  try {
    const snap = await adminDb.ref("doza/users").once("value");
    const allUsers = snap.val() ?? {};

    for (const [uid, data] of Object.entries<any>(allUsers)) {
      if (!data?.medications) continue;
      const activeMeds = asArray(data.medications).filter(
        (m: any) => m && m.status === "active" && m.doses,
      );
      if (activeMeds.length === 0) continue;

      users++;
      meds += activeMeds.length;
      try {
        const r = await scheduleAllForUser(uid, activeMeds);
        scheduled += r.scheduled;
        skipped += r.skipped;
      } catch (err: any) {
        errors++;
        logger.warn({
          uid,
          message: "sweep user failed",
          err: err?.message,
        });
      }
    }

    logger.info({
      users,
      meds,
      scheduled,
      skipped,
      errors,
      durationMs: Date.now() - startedAt,
      message: "daily-dose-sweep complete",
    });
    return NextResponse.json({
      success: true,
      users,
      meds,
      scheduled,
      skipped,
      errors,
      durationMs: Date.now() - startedAt,
    });
  } catch (err: any) {
    logger.error({
      message: "daily-dose-sweep crashed",
      errorMessage: err?.message,
      errorStack: err?.stack,
    });
    return NextResponse.json({ error: "Sweep failed" }, { status: 500 });
  }
}
