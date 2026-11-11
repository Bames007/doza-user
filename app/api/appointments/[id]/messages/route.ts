// // app/api/appointments/[id]/messages/route.ts
// import { NextRequest, NextResponse } from "next/server";
// import { verifySessionCookie } from "@/app/utils/auth";
// import { adminDb } from "@/app/utils/firebaseAdmin";
// import { z } from "zod";
// import logger from "@/app/utils/logger";

// export const runtime = "nodejs";
// export const dynamic = "force-dynamic";

// // ─── Deep-strip undefined (Firebase RTDB rejects any undefined) ──
// function stripUndefined<T>(value: T): T {
//   if (value === null || value === undefined) return value;
//   if (Array.isArray(value)) {
//     return value.map(stripUndefined) as unknown as T;
//   }
//   if (typeof value === "object") {
//     return Object.fromEntries(
//       Object.entries(value as Record<string, unknown>)
//         .filter(([, v]) => v !== undefined)
//         .map(([k, v]) => [k, stripUndefined(v)]),
//     ) as T;
//   }
//   return value;
// }

// // ─── Helpers ──────────────────────────────────────────
// function parseDurationToMs(label: string | null | undefined): number {
//   if (!label) return 60 * 60 * 1000;
//   const lower = label.toLowerCase();
//   const match = lower.match(/(\d+(?:\.\d+)?)/);
//   if (!match) return 60 * 60 * 1000;
//   const n = parseFloat(match[1]);
//   if (lower.includes("min")) return n * 60 * 1000;
//   if (lower.includes("h")) return n * 60 * 60 * 1000;
//   return 60 * 60 * 1000;
// }

// function computeScheduledMs(apt: any): number {
//   if (apt.scheduledAt) return new Date(apt.scheduledAt).getTime();
//   if (apt.date && apt.time) {
//     return new Date(`${apt.date}T${apt.time}`).getTime();
//   }
//   return Date.now();
// }

// async function findAppointmentForUser(uid: string, appointmentId: string) {
//   const snap = await adminDb
//     .ref(`doza/users/${uid}/appointments`)
//     .once("value");
//   const val = snap.val();
//   const list = val ? (Array.isArray(val) ? val : Object.values(val)) : [];
//   return (list as any[]).find((a) => a?.id === appointmentId) || null;
// }

// async function resolveAccess(uid: string, appointmentId: string) {
//   const metaSnap = await adminDb
//     .ref(`doza/chats/${appointmentId}/meta`)
//     .once("value");
//   const meta = metaSnap.val();

//   if (meta) {
//     if (meta.patientId === uid) return { role: "patient" as const, meta };
//     if (meta.medicId === uid) return { role: "medic" as const, meta };
//     return null;
//   }

//   const apt = await findAppointmentForUser(uid, appointmentId);
//   if (apt) return { role: "patient" as const, meta: null, apt };

//   return null;
// }

// /**
//  * Creates chat meta from an appointment. Requires `uid` explicitly because
//  * the appointment record does NOT contain patientId (it lives in the path).
//  */
// async function createMetaFromAppointment(
//   appointmentId: string,
//   uid: string,
//   apt: any,
// ) {
//   const scheduledMs = computeScheduledMs(apt);
//   const durationMs = parseDurationToMs(apt.duration);
//   const endedMs = scheduledMs + durationMs;

//   // Derive status from time — if session already ended, mark it accordingly
//   const now = Date.now();
//   let status: "waiting" | "active" | "ended" = "waiting";
//   if (now >= endedMs) status = "ended";
//   else if (now >= scheduledMs) status = "active";

//   // ── Resolve medicId across possible field names (legacy tolerance) ──
//   const medicId =
//     apt.medicId || apt.providerId || apt.doctorId || apt.professionalId || null;

//   if (!medicId) {
//     logger.warn({
//       uid,
//       appointmentId,
//       message:
//         "createMetaFromAppointment: appointment record has no medicId — ratings will not reach the medic's profile",
//       aptKeys: Object.keys(apt || {}),
//     });
//   }

//   const meta = stripUndefined({
//     // ── Identifiers ──
//     patientId: uid,
//     patientName: apt.patientName || "Patient",
//     medicId,
//     medicName: apt.medicName || "Your medic",
//     medicProfileImage: apt.medicProfileImage || null,

//     // ── Timing ──
//     scheduledAt: apt.scheduledAt || new Date(scheduledMs).toISOString(),
//     scheduledMs,
//     durationMs,
//     endedMs,
//     durationLabel: apt.duration || "60 min",

