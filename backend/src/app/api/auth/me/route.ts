// backend/src/app/api/auth/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { withCORS, preflight } from "@/lib/cors";
import prisma from "@/lib/db";

// ✅ Support preflight (OPTIONS)
export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return preflight('GET, OPTIONS', origin);
}

// ✅ Get user info from session
export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin');
  try {
  const s = await getSession(req);

  if (!s) {
    return withCORS(
      NextResponse.json({ user: null }, { status: 200 }),
      origin
    );
  }

  // Fetch full user data from database
  const user = await prisma.user.findUnique({
    where: { id: s.user.id },
    select: {
      id: true,
      username: true,
      displayName: true,
      profilePicture: true,
      role: true
    }
  });

  if (!user) {
    return withCORS(
      NextResponse.json({ user: null }, { status: 200 }),
      origin
    );
  }

  return withCORS(
    NextResponse.json(
      { user },
      { status: 200 }
    ),
    origin
  );
  } catch (e) {
    const msg = (e as Error)?.message ?? String(e);
    return withCORS(
      NextResponse.json({ error: "AUTH_ME_FAILED", details: msg }, { status: 500 }),
      origin
    );
  }
}
