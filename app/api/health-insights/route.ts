import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";

export async function GET(request: NextRequest) {
  const uid = await verifyIdToken(request);
  if (!uid)
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );

  try {
    const recordsRef = adminDb.ref(`doza/users/${uid}/healthRecords`);
    const snapshot = await recordsRef.once("value");
    const records = snapshot.val() || [];

    const insights: string[] = [];
    const latestHR = records.filter((r: any) => r.type === "heartRate").pop();
    const latestSteps = records.filter((r: any) => r.type === "steps").pop();

    if (latestHR?.value > 100)
      insights.push("Heart rate is high. Take a 5-min breather.");
    else if (latestHR)
      insights.push("Cardiac rhythm looks stable and healthy.");

    if (latestSteps?.value < 3000)
      insights.push(
        "You're less active than usual today. Aim for a short walk.",
      );
    else if (latestSteps)
      insights.push(
        `${latestSteps.value} steps today! You're hitting your movement goals.`,
      );

    insights.push("Hydration is the simplest way to boost energy.");
    insights.push("Consistent logging helps our AI provide better insights.");

    return NextResponse.json({ success: true, data: insights });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Server Error" },
      { status: 500 },
    );
  }
}