//     // ── State ──
//     status,
//     createdAt: new Date().toISOString(),
//   });

//   await adminDb.ref(`doza/chats/${appointmentId}/meta`).set(meta);
//   return meta;
// }

// // GET handler only — the POST handler is unchanged
// export async function GET(
//   request: NextRequest,
//   { params }: { params: Promise<{ id: string }> },
// ) {
//   const uid = await verifySessionCookie(request);
//   if (!uid) {
//     return NextResponse.json(
//       { success: false, error: "Unauthorized" },
//       { status: 401 },
//     );
//   }

//   const { id: appointmentId } = await params;

//   try {
//     const access = await resolveAccess(uid, appointmentId);
//     if (!access) {
//       return NextResponse.json(
//         { success: false, error: "Chat not found or unauthorized" },
//         { status: 404 },
//       );
//     }

//     let meta = access.meta;
//     if (!meta && (access as any).apt) {
//       try {
//         meta = await createMetaFromAppointment(
//           appointmentId,
//           uid,
//           (access as any).apt,
//         );
//       } catch (metaErr: any) {
//         logger.error({
//           uid,
//           appointmentId,
//           message: "createMetaFromAppointment failed",
//           errorMessage: metaErr?.message,
//         });
//         const apt = (access as any).apt;
//         const scheduledMs = computeScheduledMs(apt);
//         const durationMs = parseDurationToMs(apt.duration);
//         meta = {
//           patientId: uid,
//           patientName: apt.patientName || "Patient",
//           medicId: apt.medicId || null,
//           medicName: apt.medicName || "Your medic",
//           medicProfileImage: apt.medicProfileImage || null,
//           scheduledMs,
//           endedMs: scheduledMs + durationMs,
//           durationMs,
//           durationLabel: apt.duration || "60 min",
//           scheduledAt: apt.scheduledAt || new Date(scheduledMs).toISOString(),
//           status: Date.now() >= scheduledMs + durationMs ? "ended" : "waiting",
//           createdAt: new Date().toISOString(),
//         };
//       }
//     }

//     const [messagesSnap, ratingsSnap] = await Promise.all([
//       adminDb
//         .ref(`doza/chats/${appointmentId}/messages`)
//         .orderByKey()
//         .limitToLast(100)
//         .once("value"),
//       adminDb.ref(`doza/chats/${appointmentId}/ratings`).once("value"),
//     ]);

//     const messagesVal = messagesSnap.val();
//     const rawMessages = messagesVal
//       ? Object.entries(messagesVal).map(([k, v]: any) => ({
//           ...(v as any),
//           id: (v as any)?.id || k,
//         }))
//       : [];

//     rawMessages.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

//     // ✅ Strip the base64 payload — replace with a small URL the client
//     // will fetch on demand via /api/appointments/{id}/files/{messageId}.
//     const messages = rawMessages.map((m: any) => {
//       const hasFile = !!m.mediaUrl;
//       return {
//         id: m.id,
//         senderId: m.senderId,
//         senderRole: m.senderRole,
//         text: m.text ?? null,
//         mediaType: m.mediaType ?? null,
//         mediaDurationMs: m.mediaDurationMs ?? null,
//         fileName: m.fileName ?? null,
//         fileSize: m.fileSize ?? null,
//         // ✅ Small URL instead of the multi-MB base64 string
//         mediaUrl: hasFile
//           ? `/api/appointments/${appointmentId}/files/${m.id}`
//           : null,
//         createdAt: m.createdAt,
//       };
//     });

//     return NextResponse.json({
//       success: true,
//       data: {
//         role: access.role,
//         meta,
//         messages,
//         ratings: ratingsSnap.val() || {},
//       },
//     });
//   } catch (err: any) {
//     logger.error({
//       uid,
//       appointmentId,
//       message: "GET chat failed",
//       errorMessage: err?.message,
//       errorStack: err?.stack,
//     });
//     return NextResponse.json(
//       { success: false, error: "Unable to load chat" },
//       { status: 500 },
//     );
//   }
// }

