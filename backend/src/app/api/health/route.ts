// backend/src/app/api/health/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withCORS, preflight } from "@/lib/cors";

// Preflight
export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return preflight('GET, OPTIONS', origin);
}

// Health check
export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin');
  return withCORS(NextResponse.json({ ok: true, ts: Date.now() }, { status: 200 }), origin);
}
