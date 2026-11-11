// app/utils/mailer.ts
import "server-only";
import { Resend } from "resend";

let client: Resend | null = null;

function getClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (client) return client;
  client = new Resend(process.env.RESEND_API_KEY);
  return client;
}

// Hardcoded to your verified domain — overrides any env that may still
// be pointing at the Resend sandbox.
const FROM =
  process.env.RESEND_FROM && process.env.RESEND_FROM.includes("@dozamedic.com")
    ? process.env.RESEND_FROM
    : "Doza Medics <noreply@dozamedic.com>";

// Warn once at boot if something is off
if (
  process.env.RESEND_FROM &&
  !process.env.RESEND_FROM.includes("@dozamedic.com")
) {
  console.warn(
    `[mailer] RESEND_FROM="${process.env.RESEND_FROM}" is not on @dozamedic.com — falling back to noreply@dozamedic.com`,
  );
}

export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ sent: boolean; error?: string; id?: string; sandbox?: boolean }> {
  const c = getClient();
  if (!c) {
    console.warn("[mailer] RESEND_API_KEY not set — email skipped");
    return { sent: false, error: "Email provider not configured" };
  }

  try {
    const { data, error } = await c.emails.send({
      from: FROM,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text || opts.html.replace(/<[^>]+>/g, "").slice(0, 2000),
    });

    if (error) {
      const isSandbox =
        typeof error.message === "string" &&
        error.message.includes("You can only send testing emails");

      if (isSandbox) {
        console.error(
          `[mailer] SANDBOX BLOCKED — FROM "${FROM}" is still sandbox. ` +
            `Verify dozamedic.com at https://resend.com/domains and use an @dozamedic.com address.`,
        );
      } else {
        console.error("[mailer] Resend error:", error);
      }

      return {
        sent: false,
        error: error.message,
        sandbox: isSandbox,
      };
    }

    return { sent: true, id: data?.id };
  } catch (err: any) {
    console.error("[mailer] send failed:", err?.message);
    return { sent: false, error: err?.message };
  }
}
