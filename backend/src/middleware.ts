// backend/src/middleware.ts
import { NextResponse, type NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  // Use only /api/*
  const { pathname, search } = req.nextUrl;
  const started = Date.now();
  const reqId = crypto.randomUUID();

  // clone headers, and send to Route Handler
  const headers = new Headers(req.headers);
  headers.set("x-request-id", reqId);
  headers.set("x-request-start", String(started));

  // log when call
  console.log(
    `[API][start] id=${reqId} ${req.method} ${pathname}${search} at=${new Date(
      started
    ).toISOString()}`
  );

  const res = NextResponse.next({ request: { headers } });
  // If wanna see network
  res.headers.set("x-request-id", reqId);
  return res;
}

export const config = {
  matcher: ["/api/:path*"],
};
