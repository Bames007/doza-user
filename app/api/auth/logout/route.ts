import { NextResponse } from "next/server";
import { serialize } from "cookie";
import logger from "@/app/utils/logger";

export async function POST() {
  try {
    const cookie = serialize("__session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    const response = NextResponse.json({ success: true });
    response.headers.set("Set-Cookie", cookie);
    return response;
  } catch (error) {
    logger.error({ message: "Logout failed", error });
    return NextResponse.json(
      { success: false, error: "Unable to logout" },
      { status: 500 },
    );
  }
}
