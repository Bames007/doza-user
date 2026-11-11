// app/api/medics/[id]/reviews/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifySessionCookie } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";
import logger from "@/app/utils/logger";

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

  const { id: medicId } = await params;

  try {
    const [reviewsSnap, summarySnap] = await Promise.all([
      adminDb.ref(`doza_medics/${medicId}/reviews`).once("value"),
      adminDb.ref(`doza_medics/${medicId}/ratingSummary`).once("value"),
    ]);

    const reviewsObj = reviewsSnap.val() || {};
    const reviews = Object.entries(reviewsObj)
      .map(([id, r]: [string, any]) => ({ id, ...r }))
      .sort(
        (a: any, b: any) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime(),
      )
      .slice(0, 30);

    const summary = summarySnap.val() || { average: 0, count: 0 };

    return NextResponse.json({
      success: true,
      data: {
        reviews,
        summary: {
          average: Number(summary.average) || 0,
          count: Number(summary.count) || 0,
        },
      },
    });
  } catch (err: any) {
    logger.error({
      medicId,
      message: "GET medic reviews failed",
      errorMessage: err?.message,
    });
    return NextResponse.json(
      { success: false, error: "Unable to load reviews" },
      { status: 500 },
    );
  }
}
