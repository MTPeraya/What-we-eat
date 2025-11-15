// backend/src/app/api/votes/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { VoteValue } from '@prisma/client';
import { requireAuth } from '@/lib/session';
import { withCORS, preflight } from '@/lib/cors';

// Preflight
export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return preflight('POST, OPTIONS', origin);
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  
  try {
    const { userId } = await requireAuth(req);

    const body = (await req.json()) as Partial<{
      roomId: string; restaurantId: string; value: VoteValue | 'ACCEPT' | 'REJECT';
    }>;
    const roomId = body.roomId?.trim();
    const restaurantId = body.restaurantId?.trim();
    const rawValue = body.value as VoteValue | undefined;

    if (!roomId || !restaurantId || !rawValue) {
      return withCORS(NextResponse.json({ error: 'MISSING_FIELDS' }, { status: 400 }), origin);
    }
    if (rawValue !== 'ACCEPT' && rawValue !== 'REJECT') {
      return withCORS(NextResponse.json({ error: 'INVALID_VALUE' }, { status: 400 }), origin);
    }

    const vote = await prisma.vote.upsert({
      where: { roomId_userId_restaurantId: { roomId, userId, restaurantId } },
      update: { value: rawValue },
      create: { roomId, userId, restaurantId, value: rawValue },
      select: { id: true, roomId: true, userId: true, restaurantId: true, value: true, createdAt: true },
    });

    return withCORS(NextResponse.json({ vote }, { status: 200 }), origin);
  } catch (e) {
    const msg = (e as Error)?.message;
    if (msg === 'UNAUTHENTICATED') {
      return withCORS(NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 }), origin);
    }
    return withCORS(NextResponse.json({ error: 'FAILED_TO_SAVE_VOTE', details: String(e) }, { status: 500 }), origin);
  }
}
