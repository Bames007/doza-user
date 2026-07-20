import { adminAuth } from "./firebaseAdmin";
import { NextRequest } from "next/server";

export async function verifySessionCookie(
  request: NextRequest,
): Promise<string | null> {
  const sessionCookie = request.cookies.get("__session")?.value;
  if (!sessionCookie) return null;
  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie);
    return decoded.uid;
  } catch {
    return null;
  }
}
