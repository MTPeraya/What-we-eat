// backend/src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import argon2 from 'argon2';
// NOTE: Use according to your project (default export or named export)
import { prisma } from '@/lib/db';
import { createSession } from '@/lib/session';

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173';

function withCORS(res: NextResponse) {
  res.headers.set('Access-Control-Allow-Origin', FRONTEND_ORIGIN);
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.headers.set('Access-Control-Allow-Credentials', 'true'); // For sending cookies
  return res;
}

// Support preflight
export async function OPTIONS() {
  return withCORS(new NextResponse(null, { status: 204 }));
}

const schema = z.object({
  username: z.string().trim().min(3),
  password: z.string().min(4),
});

export async function POST(req: NextRequest) {
  try {
    const { username, password } = schema.parse(await req.json());

    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true, username: true, role: true, password: true },
    });

    if (!user?.password) {
      return withCORS(NextResponse.json({ error: 'INVALID_CREDENTIALS' }, { status: 401 }));
    }

    const ok = await argon2.verify(user.password, password);
    if (!ok) {
      return withCORS(NextResponse.json({ error: 'INVALID_CREDENTIALS' }, { status: 401 }));
    }

    // Create response first, then let createSession set HttpOnly cookie
    const res = withCORS(
      NextResponse.json(
        { user: { id: user.id, username: user.username, role: user.role } },
        { status: 200 }
      )
    );

    await createSession(res, user.id, req); // Should set SameSite=None; Secure for cross-site

    return res;
  } catch (err) {
    if (err instanceof ZodError) {
      return withCORS(
        NextResponse.json(
          { error: 'VALIDATION_ERROR', details: err.flatten() },
          { status: 400 }
        )
      );
    }
    return withCORS(
      NextResponse.json(
        { error: 'LOGIN_FAILED', details: err instanceof Error ? err.message : String(err) },
        { status: 500 }
      )
    );
  }
}
