// backend/src/lib/admin.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export const FRONTEND_ORIGIN =
  process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";

// CORS helper
export function withCORS<T extends NextResponse>(res: T): T {
  res.headers.set("Access-Control-Allow-Origin", FRONTEND_ORIGIN);
  res.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.headers.set("Access-Control-Allow-Credentials", "true");
  return res;
}

// OPTIONS (preflight)
export async function OPTIONS() {
  return withCORS(new NextResponse(null, { status: 204 }));
}

// Require ADMIN role only
export async function requireAdmin(req: NextRequest) {
  const s = await getSession(req);
  if (!s) throw new Error("UNAUTHENTICATED");
  if (s.user?.role !== "ADMIN") throw new Error("FORBIDDEN");
  return { userId: s.user.id };
}

// parse ?from & ?to query params (default: last 30 days)
export function parseRange(req: NextRequest, fallbackDays = 30) {
  const sp = Object.fromEntries(req.nextUrl.searchParams.entries());
  const fromRaw = sp.from ? new Date(sp.from) : new Date(Date.now() - fallbackDays * 86400e3);
  const toRaw = sp.to ? new Date(sp.to) : new Date();
  const from = isNaN(fromRaw.getTime()) ? new Date(Date.now() - fallbackDays * 86400e3) : fromRaw;
  const to = isNaN(toRaw.getTime()) ? new Date() : toRaw;
  return { from, to };
}

// JSON OK response (type-safe)
export function jsonOK(data: unknown, init?: ResponseInit) {
  return withCORS(NextResponse.json(data, { status: 200, ...(init ?? {}) }));
}

// JSON Error response (type-safe)
export function jsonError(
  message: string,
  status = 500,
  extra?: Record<string, unknown>
) {
  return withCORS(
    NextResponse.json({ error: message, ...(extra ?? {}) }, { status })
  );
}

// map auth error -> status code
export function errorFromAuth(e: unknown) {
  const msg = (e as Error)?.message ?? "UNKNOWN";
  const status = msg === "UNAUTHENTICATED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
  return jsonError(msg, status);
}
