//app/api/medications/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/app/utils/auth";
import { adminDb } from "@/app/utils/firebaseAdmin";

// Helper to generate dose objects based on medication settings
function generateDoses(
  startDate: string,
  endDate: string | undefined,
  times: string[],
): {
  id: string;
  scheduledTime: string;
  takenAt?: string;
  skipped?: boolean;
  reaction?: string;
}[] {
  const doses: any[] = [];
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Generate doses from startDate to endDate or up to 30 days in the future if no endDate
  const maxDays = 30; // generate up to 30 days ahead to limit data
  for (let i = 0; i < maxDays; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    if (end && date > end) break;
    if (date < today) continue; // don't generate past doses (they'd be irrelevant)

    times.forEach((time) => {
      const [hours, minutes] = time.split(":").map(Number);
      const scheduled = new Date(date);
      scheduled.setHours(hours, minutes, 0, 0);
      doses.push({
        id: `${date.toISOString().split("T")[0]}-${time.replace(":", "")}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        scheduledTime: scheduled.toISOString(),
      });
    });
  }
  return doses;
}

export async function GET(request: NextRequest) {
  const uid = await verifyIdToken(request);
  if (!uid) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get("memberId") || "self";

  try {
    const medsRef = adminDb.ref(`doza/users/${uid}/medications`);
    const snapshot = await medsRef.once("value");
    let medications = snapshot.val();

    // If null or not an array, convert to array
    if (!medications) {
      medications = [];
    } else if (!Array.isArray(medications)) {
      medications = Object.values(medications);
    }

    // Filter by assignedTo if memberId is provided
    if (memberId !== "all") {
      medications = medications.filter((m: any) => m.assignedTo === memberId);
    }

    return NextResponse.json({ success: true, data: medications });
  } catch (error) {
    console.error("GET medications error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const uid = await verifyIdToken(request);
  if (!uid) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const data = await request.json();
    const {
      name,
      dosage,
      frequency,
      times,
      instructions,
      startDate,
      endDate,
      assignedTo,
    } = data;

    if (!name || !dosage || !frequency || !startDate || !assignedTo) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Determine times array based on frequency
    let finalTimes: string[] = times || [];
    if (frequency === "once") finalTimes = ["08:00"];
    else if (frequency === "twice") finalTimes = ["08:00", "20:00"];
    else if (frequency === "thrice") finalTimes = ["08:00", "14:00", "20:00"];
    // For custom, use provided times (already an array)

    // Generate doses
    const doses = generateDoses(startDate, endDate, finalTimes);

    const newMedication = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      name,
      dosage,
      frequency,
      times: finalTimes,
      instructions,
      startDate,
      endDate,
      assignedTo,
      status: "active",
      doses,
      createdAt: new Date().toISOString(),
    };

    const medsRef = adminDb.ref(`doza/users/${uid}/medications`);
    const snapshot = await medsRef.once("value");
    let medications = snapshot.val();
    if (!medications) {
      medications = [];
    } else if (!Array.isArray(medications)) {
      medications = Object.values(medications);
    }
    medications.push(newMedication);
    await medsRef.set(medications);

    return NextResponse.json({ success: true, data: newMedication });
  } catch (error) {
    console.error("POST medication error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
