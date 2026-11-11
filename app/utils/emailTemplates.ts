// app/utils/emailTemplates.ts
import "server-only";

// ─── Fixed URLs (hardcoded to production domains) ─────
const USER_APP_URL =
  process.env.NEXT_PUBLIC_USER_APP_URL || "https://users.dozamedic.com";
const MEDIC_APP_URL =
  process.env.NEXT_PUBLIC_MEDIC_APP_URL || "https://medics.dozamedic.com";
const SITE_URL = "https://dozamedic.com";
const LOGO_URL = "https://dozamedic.com/logo.png";
const BRAND = "Doza Medic";

type Apt = {
  id: string;
  medicName?: string | null;
  patientName?: string | null;
  date: string;
  time: string;
  consultType?: string | null;
  duration?: string | null;
  address?: string | null;
  amount?: number | null;
  reason?: string | null;
};

// ─── Formatters ───────────────────────────────────────
function fmtDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function fmtMoney(n?: number | null): string {
  if (!n) return "";
  return `₦${Math.round(n).toLocaleString()}`;
}

function consultLabel(apt: Apt): string {
  const isOnline = apt.consultType === "online";
  const base = isOnline ? "Online consultation" : "In-person visit";
  return apt.duration ? `${base} · ${apt.duration}` : base;
}

