// app/api/appointments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifySessionCookie } from "@/app/utils/auth";
import { adminAuth, adminDb } from "@/app/utils/firebaseAdmin";
import { z } from "zod";
import logger from "@/app/utils/logger";
import { sendMail } from "@/app/utils/mailer";
import {
  bookingConfirmedPatient,
  bookingConfirmedMedic,
} from "@/app/utils/emailTemplates";
import { scheduleAppointmentReminder } from "@/app/utils/scheduleAppointmentReminder";

const MEDICS_NODE = "doza_medics";

const priceBreakdownSchema = z
  .object({
    baseRate: z.number().min(0).default(0),
    servicePrice: z.number().min(0).default(0),
    urgentFee: z.number().min(0).default(0),
    emergencyPremium: z.number().min(0).default(0),
    instantTalkPremium: z.number().min(0).default(0),
    homeVisitFee: z.number().min(0).default(0),
    followUpDiscountPct: z.number().int().min(0).max(100).default(0),
    durationHours: z.number().min(0).default(1),
    total: z.number().min(0).default(0),
  })
  .partial();

const createAppointmentSchema = z
  .object({
    medicId: z.string().min(1),
    medicName: z.string().nullish(),
    medicProfileImage: z.string().nullish(),
    medicSpecialty: z.string().nullish(),
    date: z.string().min(1),
    time: z.string().min(1),
    reason: z.string().min(1),
    notes: z.string().nullish(),
    consultType: z.enum(["online", "inPerson"]).nullish(),
    duration: z.string().nullish(),
    address: z.string().nullish(),
    amount: z.number().nullish(),
    paymentReference: z.string().nullish(),

    serviceId: z.string().max(64).nullish(),
    serviceName: z.string().max(120).nullish(),

    instantTalk: z.boolean().nullish(),
    emergency: z.boolean().nullish(),

    priceBreakdown: priceBreakdownSchema.nullish(),
  })
  .passthrough();

function computeScheduledAt(dateStr: string, timeStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [h, min] = timeStr.split(":").map(Number);
  return new Date(y, m - 1, d, h, min, 0, 0).toISOString();
}

function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}
function toLocalTimeStr(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
}

function parseDurationToMs(label: string | null | undefined): number {
  if (!label) return 60 * 60 * 1000;
  const lower = label.toLowerCase();
  const match = lower.match(/(\d+(?:\.\d+)?)/);
  if (!match) return 60 * 60 * 1000;
  const n = parseFloat(match[1]);
  if (lower.includes("min")) return n * 60 * 1000;
  if (lower.includes("h")) return n * 60 * 60 * 1000;
  return 60 * 60 * 1000;
}

function getScheduledMs(apt: any): number {
  if (apt.scheduledAt) return new Date(apt.scheduledAt).getTime();
  if (apt.date && apt.time) {
    return new Date(`${apt.date}T${apt.time}`).getTime();
  }
  return 0;
}

async function getPatientInfo(uid: string) {
  let email: string | null = null;
  let name = "Patient";
  let image: string | null = null;
  let age: number | null = null;
  let gender: string | null = null;

  try {
    const authUser = await adminAuth.getUser(uid);
    if (authUser?.email) email = authUser.email;
    if (authUser?.displayName) name = authUser.displayName;
    if (authUser?.photoURL) image = authUser.photoURL;
  } catch {}

  try {
    const snap = await adminDb.ref(`doza/users/${uid}`).once("value");
    const val = snap.val() || {};
    if (!email) {
      email =
        val?.profile?.email || val?.email || val?.personalInfo?.email || null;
    }
    if (name === "Patient") {
      name =
        val?.profile?.fullName ||
        val?.profile?.name ||
        val?.fullName ||
        val?.name ||
        "Patient";
    }
    if (!image) {
      image =
        val?.profile?.profileImage ||
        val?.profile?.photoURL ||
        val?.profile?.avatar ||
        val?.profileImage ||
        val?.photoURL ||
        null;
    }
    age = val?.profile?.age ?? val?.age ?? null;
    gender = val?.profile?.gender ?? val?.gender ?? null;
  } catch {}

  return { email, name, image, age, gender };
}

async function getMedicInfo(medicId: string) {
  try {
    const snap = await adminDb.ref(`${MEDICS_NODE}/${medicId}`).once("value");
    const val = snap.val();
    if (!val) {
      return {
        email: null as string | null,
        name: "Medic",
        practiceInfo: {},
        status: "offline",
      };
    }
    return {
      email: val?.personalInfo?.email || val?.email || null,
      name:
        `${val?.personalInfo?.firstName ?? ""} ${val?.personalInfo?.lastName ?? ""}`.trim() ||
        val?.name ||
        "Medic",
      practiceInfo: val?.practiceInfo || {},
      status: val?.status || "offline",
    };
  } catch {
    return {
      email: null as string | null,
      name: "Medic",
      practiceInfo: {},
      status: "offline",
    };
  }
}

