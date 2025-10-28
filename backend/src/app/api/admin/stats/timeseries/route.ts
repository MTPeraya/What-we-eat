import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { withCORS, OPTIONS } from "@/lib/admin";

export { OPTIONS };

function parse(req: NextRequest) {
  const sp = Object.fromEntries(req.nextUrl.searchParams.entries());
  const from = sp.from ? new Date(sp.from) : new Date(Date.now() - 30 * 86400e3);
  const to   = sp.to   ? new Date(sp.to)   : new Date();
  const bucket = (sp.bucket ?? "day") as "day" | "week";
  return { from, to, bucket };
}

function floorDate(d: Date, bucket: "day" | "week") {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  if (bucket === "week") {
    const dow = x.getUTCDay(); // 0=Sun
    x.setUTCDate(x.getUTCDate() - dow);
  }
  return x.toISOString();
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const { from, to, bucket } = parse(req);

    const [rooms, votes, decisions, ratings] = await Promise.all([
      prisma.room.findMany({ where: { createdAt: { gte: from, lte: to } }, select: { createdAt: true } }),
      prisma.vote.findMany({ where: { createdAt: { gte: from, lte: to } }, select: { createdAt: true } }),
      prisma.mealHistory.findMany({ where: { decidedAt: { gte: from, lte: to } }, select: { decidedAt: true } }),
      prisma.rating.findMany({ where: { createdAt: { gte: from, lte: to } }, select: { createdAt: true } }),
    ]);

    const bucketize = (dates: Date[]) => {
      const m = new Map<string, number>();
      dates.forEach(d => {
        const k = floorDate(d, bucket);
        m.set(k, (m.get(k) ?? 0) + 1);
      });
      return Array.from(m.entries()).map(([date, value]) => ({ date, value })).sort((a,b)=>a.date.localeCompare(b.date));
    };

    const res = {
      range: { from, to, bucket },
      rooms: bucketize(rooms.map(x => x.createdAt)),
      votes: bucketize(votes.map(x => x.createdAt)),
      decisions: bucketize(decisions.map(x => x.decidedAt)),
      ratings: bucketize(ratings.map(x => x.createdAt)),
    };

    return withCORS(NextResponse.json(res, { status: 200 }));
  } catch (e) {
    const msg = (e as Error).message;
    const code = msg === "UNAUTHENTICATED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return withCORS(NextResponse.json({ error: msg }, { status: code }));
  }
}