// // ─── POST — send a message ────────────────────────────
// const sendMessageSchema = z
//   .object({
//     text: z.string().max(2000).optional(),
//     mediaUrl: z.string().optional(),
//     mediaType: z.enum(["image", "voice", "pdf"]).optional(), // ✅ added "pdf"
//     mediaDurationMs: z.number().int().positive().optional(),
//     fileName: z.string().max(200).optional(), // ✅ new
//     fileSize: z.number().int().positive().optional(), // ✅ new
//   })
//   .refine((d) => d.text?.trim() || d.mediaUrl, {
//     message: "Message must have text or media",
//   })
//   .refine(
//     (d) => {
//       if (!d.mediaUrl) return true;
//       // PDFs get a bigger cap because they're often multi-page reports
//       const limit = d.mediaType === "pdf" ? 8_000_000 : 2_500_000;
//       return d.mediaUrl.length < limit;
//     },
//     { message: "Media too large" },
//   );

// export async function POST(
//   request: NextRequest,
//   { params }: { params: Promise<{ id: string }> },
// ) {
//   const uid = await verifySessionCookie(request);
//   if (!uid) {
//     return NextResponse.json(
//       { success: false, error: "Unauthorized" },
//       { status: 401 },
//     );
//   }

//   const { id: appointmentId } = await params;

//   try {
//     const access = await resolveAccess(uid, appointmentId);
//     if (!access) {
//       return NextResponse.json(
//         { success: false, error: "Chat not found or unauthorized" },
//         { status: 404 },
//       );
//     }

//     let meta = access.meta;
//     if (!meta && (access as any).apt) {
//       meta = await createMetaFromAppointment(
//         appointmentId,
//         uid,
//         (access as any).apt,
//       );
//     }
//     if (!meta) {
//       return NextResponse.json(
//         { success: false, error: "Chat metadata missing" },
//         { status: 500 },
//       );
//     }

//     const now = Date.now();
//     if (now > meta.endedMs) {
//       return NextResponse.json(
//         {
//           success: false,
//           error: "Session has ended — chat is read-only",
//           sessionEnded: true,
//         },
//         { status: 403 },
//       );
//     }

//     const body = await request.json();
//     const parsed = sendMessageSchema.safeParse(body);
//     if (!parsed.success) {
//       return NextResponse.json(
//         {
//           success: false,
//           error: "Invalid message",
//           details: parsed.error.flatten(),
//         },
//         { status: 400 },
//       );
//     }

//     const { text, mediaUrl, mediaType, mediaDurationMs, fileName, fileSize } =
//       parsed.data;

//     let finalMediaUrl = mediaUrl || null;
//     if (mediaUrl && mediaUrl.startsWith("data:")) {
//       const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
//       if (bucketName) {
//         try {
//           const match = mediaUrl.match(/^data:([^;]+);base64,(.+)$/);
//           if (match) {
//             const [, contentType, b64] = match;
//             const buffer = Buffer.from(b64, "base64");
//             const ext = contentType.split("/")[1]?.split("+")[0] || "bin";
//             const path = `chats/${appointmentId}/${Date.now()}-${Math.random()
//               .toString(36)
//               .slice(2, 8)}.${ext}`;
//             const { getStorage } = await import("firebase-admin/storage");
//             const bucket = getStorage().bucket(bucketName);
//             const file = bucket.file(path);
//             await file.save(buffer, { contentType });
//             await file.makePublic();
//             finalMediaUrl = `https://storage.googleapis.com/${bucketName}/${path}`;
//           }
//         } catch (storageErr: any) {
//           logger.warn({
//             appointmentId,
//             message: "Storage upload failed — keeping base64",
//             err: storageErr?.message,
//           });
//         }
//       }
//     }

//     const messageId = `msg-${now}-${Math.random().toString(36).slice(2, 8)}`;
//     const message = stripUndefined({
//       id: messageId,
//       senderId: uid,
//       senderRole: access.role,
//       text: text?.trim() || null,
//       mediaUrl: finalMediaUrl,
//       mediaType: mediaType || null,
//       mediaDurationMs: mediaDurationMs || null,
//       fileName: fileName || null,
//       fileSize: fileSize || null,
//       createdAt: now,
//     });

//     await adminDb
//       .ref(`doza/chats/${appointmentId}/messages/${messageId}`)
//       .set(message);

//     if (meta.status === "waiting" && now >= meta.scheduledMs) {
//       await adminDb
//         .ref(`doza/chats/${appointmentId}/meta/status`)
//         .set("active");
//     }

