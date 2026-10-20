// app/utils/verifySessionCookie.ts

import { adminAuth } from "./firebaseAdmin";
import { NextRequest } from "next/server";
import logger from "./logger";

export async function verifySessionCookie(
  request: NextRequest,
): Promise<string | null> {
  const pathname = request.nextUrl.pathname;
  const sessionCookie = request.cookies.get("__session")?.value;

  if (sessionCookie) {
    try {
      const decoded = await adminAuth.verifySessionCookie(sessionCookie);
      return decoded.uid;
    } catch (e) {
      logger.error({ err: e, pathname }, "[auth] verifySessionCookie failed");
    }
  } else {
    logger.warn(
      {
        pathname,
        cookieNames: request.cookies.getAll().map((c) => c.name),
      },
      "[auth] no __session cookie on request",
    );
  }
  const headerId = request.headers.get("x-user-id");
  if (headerId) {
    logger.warn({ pathname }, "[auth] falling back to x-user-id header");
    return headerId;
  }

  return null;
}
