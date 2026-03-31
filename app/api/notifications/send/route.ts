import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/app/utils/firebaseAdmin";
import webPush from "web-push";

// Set VAPID details
webPush.setVapidDetails(
  "mailto:eddybames007@gmail.com",
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export async function POST(request: NextRequest) {
  // Protect with a secret to prevent abuse
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all users with upcoming doses in the next 5 minutes
    const now = new Date();
    const fiveMinsLater = new Date(now.getTime() + 5 * 60000);

    const usersRef = adminDb.ref("doza/users");
    const snapshot = await usersRef.once("value");
    const users = snapshot.val() || {};

    for (const [uid, userData] of Object.entries(users)) {
      const medsRef = adminDb.ref(`doza/users/${uid}/medications`);
      const medsSnap = await medsRef.once("value");
      const meds = medsSnap.val() || [];

      const dueDoses = meds.flatMap((med: any) =>
        med.doses.filter(
          (d: any) =>
            !d.takenAt &&
            new Date(d.scheduledTime) > now &&
            new Date(d.scheduledTime) <= fiveMinsLater,
        ),
      );

      if (dueDoses.length === 0) continue;

      // Get push subscriptions for this user
      const subsRef = adminDb.ref(`doza/users/${uid}/pushSubscriptions`);
      const subsSnap = await subsRef.once("value");
      const subscriptions = subsSnap.val() || [];

      for (const sub of subscriptions) {
        const payload = JSON.stringify({
          title: "Time for your medication",
          body: `You have ${dueDoses.length} dose(s) due soon.`,
          data: { uid },
        });
        try {
          await webPush.sendNotification(sub, payload);
        } catch (err) {
          console.error("Push failed", err);
          // Optionally remove invalid subscription
        }
      }
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Send notifications error:", error);
    return NextResponse.json(
      { success: false, error: "Internal error" },
      { status: 500 },
    );
  }
}
