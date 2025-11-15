import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAdmin, withCORS } from "@/lib/admin";
import { preflight } from "@/lib/cors";

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return preflight('GET, OPTIONS', origin);
}

function parse(req: NextRequest) {
  const sp = Object.fromEntries(req.nextUrl.searchParams.entries());
  const from = sp.from ? new Date(sp.from) : new Date(Date.now() - 30 * 86400e3);
  const to   = sp.to   ? new Date(sp.to)   : new Date();
  return { from, to };
}

export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin');
  
  try {
    await requireAdmin(req);
    const { from, to } = parse(req);

    // Count participants/votes per room during the time period rooms were created
    const rooms = await prisma.room.findMany({
      where: { createdAt: { gte: from, lte: to } },
      select: { id: true },
    });
    const roomIds = rooms.map(r => r.id);
    const totalRooms = roomIds.length || 1;

    const [participants, votes] = await Promise.all([
      prisma.roomParticipant.groupBy({
        by: ["roomId"],
        _count: { id: true },
        where: { roomId: { in: roomIds } },
      }),
      prisma.vote.groupBy({
        by: ["roomId"],
        _count: { id: true },
        where: { roomId: { in: roomIds } },
      }),
    ]);

    const sum = (xs: { _count: { id: number } }[]) => xs.reduce((a, b) => a + b._count.id, 0);
    const totalParticipants = sum(participants);
    const totalVotes = sum(votes);

    const res = {
      range: { from, to },
      avgParticipantsPerRoom: totalParticipants / totalRooms,
      avgVotesPerRoom: totalVotes / totalRooms,
      voteRate: totalParticipants ? totalVotes / totalParticipants : 0, // ~ votes per participant
    };
    return withCORS(NextResponse.json(res, { status: 200 }), origin);
  } catch (e) {
    const msg = (e as Error).message;
    const code = msg === "UNAUTHENTICATED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return withCORS(NextResponse.json({ error: msg }, { status: code }), origin);
  }
}