async function hasChatMessages(appointmentId: string): Promise<boolean> {
  try {
    const snap = await adminDb
      .ref(`doza/chats/${appointmentId}/messages`)
      .limitToFirst(1)
      .once("value");
    return snap.exists();
  } catch {
    return false;
  }
}

// ─── GET ─────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const uid = await verifySessionCookie(request);
  if (!uid) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }
  try {
    const snap = await adminDb.ref(`doza/users/${uid}/appointments`).get();
    const val = snap.val();
    const raw = val ? (Array.isArray(val) ? val : Object.values(val)) : [];

    const now = Date.now();
    const enriched = await Promise.all(
      (raw as any[]).map(async (apt) => {
        if (!apt?.id) return apt;
        if (apt.status === "completed" || apt.status === "cancelled") {
          return apt;
        }
        const scheduledMs = getScheduledMs(apt);
        const durationMs = parseDurationToMs(apt.duration);
        const endedMs = scheduledMs + durationMs;

        if (now < endedMs) return apt;

        const hasMessages = await hasChatMessages(apt.id);
        return { ...apt, hasMessages };
      }),
    );

    return NextResponse.json({ success: true, data: enriched });
  } catch (error: any) {
    logger.error({
      uid,
      message: "GET appointments failed",
      errorMessage: error?.message,
    });
    return NextResponse.json(
      { success: false, error: "Unable to load appointments" },
      { status: 500 },
    );
  }
}

