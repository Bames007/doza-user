// app/api/appointments/[id]/rate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifySessionCookie } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";
import { z } from "zod";
import logger from "@/app/utils/logger";

const rateSchema = z.object({
  stars: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

async function resolveAccess(uid: string, appointmentId: string) {
  const metaSnap = await adminDb
    .ref(`doza/chats/${appointmentId}/meta`)
    .once("value");
  const meta = metaSnap.val();
  if (!meta) return null;
  if (meta.patientId === uid) return { role: "patient" as const, meta };
  if (meta.medicId === uid) return { role: "medic" as const, meta };
  return null;
}

async function fetchReviewerProfile(uid: string) {
  try {
    const snap = await adminDb.ref(`doza/users/${uid}`).once("value");
    const u = snap.val() || {};
    return {
      name: u.name || u.displayName || u.fullName || "Anonymous",
      image: u.profileImage || u.photoURL || u.avatar || null,
    };
  } catch {
    return { name: "Anonymous", image: null as string | null };
  }
}

/**
 * Resolve the medicId to use for the review write.
 * - Prefer meta.medicId (fast path)
 * - Fall back to the appointment record stored under the patient
 *   (covers older meta nodes created before `medicId` existed)
 */
async function resolveMedicId(
  metaMedicId: string | null | undefined,
  patientId: string | null | undefined,
  appointmentId: string,
): Promise<string | undefined> {
  if (metaMedicId) return metaMedicId;
  if (!patientId) return undefined;

  try {
    const snap = await adminDb
      .ref(`doza/users/${patientId}/appointments`)
      .once("value");
    const val = snap.val();
    const list = val ? (Array.isArray(val) ? val : Object.values(val)) : [];
    const apt = (list as any[]).find((a) => a?.id === appointmentId);
    if (!apt) return undefined;

    return (
      apt.medicId ||
      apt.providerId ||
      apt.doctorId ||
      apt.professionalId ||
      undefined
    );
  } catch {
    return undefined;
  }
}

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

    if (Date.now() < access.meta.scheduledMs) {
      return NextResponse.json(
        { success: false, error: "Session hasn't started yet" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const parsed = rateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid rating",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const reviewer = await fetchReviewerProfile(uid);
    const createdAt = new Date().toISOString();

    const rating = {
      stars: parsed.data.stars,
      comment: (parsed.data.comment || "").trim() || null,
      createdAt,
      reviewerUid: uid,
      reviewerName: reviewer.name,
      reviewerImage: reviewer.image,
    };

    // Canonical store (per appointment — used by chat screen)
    await adminDb
      .ref(`doza/chats/${appointmentId}/ratings/${access.role}`)
      .set(rating);

    // Patient rating → also write to medic's review index + refresh summary
    if (access.role === "patient") {
      // ── Resolve medicId with fallback (meta → appointment record) ──
      const medicId = await resolveMedicId(
        access.meta.medicId,
        access.meta.patientId,
        appointmentId,
      );

      if (medicId) {
        await adminDb
          .ref(`doza_medics/${medicId}/reviews/${appointmentId}`)
          .set({
            stars: rating.stars,
            comment: rating.comment,
            createdAt,
            patientUid: uid,
            patientName: reviewer.name,
            patientImage: reviewer.image,
          });

        // Recompute summary from the full review list (idempotent)
        const reviewsSnap = await adminDb
          .ref(`doza_medics/${medicId}/reviews`)
          .once("value");
        const reviewsObj = reviewsSnap.val() || {};
        const all = Object.values(reviewsObj) as any[];
        const total = all.reduce((s, r) => s + (Number(r.stars) || 0), 0);
        const count = all.length;

        await adminDb.ref(`doza_medics/${medicId}/ratingSummary`).set({
          average: count > 0 ? total / count : 0,
          count,
          total,
          updatedAt: createdAt,
        });
      } else {
        // Never silently swallow this again — log loudly so we can find it
        logger.warn({
          uid,
          appointmentId,
          patientId: access.meta.patientId,
          metaMedicId: access.meta.medicId ?? null,
          message:
            "Rating saved to chat but medicId could not be resolved — medic profile not updated",
        });
      }

      // Mark appointment completed + stamp rating on the patient's list
      const aptRef = adminDb.ref(
        `doza/users/${access.meta.patientId}/appointments`,
      );
      const snap = await aptRef.once("value");
      const val = snap.val();
      const list = val ? (Array.isArray(val) ? val : Object.values(val)) : [];
      const idx = (list as any[]).findIndex((a) => a?.id === appointmentId);
      if (idx >= 0) {
        (list as any[])[idx].status = "completed";
        (list as any[])[idx].completedAt = createdAt;
        (list as any[])[idx].rating = rating.stars;
        (list as any[])[idx].comment = rating.comment;
        await aptRef.set(list);
      }
    }

    logger.info({
      uid,
      appointmentId,
      role: access.role,
      stars: rating.stars,
      message: "Rating submitted",
    });

    return NextResponse.json({ success: true, data: rating });
  } catch (err: any) {
    logger.error({
      uid,
      appointmentId,
      message: "POST rating failed",
      errorMessage: err?.message,
    });
    return NextResponse.json(
      { success: false, error: "Unable to submit rating" },
      { status: 500 },
    );
  }
}
