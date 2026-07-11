import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";
import logger from "@/app/utils/logger";

export async function GET(request: NextRequest) {
  const uid = await verifyIdToken(request);
  if (!uid) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const recordsRef = adminDb.ref(`doza/users/${uid}/healthRecords`);
    const snapshot = await recordsRef.limitToLast(50).once("value");
    const val = snapshot.val();

    const insights: string[] = [];

    if (val) {
      const records = Object.values(val) as any[];
      const latestHR = records.filter((r) => r.type === "heartRate").pop();
      const latestSteps = records.filter((r) => r.type === "steps").pop();

      if (latestHR && latestHR.value) {
        if (latestHR.value > 100) {
          insights.push("Heart rate is high. Take a 5-min breather.");
        } else {
          insights.push("Cardiac rhythm looks stable and healthy.");
        }
      }

      if (latestSteps && latestSteps.value !== undefined) {
        if (latestSteps.value < 3000) {
          insights.push(
            "You're less active than usual today. Aim for a short walk.",
          );
        } else {
          insights.push(
            `${latestSteps.value} steps today! You're hitting your movement goals.`,
          );
        }
      }
    }

    insights.push("Hydration is the simplest way to boost energy.");
    insights.push("Consistent logging helps our AI provide better insights.");

    return NextResponse.json({ success: true, data: insights });
  } catch (error) {
    logger.error({
      uid,
      message: "Insights engine failed",
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, error: "Unable to generate insights" },
      { status: 500 },
    );
  }
}