//     return NextResponse.json({ success: true, data: message }, { status: 201 });
//   } catch (err: any) {
//     logger.error({
//       uid,
//       appointmentId,
//       message: "POST message failed",
//       errorMessage: err?.message,
//       errorStack: err?.stack,
//     });
//     return NextResponse.json(
//       { success: false, error: "Unable to send message" },
//       { status: 500 },
//     );
//   }
// }
// app/api/appointments/[id]/messages/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifySessionCookie } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";
import { z } from "zod";
import logger from "@/app/utils/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─── Deep-strip undefined (Firebase RTDB rejects any undefined) ──
function stripUndefined<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    return value.map(stripUndefined) as unknown as T;
  }
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, stripUndefined(v)]),
    ) as T;
  }
  return value;
}

// ─── Helpers ──────────────────────────────────────────
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

function computeScheduledMs(apt: any): number {
  if (apt.scheduledAt) return new Date(apt.scheduledAt).getTime();
  if (apt.date && apt.time) {
    return new Date(`${apt.date}T${apt.time}`).getTime();
  }
  return Date.now();
}

async function findInList(
  path: string,
  appointmentId: string,
): Promise<any | null> {
  try {
    const snap = await adminDb.ref(path).once("value");
    const val = snap.val();
    const list = val ? (Array.isArray(val) ? val : Object.values(val)) : [];
    return (list as any[]).find((a) => a?.id === appointmentId) || null;
  } catch {
    return null;
  }
}

async function findAppointmentForPatient(
  uid: string,
  appointmentId: string,
): Promise<any | null> {
  return findInList(`doza/users/${uid}/appointments`, appointmentId);
}

async function findAppointmentForMedic(
  uid: string,
  appointmentId: string,
): Promise<any | null> {
  return findInList(`doza_medics/${uid}/appointments`, appointmentId);
}

// ─── Access resolution ────────────────────────────────
type AccessResult =
  | { role: "patient" | "medic"; meta: any; apt?: undefined }
  | { role: "patient" | "medic"; meta: null; apt: any }
  | null;

async function resolveAccess(
  uid: string,
  appointmentId: string,
): Promise<AccessResult> {
  const metaSnap = await adminDb
    .ref(`doza/chats/${appointmentId}/meta`)
    .once("value");
  const meta = metaSnap.val();

  if (meta) {
    if (meta.patientId === uid) return { role: "patient", meta };
    if (meta.medicId === uid) return { role: "medic", meta };
    return null;
  }

  // ── No meta yet — figure out which side is opening ──
  // Try patient list first (the common case)
  const patientApt = await findAppointmentForPatient(uid, appointmentId);
  if (patientApt) {
    return { role: "patient", meta: null, apt: patientApt };
  }

  // Then medic list — this is what fixes the medic-first case
  const medicApt = await findAppointmentForMedic(uid, appointmentId);
  if (medicApt) {
    return { role: "medic", meta: null, apt: medicApt };
  }

  return null;
}

// ─── Meta creation (role-aware) ───────────────────────
async function createMetaFromAppointment(
  appointmentId: string,
  uid: string,
  apt: any,
  role: "patient" | "medic",
): Promise<any | null> {
  const scheduledMs = computeScheduledMs(apt);
  const durationMs = parseDurationToMs(apt.duration);
  const endedMs = scheduledMs + durationMs;

  const now = Date.now();
  let status: "waiting" | "active" | "ended" = "waiting";
  if (now >= endedMs) status = "ended";
  else if (now >= scheduledMs) status = "active";

  // ── Determine BOTH IDs based on which side is opening ──
  // The patient record has { medicId, ... } but no patientId.
  // The medic record has { patientId, ... } but no medicId.
  // So we fill the missing side from `uid`.
  let patientId: string | null = null;
  let medicId: string | null = null;

  if (role === "medic") {
    patientId = apt.patientId || null;
    medicId = uid;
  } else {
    patientId = uid;
    medicId =
      apt.medicId ||
      apt.providerId ||
      apt.doctorId ||
      apt.professionalId ||
      null;
  }

  if (!patientId || !medicId) {
    logger.warn({
      uid,
      appointmentId,
      role,
      aptKeys: Object.keys(apt || {}),
      message:
        "createMetaFromAppointment: cannot build meta — missing patientId or medicId",
    });
    return null;
  }

  const meta = stripUndefined({
    patientId,
    patientName: apt.patientName || "Patient",
    patientProfileImage: apt.patientProfileImage || null,
    medicId,
    medicName: apt.medicName || "Your medic",
    medicProfileImage: apt.medicProfileImage || null,

    scheduledAt: apt.scheduledAt || new Date(scheduledMs).toISOString(),
    scheduledMs,
    durationMs,
    endedMs,
    durationLabel: apt.duration || "60 min",

    status,
    createdAt: new Date().toISOString(),
  });

  await adminDb.ref(`doza/chats/${appointmentId}/meta`).set(meta);
  return meta;
}

