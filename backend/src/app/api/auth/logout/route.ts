// backend/src/app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { destroySession } from "@/lib/session";
import { withCORS, preflight } from "@/lib/cors";

// ✅ Support preflight (OPTIONS)
export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return preflight('POST, OPTIONS', origin);
}

// ✅ Logout (destroy session cookie)
export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  const res = withCORS(NextResponse.json({ ok: true }, { status: 200 }), origin);
  await destroySession(req, res);
  return res;
}
