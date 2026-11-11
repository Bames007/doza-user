// app/utils/medicNotify.ts
import { adminDb } from "@/app/utils/firebaseAdmin";
import logger from "@/app/utils/logger";

export type MedicNotificationType =
  | "appointment_booked"
  | "session_starting"
  | "session_ended"
  | "new_message"
  | "patient_rated"
  | "payment_received";

export interface MedicNotification {
  id: string;
  type: MedicNotificationType;
  title: string;
  body: string;
  appointmentId: string | null;
  patientId: string | null;
  patientName: string | null;
  patientProfileImage: string | null;
  createdAt: string;
  read: boolean;
  readAt: string | null;
}

/**
 * Write a notification under `doza_medics/{medicUid}/notifications/{id}`.
 *
 * - Fire-and-forget safe: never throws, so a notification failure
 *   never breaks the calling flow (booking, chat, rating, etc).
 * - Pass `dedupeKey` to overwrite the same slot instead of stacking
 *   (e.g. one notification per chat thread, not one per message).
 */
export async function notifyMedic(
  medicUid: string,
  notif: Omit<MedicNotification, "id" | "createdAt" | "read" | "readAt"> & {
    dedupeKey?: string;
  },
): Promise<void> {
  if (!medicUid) return;

  try {
    const { dedupeKey, ...rest } = notif;
    const id =
      dedupeKey ||
      `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const record: MedicNotification = {
      id,
      ...rest,
      createdAt: new Date().toISOString(),
      read: false,
      readAt: null,
    };

    await adminDb
      .ref(`doza_medics/${medicUid}/notifications/${id}`)
      .set(record);
  } catch (err: any) {
    logger.warn({
      medicUid,
      message: "notifyMedic failed (non-fatal)",
      error: err?.message,
    });
  }
}