// ─── Shell (logo header + tight body + footer) ────────
function shell(inner: string, footerExtra?: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${BRAND}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1f5f9;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;">

          <!-- Header with logo -->
          <tr>
            <td style="padding:16px 20px;border-bottom:1px solid #f1f5f9;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td valign="middle">
                    <img src="${LOGO_URL}" alt="${BRAND}" height="28" style="display:block;height:28px;width:auto;border:0;outline:none;text-decoration:none;" />
                  </td>
                  <td align="right" valign="middle">
                    <span style="font-size:11px;font-weight:600;color:#94a3b8;letter-spacing:.02em;">${BRAND}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:20px;">${inner}</td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:14px 20px;background:#f8fafc;border-top:1px solid #f1f5f9;">
              <p style="margin:0;color:#94a3b8;font-size:11px;line-height:1.5;">
                Sent by ${BRAND} · <a href="${SITE_URL}" style="color:#64748b;text-decoration:underline;">dozamedic.com</a>
                ${footerExtra ? `<br>${footerExtra}` : ""}
              </p>
            </td>
          </tr>
        </table>

        <!-- Below-card hint -->
        <p style="margin:12px 0 0;color:#94a3b8;font-size:10px;text-align:center;line-height:1.4;">
          Do not reply to this automated message.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Two-column details block (tight, scannable) ──────
function detailsBlock(apt: Apt): string {
  const rows: Array<[string, string]> = [
    ["Date", fmtDate(apt.date)],
    ["Time", apt.time],
    ["Type", consultLabel(apt)],
  ];
  if (apt.address) rows.push(["Address", apt.address]);
  if (apt.reason) rows.push(["Reason", apt.reason]);
  if (apt.amount) rows.push(["Paid", fmtMoney(apt.amount)]);

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border-radius:10px;padding:2px 14px;margin-bottom:18px;border:1px solid #f1f5f9;">
      ${rows
        .map(
          ([label, value], i) => `
        <tr>
          <td style="padding:9px 0;${i > 0 ? "border-top:1px solid #e2e8f0;" : ""}font-size:12px;color:#64748b;vertical-align:top;width:90px;">${label}</td>
          <td style="padding:9px 0;${i > 0 ? "border-top:1px solid #e2e8f0;" : ""}font-size:13px;font-weight:600;color:#0f172a;text-align:right;vertical-align:top;">${value}</td>
        </tr>`,
        )
        .join("")}
    </table>
  `;
}

// ─── CTA button ───────────────────────────────────────
function ctaButton(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;padding:11px 22px;border-radius:8px;font-weight:700;font-size:13px;letter-spacing:.01em;">${label}</a>`;
}

// ═══════════════════════════════════════════════════════
// PATIENT-facing templates → users.dozamedic.com
// ═══════════════════════════════════════════════════════

export function bookingConfirmedPatient(apt: Apt, _appUrl?: string) {
  return {
    subject: `Booking confirmed — ${apt.medicName ?? "your medic"} on ${fmtDate(apt.date)}`,
    html: shell(
      `
      <p style="margin:0 0 4px;color:#059669;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;">Booking confirmed</p>
      <h1 style="margin:0 0 8px;font-size:20px;line-height:1.3;color:#0f172a;">You're booked with ${apt.medicName ?? "your medic"}</h1>
      <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.5;">
        Hi ${apt.patientName ?? "there"}, your appointment is confirmed. We'll remind you 30 minutes before it starts.
      </p>
      ${detailsBlock(apt)}
      <p style="margin:0 0 14px;text-align:center;">${ctaButton(`${USER_APP_URL}/dashboard?panel=appointment`, "View my appointment")}</p>
      <p style="margin:0;color:#94a3b8;font-size:11px;line-height:1.5;text-align:center;">
        You can also join from the Doza dashboard.
      </p>
      `,
      `<a href="${USER_APP_URL}" style="color:#64748b;text-decoration:underline;">Open Doza</a>`,
    ),
  };
}

export function reminderPatient(apt: Apt, _appUrl?: string) {
  return {
    subject: `Starting in 30 minutes — with ${apt.medicName ?? "your medic"}`,
    html: shell(
      `
      <p style="margin:0 0 4px;color:#059669;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;">Starts in 30 minutes</p>
      <h1 style="margin:0 0 8px;font-size:20px;line-height:1.3;color:#0f172a;">Get ready for your session</h1>
      <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.5;">
        Hi ${apt.patientName ?? "there"}, your appointment with ${apt.medicName ?? "your medic"} starts soon.
      </p>
      ${detailsBlock(apt)}
      <p style="margin:0 0 14px;text-align:center;">${ctaButton(`${USER_APP_URL}/dashboard?panel=appointment`, "Open my appointment")}</p>
      <p style="margin:0;color:#94a3b8;font-size:11px;line-height:1.5;text-align:center;">
        You'll get another notification when the session starts.
      </p>
      `,
      `<a href="${USER_APP_URL}" style="color:#64748b;text-decoration:underline;">Open Doza</a>`,
    ),
  };
}

export function startingPatient(apt: Apt, _appUrl?: string) {
  return {
    subject: `Your session with ${apt.medicName ?? "your medic"} is starting`,
    html: shell(
      `
      <p style="margin:0 0 4px;color:#059669;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;">Starting now</p>
      <h1 style="margin:0 0 8px;font-size:20px;line-height:1.3;color:#0f172a;">${apt.medicName ?? "Your medic"} is ready</h1>
      <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.5;">
        Hi ${apt.patientName ?? "there"}, join your session now from the Doza dashboard.
      </p>
      ${detailsBlock(apt)}
      <p style="margin:0 0 14px;text-align:center;">${ctaButton(`${USER_APP_URL}/dashboard?panel=appointment`, "Enter session now")}</p>
      <p style="margin:0;color:#94a3b8;font-size:11px;line-height:1.5;text-align:center;">
        If the button doesn't work, open the Doza dashboard and tap the appointment.
      </p>
      `,
      `<a href="${USER_APP_URL}" style="color:#64748b;text-decoration:underline;">Open Doza</a>`,
    ),
  };
}

// ═══════════════════════════════════════════════════════
// MEDIC-facing templates → medics.dozamedic.com
// ═══════════════════════════════════════════════════════

export function bookingConfirmedMedic(apt: Apt, _appUrl?: string) {
  return {
    subject: `New booking — ${apt.patientName ?? "a patient"} on ${fmtDate(apt.date)}`,
    html: shell(
      `
      <p style="margin:0 0 4px;color:#059669;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;">New booking</p>
      <h1 style="margin:0 0 8px;font-size:20px;line-height:1.3;color:#0f172a;">${apt.patientName ?? "A patient"} booked a session</h1>
      <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.5;">
        You have a new appointment on your schedule.
      </p>
      ${detailsBlock(apt)}
      <p style="margin:0 0 14px;text-align:center;">${ctaButton(`${MEDIC_APP_URL}/dashboard?panel=appointments`, "Open my schedule")}</p>
      <p style="margin:0;color:#94a3b8;font-size:11px;line-height:1.5;text-align:center;">
        You'll get reminders 30 minutes before and at start time.
      </p>
      `,
      `<a href="${MEDIC_APP_URL}" style="color:#64748b;text-decoration:underline;">Open Doza for Medics</a>`,
    ),
  };
}

export function reminderMedic(apt: Apt, _appUrl?: string) {
  return {
    subject: `Starting in 30 minutes — with ${apt.patientName ?? "a patient"}`,
    html: shell(
      `
      <p style="margin:0 0 4px;color:#059669;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;">Starts in 30 minutes</p>
      <h1 style="margin:0 0 8px;font-size:20px;line-height:1.3;color:#0f172a;">Session with ${apt.patientName ?? "a patient"}</h1>
      <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.5;">
        Your next session is coming up. Please be ready.
      </p>
      ${detailsBlock(apt)}
      <p style="margin:0 0 14px;text-align:center;">${ctaButton(`${MEDIC_APP_URL}/dashboard?panel=appointments`, "Open schedule")}</p>
      `,
      `<a href="${MEDIC_APP_URL}" style="color:#64748b;text-decoration:underline;">Open Doza for Medics</a>`,
    ),
  };
}

export function startingMedic(apt: Apt, _appUrl?: string) {
  return {
    subject: `Session starting now — with ${apt.patientName ?? "a patient"}`,
    html: shell(
      `
      <p style="margin:0 0 4px;color:#059669;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;">Starting now</p>
      <h1 style="margin:0 0 8px;font-size:20px;line-height:1.3;color:#0f172a;">${apt.patientName ?? "Your patient"} is ready</h1>
      <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.5;">
        Your patient is waiting. Join the session from your schedule.
      </p>
      ${detailsBlock(apt)}
      <p style="margin:0 0 14px;text-align:center;">${ctaButton(`${MEDIC_APP_URL}/dashboard?panel=appointments`, "Enter session now")}</p>
      `,
      `<a href="${MEDIC_APP_URL}" style="color:#64748b;text-decoration:underline;">Open Doza for Medics</a>`,
    ),
  };
}
