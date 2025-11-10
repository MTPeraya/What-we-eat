// backend/src/app/api/admin/stats/top-restaurants/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAdmin, withCORS } from "@/lib/admin";
import { preflight } from "@/lib/cors";

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return preflight('GET, OPTIONS', origin);
}

type Range = { from: Date; to: Date };
type ByKey = "wins" | "ratings";

function parse(req: NextRequest): Range & { limit: number; by: ByKey } {
  const sp = Object.fromEntries(req.nextUrl.searchParams.entries());
  const from = sp.from ? new Date(sp.from) : new Date(Date.now() - 30 * 86400e3);
  const to = sp.to ? new Date(sp.to) : new Date();
  const limit = Math.min(Math.max(Number(sp.limit ?? 10), 1), 50);
  const rawBy = (sp.by ?? "wins").toString();
  const by: ByKey = rawBy === "ratings" ? "ratings" : "wins";
  return { from, to, limit, by };
}

export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin');
  
  try {
    await requireAdmin(req);
    const { from, to, limit, by } = parse(req);

    if (by === "wins") {
      // top by wins (from MealHistory)
      const agg = await prisma.mealHistory.groupBy({
        by: ["restaurantId"],
        _count: { restaurantId: true },
        where: { decidedAt: { gte: from, lte: to } },
        orderBy: { _count: { restaurantId: "desc" } },
        take: limit,
      });
      const ids = agg.map((a) => a.restaurantId);

      const details = await prisma.restaurant.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          name: true,
          address: true,
          rating: true,
          userRatingsTotal: true,
          lat: true,
          lng: true,
        },
      });

      const map = new Map(details.map((r) => [r.id, r]));
      const items = agg.map((a) => ({
        restaurant: map.get(a.restaurantId)!,
        wins: a._count.restaurantId,
      }));

      return withCORS(
        NextResponse.json(
          { by, range: { from, to }, items },
          { status: 200 },
        ),
        origin
      );
    }

    // by === "ratings"  (approved reviews avg score)
    const agg = await prisma.rating.groupBy({
      by: ["restaurantId"],
      _avg: { score: true },
      _count: { restaurantId: true },
      where: { createdAt: { gte: from, lte: to }, status: "approved" },
      orderBy: [{ _avg: { score: "desc" } }, { _count: { restaurantId: "desc" } }],
      take: limit,
    });

    const ids = agg.map((a) => a.restaurantId);

    const details = await prisma.restaurant.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        name: true,
        address: true,
        rating: true,
        userRatingsTotal: true,
        lat: true,
        lng: true,
      },
    });

    const map = new Map(details.map((r) => [r.id, r]));
    const items = agg.map((a) => ({
      restaurant: map.get(a.restaurantId)!,
      avgScore: a._avg.score,
      count: a._count.restaurantId,
    }));

    return withCORS(
      NextResponse.json(
        { by, range: { from, to }, items },
        { status: 200 },
      ),
      origin
    );
  } catch (e) {
    const msg = (e as Error).message;
    const code = msg === "UNAUTHENTICATED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return withCORS(NextResponse.json({ error: msg }, { status: code }), origin);
  }
}
