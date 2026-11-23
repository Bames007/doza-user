import { adminDb } from "@/app/utils/firebaseAdmin";

export async function getProfile(uid: string) {
  const snap = await adminDb
    .ref(`doza/users/${uid}/personalProfile`)
    .once("value");
  const p = snap.val() || {};
  return {
    name: `${p.fname || ""} ${p.lname || ""}`.trim() || "Anonymous",
    photo: p.avatarId ? `/assets/avatars/${p.avatarId}.jpg` : null,
  };
}