// ─── GET — load the chat ──────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const uid = await verifySessionCookie(request);
  if (!uid) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { id: appointmentId } = await params;

  try {
    const access = await resolveAccess(uid, appointmentId);
    if (!access) {
      return NextResponse.json(
        { success: false, error: "Chat not found or unauthorized" },
        { status: 404 },
      );
    }

    let meta = access.meta;

    // Meta doesn't exist yet — build it from the appointment record.
    // Works for BOTH patient-first and medic-first opens now.
    if (!meta) {
      const apt = (access as any).apt;
      if (!apt) {
        return NextResponse.json(
          { success: false, error: "Appointment record missing" },
          { status: 500 },
        );
      }

      meta = await createMetaFromAppointment(
        appointmentId,
        uid,
        apt,
        access.role,
      );
      if (!meta) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Unable to initialize chat — appointment is missing required fields",
          },
          { status: 500 },
        );
      }
    }

    const [messagesSnap, ratingsSnap] = await Promise.all([
      adminDb
        .ref(`doza/chats/${appointmentId}/messages`)
        .orderByKey()
        .limitToLast(100)
        .once("value"),
      adminDb.ref(`doza/chats/${appointmentId}/ratings`).once("value"),
    ]);

    const messagesVal = messagesSnap.val();
    const rawMessages = messagesVal
      ? Object.entries(messagesVal).map(([k, v]: any) => ({
          ...(v as any),
          id: (v as any)?.id || k,
        }))
      : [];

    rawMessages.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

    const messages = rawMessages.map((m: any) => {
      const hasFile = !!m.mediaUrl;
      return {
        id: m.id,
        senderId: m.senderId,
        senderRole: m.senderRole,
        text: m.text ?? null,
        mediaType: m.mediaType ?? null,
        mediaDurationMs: m.mediaDurationMs ?? null,
        fileName: m.fileName ?? null,
        fileSize: m.fileSize ?? null,
        mediaUrl: hasFile
          ? `/api/appointments/${appointmentId}/files/${m.id}`
          : null,
        prescriptionData: m.prescriptionData ?? null,
        testsData: m.testsData ?? null,
        noteData: m.noteData ?? null,
        createdAt: m.createdAt,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        role: access.role,
        meta,
        messages,
        ratings: ratingsSnap.val() || {},
      },
    });
  } catch (err: any) {
    logger.error({
      uid,
      appointmentId,
      message: "GET chat failed",
      errorMessage: err?.message,
      errorStack: err?.stack,
    });
    return NextResponse.json(
      { success: false, error: "Unable to load chat" },
      { status: 500 },
    );
  }
}

