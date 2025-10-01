import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { VoteValue } from '@prisma/client';
import { requireAuth } from '@/lib/session';

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
      return NextResponse.json({ error: 'MISSING_FIELDS' }, { status: 400 });
    }
    if (rawValue !== 'ACCEPT' && rawValue !== 'REJECT') {
      return NextResponse.json({ error: 'INVALID_VALUE' }, { status: 400 });
    }

    const vote = await prisma.vote.upsert({
      where: { roomId_userId_restaurantId: { roomId, userId, restaurantId } },
      update: { value: rawValue },
      create: { roomId, userId, restaurantId, value: rawValue },
      select: { id: true, roomId: true, userId: true, restaurantId: true, value: true, createdAt: true },
    });

    return NextResponse.json({ vote }, { status: 200 });
  } catch (e) {
    if ((e as Error).message === 'UNAUTHENTICATED') {
      return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    }
    return NextResponse.json({ error: 'FAILED_TO_SAVE_VOTE', details: String(e) }, { status: 500 });
  }
}
