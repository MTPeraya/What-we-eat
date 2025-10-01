// backend/src/app/api/rooms/[roomId]/decide/score/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';                 // ปรับ path ให้ตรงโปรเจกต์คุณ
import { tallyVotesByRoom } from '@/services/voteService';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ roomId: string }> }     // 👈 v15: params เป็น Promise
) {
  const { roomId } = await context.params;             // 👈 ต้อง await

  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) {
    return NextResponse.json({ error: 'ROOM_NOT_FOUND' }, { status: 404 });
  }

  const [scores, totalVotes] = await Promise.all([
    tallyVotesByRoom(roomId),
    prisma.vote.count({ where: { roomId } }),
  ]);

  return NextResponse.json({
    roomId,
    generatedAt: new Date().toISOString(),
    stats: { totalVotes, totalRestaurants: scores.length },
    scores,
  });
}
