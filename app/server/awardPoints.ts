import { adminDb } from "@/app/utils/firebaseAdmin";

export async function awardPoints(
  uid: string,
  points: number,
  reason: string,
  challengeId: string | null,
) {
  if (points <= 0) return;

  const pointsRef = adminDb.ref(`doza/users/${uid}/points`);

  const result = await pointsRef.transaction((current) => {
    const data = current || { total: 0, history: [] };
    const newTotal = (data.total || 0) + points;
    const entry = { points, reason, challengeId, timestamp: Date.now() };
    return {
      total: newTotal,
      history: [...(data.history || []), entry],
    };
  });

  if (!result.committed) return;

  const newTotal = result.snapshot.val()?.total || 0;
  await adminDb.ref("doza/leaderboard").child(uid).set({
    uid,
    totalPoints: newTotal,
    updatedAt: Date.now(),
  });
}

/**
 * Idempotent award — fires at most once per (uid, challengeId, reason).
 * Use this for one-time bonuses like completion.
 */
export async function awardPointsOnce(
  uid: string,
  points: number,
  reason: string,
  challengeId: string,
) {
  const markerRef = adminDb.ref(
    `doza/pointsAwards/${uid}/${challengeId}/${reason}`,
  );

  const marker = await markerRef.transaction((current) => {
    if (current) return undefined; // abort — already awarded
    return { awardedAt: Date.now(), points };
  });

  if (marker.committed) {
    await awardPoints(uid, points, reason, challengeId);
  }
}
