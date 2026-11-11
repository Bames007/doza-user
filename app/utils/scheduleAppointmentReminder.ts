// app/utils/scheduleAppointmentReminder.ts
import "server-only";
import { qstash } from "@/app/utils/qstash";

export async function scheduleAppointmentReminder(args: {
  uid: string;
  appointmentId: string;
  medicId: string;
  scheduledAtISO: string;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!baseUrl) return;

  const scheduledMs = new Date(args.scheduledAtISO).getTime();
  if (isNaN(scheduledMs)) return;
  const now = Date.now();

  // 30-min reminder
  const reminderMs = scheduledMs - 30 * 60 * 1000;
  if (reminderMs > now + 60_000) {
    await qstash
      .publishJSON({
        url: `${baseUrl}/api/notifications/appointment-due`,
        body: {
          kind: "reminder",
          uid: args.uid,
          appointmentId: args.appointmentId,
          medicId: args.medicId,
        },
        notBefore: Math.floor(reminderMs / 1000),
        deduplicationId: `appt-reminder-${args.appointmentId}`,
        retries: 2,
      })
      .catch(() => {});
  }

  // Starting-now
  if (scheduledMs > now + 60_000) {
    await qstash
      .publishJSON({
        url: `${baseUrl}/api/notifications/appointment-due`,
        body: {
          kind: "starting",
          uid: args.uid,
          appointmentId: args.appointmentId,
          medicId: args.medicId,
        },
        notBefore: Math.floor(scheduledMs / 1000),
        deduplicationId: `appt-starting-${args.appointmentId}`,
        retries: 2,
      })
      .catch(() => {});
  }
}
