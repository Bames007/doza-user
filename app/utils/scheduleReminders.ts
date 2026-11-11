import "server-only";
import { qstash } from "@/app/utils/qstash";

const LEAD_MS = 10 * 60 * 1000;
const WINDOW_MS = 6 * 24 * 60 * 60 * 1000;
const MIN_AHEAD_MS = 60 * 1000;

type DoseLike = {
  id?: string; // ✅ optional — matches zod schema output
  scheduledTime: string;
  takenAt?: string | null;
  skipped?: boolean;
};

type MedicationLike = {
  id: string;
  name: string;
  dosage: string;
  status: string;
  doses?: DoseLike[];
};

type Bucket = {
  minuteBucket: number;
  doseIds: Set<string>;
};

export async function scheduleDoseReminders(
  uid: string,
  medication: MedicationLike,
): Promise<{ scheduled: number; skipped: number; missingId: number }> {
  if (medication.status !== "active" || !medication.doses?.length) {
    return { scheduled: 0, skipped: 0, missingId: 0 };
  }
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!baseUrl) return { scheduled: 0, skipped: 0, missingId: 0 };

  const now = Date.now();
  const windowEnd = now + WINDOW_MS;
  const buckets = new Map<number, Bucket>();
  let skipped = 0;
  let missingId = 0;

  for (const dose of medication.doses) {
    // ✅ doses without a stable id cannot be matched by dose-due,
    //    so skip them rather than scheduling an undeliverable message.
    if (!dose?.id) {
      missingId++;
      continue;
    }
    if (!dose.scheduledTime || dose.takenAt || dose.skipped) {
      skipped++;
      continue;
    }
    const doseMs = new Date(dose.scheduledTime).getTime();
    if (isNaN(doseMs)) {
      skipped++;
      continue;
    }
    const notifyAt = doseMs - LEAD_MS;
    if (notifyAt < now + MIN_AHEAD_MS || doseMs > windowEnd) {
      skipped++;
      continue;
    }
    const minuteBucket = Math.floor(notifyAt / 60_000) * 60;
    if (!buckets.has(minuteBucket)) {
      buckets.set(minuteBucket, { minuteBucket, doseIds: new Set() });
    }
    buckets.get(minuteBucket)!.doseIds.add(dose.id);
  }

  let scheduled = 0;
  for (const bucket of buckets.values()) {
    try {
      await qstash.publishJSON({
        url: `${baseUrl}/api/notifications/dose-due`,
        body: {
          uid,
          minuteBucket: bucket.minuteBucket,
          doseIds: Array.from(bucket.doseIds),
        },
        notBefore: bucket.minuteBucket,
        deduplicationId: `dose-bucket-${uid}-${bucket.minuteBucket}`,
        retries: 2,
        timeout: 15,
      });
      scheduled++;
    } catch (err: any) {
      console.error(
        `[scheduleDoseReminders] publish failed uid=${uid} bucket=${bucket.minuteBucket}: ${err?.message}`,
      );
    }
  }
  return { scheduled, skipped, missingId };
}

export async function scheduleAllForUser(
  uid: string,
  medications: MedicationLike[],
): Promise<{ scheduled: number; skipped: number; missingId: number }> {
  let scheduled = 0,
    skipped = 0,
    missingId = 0;
  for (const med of medications) {
    const r = await scheduleDoseReminders(uid, med);
    scheduled += r.scheduled;
    skipped += r.skipped;
    missingId += r.missingId;
  }
  return { scheduled, skipped, missingId };
}
