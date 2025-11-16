// backend/src/app/api/rooms/[roomId]/decide/score/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { tallyVotesByRoom } from '@/services/voteService';
import { withCORS, preflight } from '@/lib/cors';

// Preflight
export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return preflight('GET, OPTIONS', origin);
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ roomId: string }> } // v15: params is a Promise
) {
  const origin = req.headers.get('origin');
  
  try {
    const { roomId } = await context.params;

    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      return withCORS(NextResponse.json({ error: 'ROOM_NOT_FOUND' }, { status: 404 }), origin);
    }

    const [scores, totalVotes] = await Promise.all([
      tallyVotesByRoom(roomId),
      prisma.vote.count({ where: { roomId } }),
    ]);

    // Enrich scores with restaurant details
    const restaurantIds = scores.map(s => s.restaurantId);
    const restaurants = await prisma.restaurant.findMany({
      where: { id: { in: restaurantIds } },
      select: {
        id: true,
        placeId: true,
        name: true,
        address: true,
        lat: true,
        lng: true,
        rating: true,
        userRatingsTotal: true,
      }
    });

    const restaurantMap = new Map(restaurants.map(r => [r.id, r]));
    
    const enrichedScores = scores.map(score => {
      const restaurant = restaurantMap.get(score.restaurantId);
      return {
        ...score,
        placeId: restaurant?.placeId || null,
        name: restaurant?.name || null,
        address: restaurant?.address || null,
        location: restaurant?.lat && restaurant?.lng 
          ? { lat: restaurant.lat, lng: restaurant.lng }
          : null,
        rating: restaurant?.rating || null,
        userRatingsTotal: restaurant?.userRatingsTotal ?? null,
      };
    });

    return withCORS(
      NextResponse.json({
        roomId,
        generatedAt: new Date().toISOString(),
        stats: { totalVotes, totalRestaurants: scores.length },
        scores: enrichedScores,
      }),
      origin
    );
  } catch (e) {
    return withCORS(
      NextResponse.json(
        { error: 'FAILED_TO_SCORE', details: e instanceof Error ? e.message : String(e) },
        { status: 500 }
      ),
      origin
    );
  }
}
