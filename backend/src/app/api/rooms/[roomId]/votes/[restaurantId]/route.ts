import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withCORS, preflight } from "@/lib/cors";

export async function OPTIONS() {
  return preflight("GET, OPTIONS");
}

// GET /api/rooms/{roomId}/votes/{restaurantId}
// Returns all votes for a specific restaurant in a room with voter names
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ roomId: string; restaurantId: string }> }
) {
  try {
    const { roomId, restaurantId } = await ctx.params;

    const votes = await prisma.vote.findMany({
      where: { roomId, restaurantId },
      select: {
        id: true,
        userId: true,
        value: true,
        createdAt: true,
        user: {
          select: {
            username: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Get participant display names (for those in the room)
    const participants = await prisma.roomParticipant.findMany({
      where: { roomId },
      select: { userId: true, displayName: true },
    });

    const participantMap = new Map(
      participants.map(p => [p.userId, p.displayName])
    );

    const enrichedVotes = votes.map(v => ({
      id: v.id,
      value: v.value,
      voterName: participantMap.get(v.userId) || v.user?.username || "Anonymous",
      createdAt: v.createdAt.toISOString(),
    }));

    const acceptCount = enrichedVotes.filter(v => v.value === 'ACCEPT').length;
    const rejectCount = enrichedVotes.filter(v => v.value === 'REJECT').length;
    const total = acceptCount + rejectCount;
    const approvalRate = total > 0 ? acceptCount / total : 0;

    const res = NextResponse.json(
      {
        roomId,
        restaurantId,
        stats: {
          totalVotes: total,
          acceptCount,
          rejectCount,
          approvalRate,
        },
        votes: enrichedVotes,
      },
      { status: 200 }
    );
    res.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    return withCORS(res);
  } catch (e) {
    const res = NextResponse.json(
      { error: "VOTES_FETCH_FAILED", details: String(e) },
      { status: 500 }
    );
    res.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    return withCORS(res);
  }
}

