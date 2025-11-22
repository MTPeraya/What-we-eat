import { prisma } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { randomBytes, createHash } from 'crypto';

const COOKIE_NAME = 'session';
// Increased default session TTL from 2 hours to 7 days for better user experience
const SESSION_TTL_MINUTES = Number(process.env.SESSION_TTL_MINUTES ?? 10080); // 7 days = 10080 minutes

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

  // Cookie settings for cross-origin support
  // IMPORTANT: Modern browsers (Chrome 80+, Safari 13+) reject SameSite=None without Secure=true
  // For local network access (192.168.x.x, 10.x.x.x), we use 'lax' which works better
  const isDocker = process.env.DOCKER === 'true' || process.env.DOCKER_ENV === 'true';
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Check if request is from local network (for Docker/local dev)
  const origin = req?.headers.get('origin') || '';
  const isLocalNetwork = origin && (
    origin.includes('localhost') ||
    origin.includes('127.0.0.1') ||
    /^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.|169\.254\.)/.test(origin)
  );
  
  // Use 'lax' for local network (works better than 'none' without secure)
  // Use 'none' with secure=true only for production HTTPS
  // Use 'lax' for local development
  let secureCookie: boolean;
  let sameSite: 'strict' | 'lax' | 'none';
  
  if (isProduction) {
    // Production: must use secure=true with sameSite='none' for cross-origin
    secureCookie = true;
    sameSite = 'none';
  } else if (isDocker && !isLocalNetwork) {
    // Docker with external access: try 'lax' first (better browser support)
    // If this doesn't work, user needs HTTPS
    secureCookie = false;
    sameSite = 'lax';
  } else {
    // Local development or Docker with local network: use 'lax'
    secureCookie = false;
    sameSite = 'lax';
  }
  
  res.cookies.set(COOKIE_NAME, raw, {
    httpOnly: true,
    secure: secureCookie,
    sameSite: sameSite,
    path: '/',
    expires: expiresAt,
    // Don't set domain - let browser use default (works better for local network)
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

/** Refresh session expiration (extend TTL) */
export async function refreshSession(
  req: NextRequest,
  res: NextResponse,
  sessionId: string
): Promise<void> {
  const newExpiresAt = addMinutes(new Date(), SESSION_TTL_MINUTES);
  
  await prisma.session.update({
    where: { id: sessionId },
    data: { expiresAt: newExpiresAt },
  });

  // Update cookie with new expiration
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (token) {
    const isDocker = process.env.DOCKER === 'true' || process.env.DOCKER_ENV === 'true';
    const isProduction = process.env.NODE_ENV === 'production';
    const origin = req.headers.get('origin') || '';
    const isLocalNetwork = origin && (
      origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      /^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.|169\.254\.)/.test(origin)
    );
    
    let secureCookie: boolean;
    let sameSite: 'strict' | 'lax' | 'none';
    
    if (isProduction) {
      secureCookie = true;
      sameSite = 'none';
    } else if (isDocker && !isLocalNetwork) {
      secureCookie = false;
      sameSite = 'lax';
    } else {
      secureCookie = false;
      sameSite = 'lax';
    }
    
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: secureCookie,
      sameSite: sameSite,
      path: '/',
      expires: newExpiresAt,
    });
  }
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
  const origin = req.headers.get('origin') || '';
  const isLocalNetwork = origin && (
    origin.includes('localhost') ||
    origin.includes('127.0.0.1') ||
    /^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.|169\.254\.)/.test(origin)
  );
  
  let secureCookie: boolean;
  let sameSite: 'strict' | 'lax' | 'none';
  
  if (isProduction) {
    secureCookie = true;
    sameSite = 'none';
  } else if (isDocker && !isLocalNetwork) {
    secureCookie = false;
    sameSite = 'lax';
  } else {
    secureCookie = false;
    sameSite = 'lax';
  }
  
  res.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: secureCookie,
    sameSite: sameSite,
    path: '/',
    maxAge: 0,
  });
}
