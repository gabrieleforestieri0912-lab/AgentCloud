import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";

// Public routes are available without authentication.
const PUBLIC_PREFIXES = [
  "/",
  "/demo",
  "/chat",
  "/agents",
  "/login",
  "/signup",
  "/api/email/webhook",
  "/api/demo",
];

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  for (const prefix of PUBLIC_PREFIXES) {
    if (prefix === "/") continue;
    if (pathname === prefix || pathname.startsWith(prefix + "/")) return true;
  }
  return false;
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Allow public routes through
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Protected routes: check authentication via Clerk
  try {
    const clerk = await clerkClient();
    const sessionToken = request.cookies.get("__session")?.value;
    const session = sessionToken
      ? await clerk.sessions.getSession(sessionToken)
      : null;

    if (session) {
      return NextResponse.next();
    }
  } catch {
    // Clerk not configured yet — allow through in development
    return NextResponse.next();
  }

  // Redirect unauthenticated users to login
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("returnTo", pathname + search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
