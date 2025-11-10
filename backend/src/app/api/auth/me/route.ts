// backend/src/app/api/auth/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { withCORS, preflight } from "@/lib/cors";

// ✅ Support preflight (OPTIONS)
export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return preflight('GET, OPTIONS', origin);
}

// ✅ Get user info from session
export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin');
  const s = await getSession(req);

  if (!s) {
    return withCORS(
      NextResponse.json({ user: null }, { status: 200 }),
      origin
    );
  }

  const { user } = s;
  return withCORS(
    NextResponse.json(
      { user: { id: user.id, username: user.username, role: user.role } },
      { status: 200 }
    ),
    origin
  );
}
