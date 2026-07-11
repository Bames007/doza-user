// import { NextResponse } from "next/server";
// import type { NextRequest } from "next/server";

// export function middleware(request: NextRequest) {
//   const session = request.cookies.get("__session")?.value;

//   if (!session && request.nextUrl.pathname.startsWith("/dashboard")) {
//     const loginUrl = new URL("/", request.url);
//     return NextResponse.redirect(loginUrl);
//   }

//   if (session && request.nextUrl.pathname === "/") {
//     const dashboardUrl = new URL("/dashboard", request.url);
//     return NextResponse.redirect(dashboardUrl);
//   }

//   return NextResponse.next();
// }

// export const config = {
//   matcher: ["/dashboard/:path*", "/"],
// };

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/app/utils/firebaseAdmin";

// Routes that do NOT require authentication
const publicRoutes = ["/", "/login", "/register", "/forgot-password"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get("__session")?.value;

  // Allow public routes without session checks
  if (publicRoutes.includes(pathname)) {
    // If user has a session and tries to visit root or login, redirect to dashboard
    if (session && (pathname === "/" || pathname === "/login")) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // Protect all other routes (assume they require authentication)
  if (!session) {
    // Redirect to login if not authenticated
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verify session and check role
  try {
    const decodedToken = await adminAuth.verifySessionCookie(session, true);
    const uid = decodedToken.uid;

    // Fetch user profile from the database
    const userRef = adminDb.ref(`doza/users/${uid}`);
    const snapshot = await userRef.get();
    const userData = snapshot.val();

    // Check if user exists and has the correct role
    if (!userData || userData.role !== "user") {
      // Clear invalid session cookie
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete("__session");
      return response;
    }

    // User is valid – allow the request
    return NextResponse.next();
  } catch (error) {
    // Session verification failed – clear cookie and redirect
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("__session");
    return response;
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/profile/:path*", "/settings/:path*", "/"],
};