// ─── POST — send a message ────────────────────────────
const sendMessageSchema = z
  .object({
    text: z.string().max(2000).optional(),
    mediaUrl: z.string().optional(),
    mediaType: z
      .enum(["image", "voice", "pdf", "prescription", "tests", "note"])
      .optional(),
    mediaDurationMs: z.number().int().positive().optional(),
    fileName: z.string().max(200).optional(),
    fileSize: z.number().int().positive().optional(),
    prescriptionData: z
      .object({
        drugs: z
          .array(
            z.object({
              name: z.string().min(1).max(120),
              dosage: z.string().max(80).optional().default(""),
              frequency: z.string().max(80).optional().default(""),
              duration: z.string().max(80).optional().default(""),
              notes: z.string().max(300).optional().default(""),
            }),
          )
          .min(1)
          .max(20),
        instructions: z.string().max(1000).optional().default(""),
      })
      .optional(),
    testsData: z
      .object({
        tests: z
          .array(
            z.object({
              name: z.string().min(1).max(120),
              priority: z
                .enum(["routine", "urgent", "stat"])
                .optional()
                .default("routine"),
              notes: z.string().max(300).optional().default(""),
            }),
          )
          .min(1)
          .max(20),
        instructions: z.string().max(1000).optional().default(""),
      })
      .optional(),
    noteData: z
      .object({
        title: z.string().min(1).max(200),
        body: z.string().min(1).max(3000),
        category: z
          .enum(["general", "diagnosis", "follow-up", "advice"])
          .optional()
          .default("general"),
      })
      .optional(),
  })
  .refine(
    (d) => {
      if (d.mediaType === "prescription") return !!d.prescriptionData;
      if (d.mediaType === "tests") return !!d.testsData;
      if (d.mediaType === "note") return !!d.noteData;
      return !!d.text?.trim() || !!d.mediaUrl;
    },
    { message: "Message must have text, media, or clinical data" },
  )
  .refine(
    (d) => {
      if (!d.mediaUrl) return true;
      const limit = d.mediaType === "pdf" ? 8_000_000 : 2_500_000;
      return d.mediaUrl.length < limit;
    },
    { message: "Media too large" },
  );

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const uid = await verifySessionCookie(request);
  if (!uid) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { id: appointmentId } = await params;

  try {
    const access = await resolveAccess(uid, appointmentId);
    if (!access) {
      return NextResponse.json(
        { success: false, error: "Chat not found or unauthorized" },
        { status: 404 },
      );
    }

    let meta = access.meta;
    if (!meta) {
      const apt = (access as any).apt;
      meta = await createMetaFromAppointment(
        appointmentId,
        uid,
        apt,
        access.role,
      );
    }
    if (!meta) {
      return NextResponse.json(
        { success: false, error: "Chat metadata missing" },
        { status: 500 },
      );
    }

    const now = Date.now();
    if (now > meta.endedMs) {
      return NextResponse.json(
        {
          success: false,
          error: "Session has ended — chat is read-only",
          sessionEnded: true,
        },
        { status: 403 },
      );
    }

    const body = await request.json();
    const parsed = sendMessageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid message",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const clinicalTypes = new Set(["prescription", "tests", "note"]);
    if (
      access.role !== "medic" &&
      parsed.data.mediaType &&
      clinicalTypes.has(parsed.data.mediaType)
    ) {
      return NextResponse.json(
        { success: false, error: "Only medics can send clinical content" },
        { status: 403 },
      );
    }

    const {
      text,
      mediaUrl,
      mediaType,
      mediaDurationMs,
      fileName,
      fileSize,
      prescriptionData,
      testsData,
      noteData,
    } = parsed.data;

    let finalMediaUrl = mediaUrl || null;
    if (mediaUrl && mediaUrl.startsWith("data:")) {
      const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
      if (bucketName) {
        try {
          const match = mediaUrl.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            const [, contentType, b64] = match;
            const buffer = Buffer.from(b64, "base64");
            const ext = contentType.split("/")[1]?.split("+")[0] || "bin";
            const path = `chats/${appointmentId}/${Date.now()}-${Math.random()
              .toString(36)
              .slice(2, 8)}.${ext}`;
            const { getStorage } = await import("firebase-admin/storage");
            const bucket = getStorage().bucket(bucketName);
            const file = bucket.file(path);
            await file.save(buffer, { contentType });
            await file.makePublic();
            finalMediaUrl = `https://storage.googleapis.com/${bucketName}/${path}`;
          }
        } catch (storageErr: any) {
          logger.warn({
            appointmentId,
            message: "Storage upload failed — keeping base64",
            err: storageErr?.message,
          });
        }
      }
    }

    const messageId = `msg-${now}-${Math.random().toString(36).slice(2, 8)}`;
    const message = stripUndefined({
      id: messageId,
      senderId: uid,
      senderRole: access.role,
      text: text?.trim() || null,
      mediaUrl: finalMediaUrl,
      mediaType: mediaType || null,
      mediaDurationMs: mediaDurationMs || null,
      fileName: fileName || null,
      fileSize: fileSize || null,
      prescriptionData: prescriptionData || null,
      testsData: testsData || null,
      noteData: noteData || null,
      createdAt: now,
    });

    await adminDb
      .ref(`doza/chats/${appointmentId}/messages/${messageId}`)
      .set(message);

    if (meta.status === "waiting" && now >= meta.scheduledMs) {
      await adminDb
        .ref(`doza/chats/${appointmentId}/meta/status`)
        .set("active");
    }

    return NextResponse.json({ success: true, data: message }, { status: 201 });
  } catch (err: any) {
    logger.error({
      uid,
      appointmentId,
      message: "POST message failed",
      errorMessage: err?.message,
      errorStack: err?.stack,
    });
    return NextResponse.json(
      { success: false, error: "Unable to send message" },
      { status: 500 },
    );
  }
}
