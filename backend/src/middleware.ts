// backend/src/middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE = "wwe_session";
const SECRET = new TextEncoder().encode(process.env.AUTH_JWT_SECRET ?? "dev-secret");

// Routes that require login
const PROTECTED = ["/rooms/create", "/history", "/reviews", "/profile", "/admin"];

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // If not a protected route → allow through
  if (!PROTECTED.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE)?.value;

  // No token → redirect to /login
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname + (search ? `?${search}` : ""));
    return NextResponse.redirect(url);
  }

  try {
    // Verify JWT signature (works in middleware/edge runtime)
    await jwtVerify(token, SECRET);
    return NextResponse.next();
  } catch {
    // Invalid/expired token → clear cookie and redirect to /login
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname + (search ? `?${search}` : ""));
    const res = NextResponse.redirect(url);
    res.cookies.set({ name: COOKIE, value: "", path: "/", maxAge: 0 });
    return res;
  }
}

// Run middleware only on paths of interest (more precise than manual check)
export const config = {
  matcher: [
    "/rooms/create/:path*",
    "/history/:path*",
    "/reviews/:path*",
    "/profile/:path*",
    "/admin/:path*",
  ],
};