// ─── POST ────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const uid = await verifySessionCookie(request);
  if (!uid) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();
    const parse = createAppointmentSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid appointment data",
          details: parse.error.flatten(),
        },
        { status: 400 },
      );
    }

    const data = parse.data;
    const [patient, medic] = await Promise.all([
      getPatientInfo(uid),
      getMedicInfo(data.medicId),
    ]);

    const availability = medic.practiceInfo?.availability || {};
    const pricing = medic.practiceInfo?.pricing || {};

    // ── Validate instant talk / emergency eligibility ──
    if (data.instantTalk === true) {
      if (medic.status !== "online") {
        return NextResponse.json(
          {
            success: false,
            error: "Medic is not online — instant talk unavailable",
          },
          { status: 409 },
        );
      }
      if (availability.instantTalk !== true) {
        return NextResponse.json(
          {
            success: false,
            error: "This medic does not offer instant talk",
          },
          { status: 409 },
        );
      }
    }

    if (data.emergency === true) {
      if (availability.emergencyAvailable !== true) {
        return NextResponse.json(
          {
            success: false,
            error: "This medic is not accepting emergency bookings",
          },
          { status: 409 },
        );
      }
    }

    // 🔴 BUG 4 FIX: Emergency AND instant both start now.
    // Emergency = STAT (ignore requested slot).
    // Instant   = also live immediately; the client only rounds
    //             the display time up to the next 5-minute mark.
    const isEmergency = data.emergency === true;
    const isInstant = data.instantTalk === true;

    const requestedScheduledAt = computeScheduledAt(data.date, data.time);
    const requestedScheduledMs = new Date(requestedScheduledAt).getTime();
    const startMs =
      isEmergency || isInstant ? Date.now() : requestedScheduledMs;
    const startDate = new Date(startMs);

    const scheduledAt = startDate.toISOString();
    const effectiveDate =
      isEmergency || isInstant ? toLocalDateStr(startDate) : data.date;
    const effectiveTime =
      isEmergency || isInstant ? toLocalTimeStr(startDate) : data.time;

    const appointmentId = `apt-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    const instantWindowMinutes =
      Number(availability.instantTalkWindowMinutes) || 15;

    const durationLabel = isInstant
      ? `${instantWindowMinutes} min`
      : (data.duration ?? "60 min");
    const durationMinutes = Math.round(
      parseDurationToMs(durationLabel) / 60_000,
    );

    // ── Recompute amount server-side ──────────────────
    // MUST match the client exactly. The client only knows
    // `viewingMedic.price` (= practiceInfo.hourlyRate) and `service.price`.
    // It does NOT know about onlineRate, inPersonRate or homeVisitFee —
    // so we must not introduce them here, or the client and server
    // disagree and every booking fails with "amount does not match".
    const baseRate = Number(medic.practiceInfo?.hourlyRate) || 0;
    const services = Array.isArray(medic.practiceInfo?.services)
      ? medic.practiceInfo.services
      : [];
    const service = data.serviceId
      ? services.find((s: any) => s.id === data.serviceId)
      : null;

    // 🔴 BUG 3 FIX: reject stale serviceId instead of silently
    // falling back to hourly-rate pricing (which then trips the
    // amount-mismatch AFTER Paystack already captured money).
    if (data.serviceId && !service) {
      logger.warn({
        uid,
        medicId: data.medicId,
        serviceId: data.serviceId,
        message: "Service not found on medic record",
      });
      return NextResponse.json(
        {
          success: false,
          error:
            "This service is no longer available. Please refresh and try again.",
        },
        { status: 409 },
      );
    }

    let expectedAmount = 0;
    if (service) {
      expectedAmount = Number(service.price) || 0;
    } else if (isInstant) {
      expectedAmount = Math.round(baseRate * (instantWindowMinutes / 60));
    } else {
      // Scheduled online or in-person — hourlyRate × duration.
      const hours = durationMinutes / 60;
      expectedAmount = Math.round(baseRate * hours);
    }

    if (isInstant) {
      expectedAmount += Number(availability.instantTalkPremium) || 0;
    }
    if (isEmergency) {
      expectedAmount += Number(availability.emergencyPremium) || 0;
      expectedAmount += Number(pricing.urgentFee) || 0;
    }
    // NOTE: homeVisitFee deliberately NOT added — the client never
    //       includes it in `computedPrice`, so adding it here would
    //       always trip the amount-mismatch check for in-person visits.

    // 🔴 BUG 2 FIX: validate whenever we have an expected amount,
    // not only when baseRate > 0 (fixed-price-only medics have
    // baseRate === 0 but still need amount validation).
    const clientAmount = Number(data.amount) || 0;
    if (expectedAmount > 0 && Math.abs(expectedAmount - clientAmount) > 1) {
      logger.warn({
        uid,
        medicId: data.medicId,
        message: "Appointment amount mismatch",
        clientAmount,
        expectedAmount,
        instantTalk: data.instantTalk,
        emergency: data.emergency,
        consultType: data.consultType,
        duration: durationLabel,
        durationMinutes,
        serviceId: data.serviceId,
        // expose the pricing fields that used to cause mismatches:
        hourlyRate: baseRate,
        onlineRate: pricing.onlineRate,
        inPersonRate: pricing.inPersonRate,
        homeVisitFee: pricing.homeVisitFee,
        urgentFee: pricing.urgentFee,
      });
      return NextResponse.json(
        {
          success: false,
          error:
            "Payment amount does not match the medic's current pricing. Please refresh and try again.",
        },
        { status: 400 },
      );
    }

    const finalAmount = expectedAmount > 0 ? expectedAmount : clientAmount;

    // 🔴 BUG 1 FIX: if the booking requires money, a payment
    // reference is mandatory. Otherwise the Paystack block below
    // is skipped and the appointment is created for free.
    if (finalAmount > 0 && !data.paymentReference) {
      logger.warn({
        uid,
        medicId: data.medicId,
        message: "Booking attempted without payment reference",
        finalAmount,
      });
      return NextResponse.json(
        {
          success: false,
          error: "Payment reference is required to complete this booking.",
        },
        { status: 402 },
      );
    }

    // ── Verify Paystack payment server-side ────────────
    if (data.paymentReference) {
      try {
        const paystackRes = await fetch(
          `https://api.paystack.co/transaction/verify/${encodeURIComponent(
            data.paymentReference,
          )}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            },
          },
        );
        const verification = await paystackRes.json();
        if (!paystackRes.ok || verification?.data?.status !== "success") {
          logger.warn({
            uid,
            reference: data.paymentReference,
            message: "Payment verification failed",
            httpStatus: paystackRes.status,
            paystackOk: paystackRes.ok,
            paystackTopStatus: verification?.status,
            paystackDataStatus: verification?.data?.status,
            paystackMessage: verification?.message,
            hasSecretKey: !!process.env.PAYSTACK_SECRET_KEY,
            keyPrefix: (process.env.PAYSTACK_SECRET_KEY || "").slice(0, 8),
            keyLength: (process.env.PAYSTACK_SECRET_KEY || "").length,
          });
          return NextResponse.json(
            { success: false, error: "Payment could not be verified" },
            { status: 400 },
          );
        }

        const paidKobo = Number(verification.data.amount) || 0;
        const expectedKobo = Math.round(finalAmount * 100);
        if (paidKobo < expectedKobo) {
          logger.warn({
            uid,
            reference: data.paymentReference,
            message: "Payment amount mismatch",
            paidKobo,
            expectedKobo,
          });
          return NextResponse.json(
            {
              success: false,
              error: "Payment amount does not match appointment price",
            },
            { status: 400 },
          );
        }
      } catch (err: any) {
        logger.error({
          uid,
          reference: data.paymentReference,
          message: "Paystack verify request failed",
          errorMessage: err?.message,
        });
        return NextResponse.json(
          { success: false, error: "Payment verification unavailable" },
          { status: 502 },
        );
      }
    }

    const appointment = {
      id: appointmentId,
      medicId: data.medicId,
      medicName: data.medicName || medic.name,
      medicEmail: medic.email,
      medicProfileImage: data.medicProfileImage ?? null,
      medicSpecialty: data.medicSpecialty ?? null,
      date: effectiveDate,
      time: effectiveTime,
      scheduledAt,
      duration: durationLabel,
      durationMinutes,
      reason: data.reason,
      notes: data.notes ?? null,
      consultType: data.consultType ?? "online",
      address: data.address ?? null,
      amount: finalAmount,
      paymentReference: data.paymentReference ?? null,

      serviceId: data.serviceId ?? null,
      serviceName: data.serviceName ?? (service?.name || null),
      instantTalk: data.instantTalk === true,
      emergency: data.emergency === true,
      priceBreakdown: data.priceBreakdown ?? null,

      patientEmail: patient.email,
      patientName: patient.name,
      patientProfileImage: patient.image,
      // 🔴 BUG 4 FIX: instant sessions start live too.
      status:
        isEmergency || isInstant
          ? ("inSession" as const)
          : ("upcoming" as const),
      createdAt: new Date().toISOString(),
    };

    const ref = adminDb.ref(`doza/users/${uid}/appointments`);
    const snap = await ref.get();
    const val = snap.val();
    const existing = val ? (Array.isArray(val) ? val : Object.values(val)) : [];

    // ── Replay check: one payment reference = one appointment ──
    if (data.paymentReference) {
      const alreadyUsed = (existing as any[]).some(
        (a) => a?.paymentReference === data.paymentReference,
      );
      if (alreadyUsed) {
        logger.warn({
          uid,
          reference: data.paymentReference,
          message: "Payment reference already used",
        });
        return NextResponse.json(
          {
            success: false,
            error: "This payment has already been used for another appointment",
          },
          { status: 409 },
        );
      }
    }

    (existing as any[]).push(appointment);
    await ref.set(existing);

    // ── Mirror to medic node ───────────────────────────
    const medicRecord = {
      ...appointment,
      patientUid: uid,
      patientName: patient.name,
      patientEmail: patient.email,
      patientProfileImage: patient.image,
      patientAge: patient.age,
      patientGender: patient.gender,
    };
    try {
      await adminDb
        .ref(`${MEDICS_NODE}/${data.medicId}/appointments/${appointmentId}`)
        .set(medicRecord);
    } catch (e: any) {
      logger.error({
        uid,
        appointmentId,
        message: "Failed to mirror appointment to medic node",
        errorMessage: e?.message,
      });
    }

    // ── Emails (non-fatal) ────────────────────────────
    // bookingConfirmedPatient / bookingConfirmedMedic return
    // { subject, html } — not a plain HTML string. Unpack them.
    // bookingConfirmedMedic expects the patient's NAME (string),
    // not the whole patient object.
    if (patient.email) {
      try {
        const tpl = bookingConfirmedPatient(appointment);
        await sendMail({
          to: patient.email,
          subject: tpl.subject,
          html: tpl.html,
        });
      } catch (e: any) {
        logger.error({
          uid,
          appointmentId,
          message: "Patient confirmation email failed",
          errorMessage: e?.message,
        });
      }
    }
    if (medic.email) {
      try {
        const tpl = bookingConfirmedMedic(appointment, patient.name);
        await sendMail({
          to: medic.email,
          subject: tpl.subject,
          html: tpl.html,
        });
      } catch (e: any) {
        logger.error({
          uid,
          appointmentId,
          message: "Medic notification email failed",
          errorMessage: e?.message,
        });
      }
    }

    // ── Reminder (non-fatal) ──────────────────────────
    // 🔴 BUG 4 FIX: skip reminders for instant sessions —
    // they're already live, a reminder a few minutes later
    // would fire after the call has ended.
    if (!isInstant) {
      try {
        await scheduleAppointmentReminder({
          uid,
          appointmentId: appointment.id,
          medicId: appointment.medicId,
          scheduledAtISO: appointment.scheduledAt,
        });
      } catch (e: any) {
        logger.error({
          uid,
          appointmentId,
          message: "Failed to schedule reminder",
          errorMessage: e?.message,
        });
      }
    }

    logger.info({
      uid,
      appointmentId,
      medicId: data.medicId,
      amount: finalAmount,
      instantTalk: data.instantTalk,
      emergency: data.emergency,
      message: "Appointment created",
    });

    return NextResponse.json({ success: true, data: appointment });
  } catch (error: any) {
    logger.error({
      uid,
      message: "POST appointment failed",
      errorMessage: error?.message,
    });
    return NextResponse.json(
      { success: false, error: "Unable to create appointment" },
      { status: 500 },
    );
  }
}
