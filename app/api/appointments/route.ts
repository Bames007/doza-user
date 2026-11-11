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

    const scheduledAt = computeScheduledAt(data.date, data.time);
    const appointmentId = `apt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // For instant talk, duration is fixed by the medic's window
    const instantWindowMinutes =
      Number(availability.instantTalkWindowMinutes) || 15;

    const durationLabel =
      data.instantTalk === true
        ? `${instantWindowMinutes} min`
        : (data.duration ?? "60 min");
    const durationMinutes = Math.round(
      parseDurationToMs(durationLabel) / 60_000,
    );

    // ── Recompute amount server-side ──────────────────
    const baseRate = Number(medic.practiceInfo?.hourlyRate) || 0;
    const services = Array.isArray(medic.practiceInfo?.services)
      ? medic.practiceInfo.services
      : [];
    const service = data.serviceId
      ? services.find((s: any) => s.id === data.serviceId)
      : null;

    let expectedAmount = 0;
    if (service) {
      expectedAmount = Number(service.price) || 0;
    } else if (data.instantTalk === true) {
      expectedAmount = Math.round(baseRate * (instantWindowMinutes / 60));
    } else {
      const hours = durationMinutes / 60;
      const typeRate =
        data.consultType === "inPerson"
          ? Number(pricing.inPersonRate) || baseRate
          : Number(pricing.onlineRate) || baseRate;
      expectedAmount = Math.round(typeRate * hours);
    }

    if (data.instantTalk === true) {
      expectedAmount += Number(availability.instantTalkPremium) || 0;
    }
    if (data.emergency === true) {
      expectedAmount += Number(availability.emergencyPremium) || 0;
      expectedAmount += Number(pricing.urgentFee) || 0;
    }
    if (data.consultType === "inPerson" && Number(pricing.homeVisitFee) > 0) {
      expectedAmount += Number(pricing.homeVisitFee);
    }

    // Sanity check — client must match within ₦1
    const clientAmount = Number(data.amount) || 0;
    if (baseRate > 0 && Math.abs(expectedAmount - clientAmount) > 1) {
      logger.warn({
        uid,
        medicId: data.medicId,
        message: "Appointment amount mismatch",
        clientAmount,
        expectedAmount,
        instantTalk: data.instantTalk,
        emergency: data.emergency,
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

    const appointment = {
      id: appointmentId,
      medicId: data.medicId,
      medicName: data.medicName || medic.name,
      medicEmail: medic.email,
      medicProfileImage: data.medicProfileImage ?? null,
      medicSpecialty: data.medicSpecialty ?? null,
      date: data.date,
      time: data.time,
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
      status: "upcoming" as const,
      createdAt: new Date().toISOString(),
    };

    const ref = adminDb.ref(`doza/users/${uid}/appointments`);
    const snap = await ref.get();
    const val = snap.val();
    const existing = val ? (Array.isArray(val) ? val : Object.values(val)) : [];
    (existing as any[]).push(appointment);
    await ref.set(existing);

    // ── Mirror to medic node ───────────────────────────
    const medicRecord = {
      id: appointmentId,
      patientId: uid,
      patientName: patient.name,
      patientProfileImage: patient.image,
      patientAge: patient.age,
      patientGender: patient.gender,

      date: data.date,
      time: data.time,
      scheduledAt,
      duration: durationLabel,
      durationMinutes,

      type:
        data.consultType === "inPerson"
          ? data.address
            ? "home"
            : "in-person"
          : "video",
      consultType: data.consultType ?? "online",
      address: data.address ?? null,

      reason: data.reason,
      notes: data.notes ?? null,
      amount: finalAmount,
      paymentReference: data.paymentReference ?? null,

      serviceId: data.serviceId ?? null,
      serviceName: data.serviceName ?? (service?.name || null),
      instantTalk: data.instantTalk === true,
      emergency: data.emergency === true,
      priceBreakdown: data.priceBreakdown ?? null,

      status: "upcoming",
      createdAt: appointment.createdAt,
      source: "patient_booking",
    };

    try {
      const medicRef = adminDb.ref(
        `${MEDICS_NODE}/${data.medicId}/appointments`,
      );
      const mSnap = await medicRef.once("value");
      const mVal = mSnap.val();
      const mList = mVal
        ? Array.isArray(mVal)
          ? mVal
          : Object.values(mVal)
        : [];
      (mList as any[]).push(medicRecord);
      await medicRef.set(mList);

      const { notifyMedic } = await import("@/app/utils/medicNotify");

      const modeBadge =
        data.emergency === true
          ? "🚨 EMERGENCY"
          : data.instantTalk === true
            ? "⚡ INSTANT"
            : "";
      const serviceTag = service?.name
        ? ` (${service.name})`
        : data.serviceName
          ? ` (${data.serviceName})`
          : "";

      await notifyMedic(data.medicId, {
        type: "appointment_booked",
        title:
          data.emergency === true
            ? "Emergency booking"
            : data.instantTalk === true
              ? "Instant talk request"
              : "New appointment booked",
        body: `${modeBadge ? modeBadge + " · " : ""}${patient.name} booked a ${durationLabel} ${
          data.consultType === "inPerson" ? "in-person" : "online"
        } session${serviceTag} for ${new Date(scheduledAt).toLocaleString(
          "en-US",
          {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          },
        )}`,
        appointmentId,
        patientId: uid,
        patientName: patient.name,
        patientProfileImage: patient.image,
        dedupeKey: `booking-${appointmentId}`,
      });
    } catch (mirrorErr: any) {
      logger.warn({
        uid,
        medicUid: data.medicId,
        message: "Medic mirror write or notification failed",
        error: mirrorErr?.message,
      });
    }

    // ── Emails ────────────────────────────────────────
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://users.dozamedic.com";

    if (patient.email) {
      const tpl = bookingConfirmedPatient(appointment as any, appUrl);
      sendMail({
        to: patient.email,
        subject: tpl.subject,
        html: tpl.html,
      }).catch(() => {});
    }
    if (medic.email) {
      const tpl = bookingConfirmedMedic(appointment as any, appUrl);
      sendMail({
        to: medic.email,
        subject: tpl.subject,
        html: tpl.html,
      }).catch(() => {});
    }

    scheduleAppointmentReminder({
      uid,
      appointmentId,
      medicId: data.medicId,
      scheduledAtISO: scheduledAt,
    }).catch(() => {});

    return NextResponse.json(
      { success: true, data: appointment },
      { status: 201 },
    );
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
