import { prisma } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { randomBytes, createHash } from 'crypto';

const COOKIE_NAME = 'session';
const SESSION_TTL_DAYS = 7 as const;

type CreatedSession = { token: string; expiresAt: Date };

function hashToken(t: string) {
  return createHash('sha256').update(t).digest('hex');
}
function addDays(d: Date, days: number) {
  return new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
}

/** อ่าน IP จาก header (รองรับ proxy/CDN) */
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

/** สร้างเซสชัน + set HttpOnly cookie */
export async function createSession(
  res: NextResponse,
  userId: string,
  req?: NextRequest
): Promise<CreatedSession> {
  const raw = randomBytes(32).toString('hex');
  const tokenHash = hashToken(raw);
  const expiresAt = addDays(new Date(), SESSION_TTL_DAYS);

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      userAgent: req?.headers.get('user-agent') ?? undefined,
      ip: getClientIp(req),
    },
  });

  res.cookies.set(COOKIE_NAME, raw, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });

  return { token: raw, expiresAt };
}

/** อ่านเซสชันจากคุกกี้ */
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

/** ต้องล็อกอินเท่านั้น */
export async function requireAuth(req: NextRequest) {
  const s = await getSession(req);
  if (!s) throw new Error('UNAUTHENTICATED');
  return s;
}

/** ลบเซสชัน + เคลียร์คุกกี้ */
export async function destroySession(req: NextRequest, res: NextResponse) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (token) {
    await prisma.session
      .delete({ where: { tokenHash: hashToken(token) } })
      .catch(() => {});
  }
  res.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}
