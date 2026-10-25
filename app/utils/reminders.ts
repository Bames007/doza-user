// app/utils/reminders.ts
import "server-only";
import { adminDb } from "./firebaseAdmin";

// Local shape - no external import needed
type Dose = {
  id: string;
  scheduledTime: string;
  takenAt?: string;
};

/**
 * Rewrites the reminder index for one medication.
 * Call this after creating or updating a medication.
 */
export async function indexMedicationReminders(
  uid: string,
  med: {
    id: string;
    name: string;
    dosage: string;
    status: string;
    doses: Dose[];
  },
): Promise<void> {
  const base = `doza/reminders/${uid}/${med.id}`;
  const updates: Record<string, unknown> = {};

  for (const dose of med.doses ?? []) {
    if (!dose?.id || !dose?.scheduledTime) continue;
    if (dose.takenAt) continue;

    const doseTime = new Date(dose.scheduledTime).getTime();
    if (Number.isNaN(doseTime)) continue;
    // Skip doses more than a day in the past - they will never fire
    if (doseTime < Date.now() - 86_400_000) continue;

    updates[`${base}/${dose.id}`] = {
      uid,
      medId: med.id,
      medName: med.name,
      dosage: med.dosage,
      doseTime,
      status: med.status,
      sent: { "10": false, "5": false, "1": false, "0": false },
    };
  }

  // Clear old rows for this medication, then write the current set
  await adminDb.ref(base).remove();
  if (Object.keys(updates).length > 0) {
    await adminDb.ref().update(updates);
  }
}

/**
 * Removes all reminder rows for one medication.
 * Call this when a medication is deleted or marked completed.
 */
export async function clearMedicationReminders(
  uid: string,
  medId: string,
): Promise<void> {
  await adminDb.ref(`doza/reminders/${uid}/${medId}`).remove();
}
