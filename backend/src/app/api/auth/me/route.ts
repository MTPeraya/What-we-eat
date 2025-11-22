// backend/src/app/api/auth/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { withCORS, preflight } from "@/lib/cors";
import prisma from "@/lib/db";

// ✅ Support preflight (OPTIONS)
export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  console.log(`[auth/me] OPTIONS request from origin: ${origin}`);
  return preflight('GET, OPTIONS', origin);
}

// ✅ Get user info from session
export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin');
  console.log(`[auth/me] GET request from origin: ${origin}`);
  
  try {
    const s = await getSession(req);
    console.log(`[auth/me] Session check:`, s ? 'found' : 'not found');

    if (!s) {
      console.log(`[auth/me] No session, returning null user`);
      return withCORS(
        NextResponse.json({ user: null }, { status: 200 }),
        origin
      );
    }

    // Fetch full user data from database
    console.log(`[auth/me] Fetching user from DB: ${s.user.id}`);
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
      console.warn(`[auth/me] User not found in DB: ${s.user.id}`);
      return withCORS(
        NextResponse.json({ user: null }, { status: 200 }),
        origin
      );
    }

    console.log(`[auth/me] Successfully returning user: ${user.username}`);
    return withCORS(
      NextResponse.json(
        { user },
        { status: 200 }
      ),
      origin
    );
  } catch (e) {
    const msg = (e as Error)?.message ?? String(e);
    console.error(`[auth/me] Error:`, msg, e);
    return withCORS(
      NextResponse.json({ error: "AUTH_ME_FAILED", details: msg }, { status: 500 }),
      origin
    );
  }
}
