// backend/src/app/api/votes/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { VoteValue } from '@prisma/client';
import { requireAuth } from '@/lib/session';

// ===== CORS =====
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173';

function withCORS(res: NextResponse) {
  res.headers.set('Access-Control-Allow-Origin', FRONTEND_ORIGIN);
  res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.headers.set('Access-Control-Allow-Credentials', 'true');
  return res;
}

// Preflight
export async function OPTIONS() {
  return withCORS(new NextResponse(null, { status: 204 }));
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth(req);

    const body = (await req.json()) as Partial<{
      roomId: string; restaurantId: string; value: VoteValue | 'ACCEPT' | 'REJECT';
    }>;
    const roomId = body.roomId?.trim();
    const restaurantId = body.restaurantId?.trim();
    const rawValue = body.value as VoteValue | undefined;

    if (!roomId || !restaurantId || !rawValue) {
      return withCORS(NextResponse.json({ error: 'MISSING_FIELDS' }, { status: 400 }));
    }
    if (rawValue !== 'ACCEPT' && rawValue !== 'REJECT') {
      return withCORS(NextResponse.json({ error: 'INVALID_VALUE' }, { status: 400 }));
    }

    const vote = await prisma.vote.upsert({
      where: { roomId_userId_restaurantId: { roomId, userId, restaurantId } },
      update: { value: rawValue },
      create: { roomId, userId, restaurantId, value: rawValue },
      select: { id: true, roomId: true, userId: true, restaurantId: true, value: true, createdAt: true },
    });

    return withCORS(NextResponse.json({ vote }, { status: 200 }));
  } catch (e) {
    const msg = (e as Error)?.message;
    if (msg === 'UNAUTHENTICATED') {
      return withCORS(NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 }));
    }
    return withCORS(NextResponse.json({ error: 'FAILED_TO_SAVE_VOTE', details: String(e) }, { status: 500 }));
  }
}
