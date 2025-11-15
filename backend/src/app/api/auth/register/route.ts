// backend/src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import argon2 from 'argon2';
import prisma from '@/lib/db';                 // Adjust path if you export as { prisma }
import { createSession } from '@/lib/session'; // If using '@/lib/auth', change this path
import { Prisma, Role } from '@prisma/client';
import { withCORS, preflight } from '@/lib/cors';

// Support preflight (OPTIONS)
export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return preflight('POST, OPTIONS', origin);
}

// === Validation ===
const schema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(24)
    .regex(/^[a-z0-9_]+$/i, 'username must be alphanumeric/underscore'),
  password: z.string().min(4).max(12),
});

// === Handler ===
export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  
  try {
    const { username, password } = schema.parse(await req.json());

    // Quick duplicate check (better UX) — also catch race with P2002 try/catch below
    const exists = await prisma.user.findUnique({ where: { username } });
    if (exists) {
      return withCORS(NextResponse.json({ error: 'USERNAME_TAKEN' }, { status: 409 }), origin);
    }

    const hash = await argon2.hash(password);

    // Create user
    const user = await prisma.user.create({
      data: { username, password: hash, role: Role.USER },
      select: { id: true, username: true, role: true, createdAt: true },
    });

    // Create response + set session cookie (HttpOnly)
    const res = NextResponse.json({ user }, { status: 201 });
    await createSession(res, user.id, req); // Set cookie in this response

    // NOTE: If FE/BE are different origins and need to send cookies
    // Set createSession() to use SameSite: 'none' (and must be https → secure:true)
    return withCORS(res, origin);
  } catch (err) {
    // Handle unique constraint from Prisma (prevent race in registration)
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return withCORS(NextResponse.json({ error: 'USERNAME_TAKEN' }, { status: 409 }), origin);
    }

    if (err instanceof ZodError) {
      return withCORS(
        NextResponse.json(
          { error: 'VALIDATION_ERROR', details: err.flatten() },
          { status: 400 },
        ),
        origin
      );
    }

    return withCORS(
      NextResponse.json(
        { error: 'REGISTER_FAILED', details: err instanceof Error ? err.message : String(err) },
        { status: 500 },
      ),
      origin
    );
  }
}
