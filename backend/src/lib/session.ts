import { prisma } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { randomBytes, createHash } from 'crypto';

const COOKIE_NAME = 'session';
const SESSION_TTL_MINUTES = Number(process.env.SESSION_TTL_MINUTES ?? 120);

type CreatedSession = { token: string; expiresAt: Date };

function hashToken(t: string) {
  return createHash('sha256').update(t).digest('hex');
}
function addMinutes(d: Date, minutes: number) {
  return new Date(d.getTime() + minutes * 60 * 1000);
}

/** Read IP from header (supports proxy/CDN) */
function getClientIp(req?: NextRequest): string | undefined {
  if (!req) return undefined;
  const fwd = req.headers.get('x-forwarded-for'); // eg: "1.2.3.4, 5.6.7.8"
  if (fwd) {
    const first = fwd.split(',')[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get('x-real-ip')?.trim();
  return real || undefined;
}

/** Create session + set HttpOnly cookie */
export async function createSession(
  res: NextResponse,
  userId: string,
  req?: NextRequest
): Promise<CreatedSession> {
  const raw = randomBytes(32).toString('hex');
  const tokenHash = hashToken(raw);
  const expiresAt = addMinutes(new Date(), SESSION_TTL_MINUTES);

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      userAgent: req?.headers.get('user-agent') ?? undefined,
      ip: getClientIp(req),
    },
  });

  // In Docker or cross-origin environments, we need sameSite='none' for cookies to work
  // even in development mode when accessing from different machines
  const isDocker = process.env.DOCKER === 'true' || process.env.DOCKER_ENV === 'true';
  const isProduction = process.env.NODE_ENV === 'production';
  // In Docker dev, use 'none' with secure=false (browsers may accept this for local network)
  // In production, use 'none' with secure=true (requires HTTPS)
  // In local dev (non-Docker), use 'lax' with secure=false
  const secureCookie = isProduction;
  const sameSite = (isDocker || isProduction) ? 'none' : 'lax';
  
  res.cookies.set(COOKIE_NAME, raw, {
    httpOnly: true,
    secure: secureCookie,
    sameSite: sameSite,
    path: '/',
    expires: expiresAt,
  });

  return { token: raw, expiresAt };
}

/** Read session from cookie */
export async function getSession(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const s = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!s || s.expiresAt <= new Date()) return null;

  return { sessionId: s.id, userId: s.userId, user: s.user };
}

/** Require authentication only */
export async function requireAuth(req: NextRequest) {
  const s = await getSession(req);
  if (!s) throw new Error('UNAUTHENTICATED');
  return s;
}

/** Destroy session + clear cookie */
export async function destroySession(req: NextRequest, res: NextResponse) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (token) {
    await prisma.session
      .delete({ where: { tokenHash: hashToken(token) } })
      .catch(() => {});
  }
  
  // Use same cookie settings as createSession for consistency
  const isDocker = process.env.DOCKER === 'true' || process.env.DOCKER_ENV === 'true';
  const isProduction = process.env.NODE_ENV === 'production';
  const secureCookie = isProduction;
  const sameSite = (isDocker || isProduction) ? 'none' : 'lax';
  
  res.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: secureCookie,
    sameSite: sameSite,
    path: '/',
    maxAge: 0,
  });
}
