// backend/src/app/api/rooms/[roomId]/decide/score/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { tallyVotesByRoom } from '@/services/voteService';

// ===== CORS =====
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173';

function withCORS(res: NextResponse) {
  res.headers.set('Access-Control-Allow-Origin', FRONTEND_ORIGIN);
  res.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.headers.set('Access-Control-Allow-Credentials', 'true');
  return res;
}

// Preflight
export async function OPTIONS() {
  return withCORS(new NextResponse(null, { status: 204 }));
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ roomId: string }> } // v15: params เป็น Promise
) {
  try {
    const { roomId } = await context.params;

    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      return withCORS(NextResponse.json({ error: 'ROOM_NOT_FOUND' }, { status: 404 }));
    }

    const [scores, totalVotes] = await Promise.all([
      tallyVotesByRoom(roomId),
      prisma.vote.count({ where: { roomId } }),
    ]);

    return withCORS(
      NextResponse.json({
        roomId,
        generatedAt: new Date().toISOString(),
        stats: { totalVotes, totalRestaurants: scores.length },
        scores,
      })
    );
  } catch (e) {
    return withCORS(
      NextResponse.json(
        { error: 'FAILED_TO_SCORE', details: e instanceof Error ? e.message : String(e) },
        { status: 500 }
      )
    );
  }
}
