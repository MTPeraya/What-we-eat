import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAdmin, withCORS } from "@/lib/admin";
import { preflight } from "@/lib/cors";

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return preflight('GET, OPTIONS', origin);
}

function parseRange(req: NextRequest) {
  const sp = Object.fromEntries(req.nextUrl.searchParams.entries());
  const from = sp.from ? new Date(sp.from) : new Date(Date.now() - 30 * 86400e3);
  const to   = sp.to   ? new Date(sp.to)   : new Date();
  return { from, to };
}

export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin');
  
  try {
    await requireAdmin(req);
    const { from, to } = parseRange(req);

    const [rooms, votes, decisions, ratings] = await Promise.all([
      prisma.room.count({ where: { createdAt: { gte: from, lte: to } } }),
      prisma.vote.count({ where: { createdAt: { gte: from, lte: to } } }),
      prisma.mealHistory.count({ where: { decidedAt: { gte: from, lte: to } } }),
      prisma.rating.groupBy({
        by: ["status"],
        _count: { status: true },
        where: { createdAt: { gte: from, lte: to } },
      }).catch(() => []),
    ]);

    const ratingSummary = ratings.reduce((acc, r) => {
      acc[r.status] = r._count.status; return acc;
    }, { pending: 0, approved: 0, rejected: 0 });

    const res = {
      range: { from, to },
      totals: {
        roomsCreated: rooms,
        votes,
        decisions,
        ratings: ratingSummary,
      },
    };
    return withCORS(NextResponse.json(res, { status: 200 }), origin);
  } catch (e) {
    const msg = (e as Error).message;
    const code = msg === "UNAUTHENTICATED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return withCORS(NextResponse.json({ error: msg }, { status: code }), origin);
  }
}
