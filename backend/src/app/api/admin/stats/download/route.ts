import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAdmin, withCORS } from "@/lib/admin";
import { preflight } from "@/lib/cors";
import { z } from "zod";

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return preflight('GET, OPTIONS', origin);
}

const QuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  format: z.enum(['csv', 'json']).default('json'),
  type: z.enum(['overview', 'timeseries', 'engagement', 'top-restaurants', 'all']).default('all'),
});

function parseRange(fromStr?: string, toStr?: string) {
  const from = fromStr ? new Date(fromStr) : new Date(Date.now() - 30 * 86400e3);
  const to = toStr ? new Date(toStr) : new Date();
  return { from, to };
}

// Helper to convert data to CSV
function toCSV(data: any, title: string): string {
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return `${title}\nNo data available\n\n`;
  }
  
  if (Array.isArray(data)) {
    if (data.length === 0) return `${title}\nNo data available\n\n`;
    const headers = Object.keys(data[0]);
    const rows = data.map(item => headers.map(h => {
      const val = item[h];
      if (val === null || val === undefined) return '';
      if (typeof val === 'object') return JSON.stringify(val);
      return String(val);
    }));
    
    const escapeCSV = (val: string) => {
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };
    
    return `${title}\n${headers.map(escapeCSV).join(',')}\n${rows.map(row => row.map(escapeCSV).join(',')).join('\n')}\n\n`;
  }
  
  // Object data - convert to key-value pairs
  const entries = Object.entries(data).map(([key, value]) => {
    const val = value === null || value === undefined ? '' : String(value);
    return `${key},${val}`;
  });
  return `${title}\nKey,Value\n${entries.join('\n')}\n\n`;
}

export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin');
  
  try {
    await requireAdmin(req);
    
    const qs = Object.fromEntries(req.nextUrl.searchParams.entries());
    const parsed = QuerySchema.safeParse(qs);
    if (!parsed.success) {
      return withCORS(
        NextResponse.json(
          { error: "INVALID_QUERY", details: parsed.error.flatten() },
          { status: 400 }
        ),
        origin
      );
    }

    const { from, to, format, type } = parsed.data;
    const { from: fromDate, to: toDate } = parseRange(from, to);

    const results: any = {
      metadata: {
        generatedAt: new Date().toISOString(),
        range: { from: fromDate.toISOString(), to: toDate.toISOString() },
      },
    };

    // Fetch all requested data types
    if (type === 'all' || type === 'overview') {
      const [rooms, votes, decisions, ratings] = await Promise.all([
        prisma.room.count({ where: { createdAt: { gte: fromDate, lte: toDate } } }),
        prisma.vote.count({ where: { createdAt: { gte: fromDate, lte: toDate } } }),
        prisma.mealHistory.count({ where: { decidedAt: { gte: fromDate, lte: toDate } } }),
        prisma.rating.groupBy({
          by: ["status"],
          _count: { status: true },
          where: { createdAt: { gte: fromDate, lte: toDate } },
        }).catch(() => []),
      ]);

      const ratingSummary = ratings.reduce((acc, r) => {
        acc[r.status] = r._count.status; return acc;
      }, { pending: 0, approved: 0, rejected: 0 });

      results.overview = {
        roomsCreated: rooms,
        votes,
        decisions,
        ratings: ratingSummary,
      };
    }

    if (type === 'all' || type === 'timeseries') {
      const bucket = 'day';
      const [rooms, votes, decisions, ratings] = await Promise.all([
        prisma.room.findMany({ where: { createdAt: { gte: fromDate, lte: toDate } }, select: { createdAt: true } }),
        prisma.vote.findMany({ where: { createdAt: { gte: fromDate, lte: toDate } }, select: { createdAt: true } }),
        prisma.mealHistory.findMany({ where: { decidedAt: { gte: fromDate, lte: toDate } }, select: { decidedAt: true } }),
        prisma.rating.findMany({ where: { createdAt: { gte: fromDate, lte: toDate } }, select: { createdAt: true } }),
      ]);

      const floorDate = (d: Date) => {
        const x = new Date(d);
        x.setUTCHours(0, 0, 0, 0);
        return x.toISOString();
      };

      const bucketize = (dates: Date[]) => {
        const m = new Map<string, number>();
        dates.forEach(d => {
          const k = floorDate(d);
          m.set(k, (m.get(k) ?? 0) + 1);
        });
        return Array.from(m.entries()).map(([date, value]) => ({ date, value })).sort((a, b) => a.date.localeCompare(b.date));
      };

      results.timeseries = {
        rooms: bucketize(rooms.map(x => x.createdAt)),
        votes: bucketize(votes.map(x => x.createdAt)),
        decisions: bucketize(decisions.map(x => x.decidedAt)),
        ratings: bucketize(ratings.map(x => x.createdAt)),
      };
    }

    if (type === 'all' || type === 'engagement') {
      const rooms = await prisma.room.findMany({
        where: { createdAt: { gte: fromDate, lte: toDate } },
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

      results.engagement = {
        avgParticipantsPerRoom: totalParticipants / totalRooms,
        avgVotesPerRoom: totalVotes / totalRooms,
        voteRate: totalParticipants ? totalVotes / totalParticipants : 0,
      };
    }

    if (type === 'all' || type === 'top-restaurants') {
      const limit = 50;
      const agg = await prisma.mealHistory.groupBy({
        by: ["restaurantId"],
        _count: { restaurantId: true },
        where: { decidedAt: { gte: fromDate, lte: toDate } },
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
      results.topRestaurants = agg.map((a) => ({
        restaurant: map.get(a.restaurantId)!,
        wins: a._count.restaurantId,
      }));
    }

    if (format === 'json') {
      return withCORS(
        NextResponse.json(results, {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="analytics_${new Date().toISOString().split('T')[0]}.json"`,
          },
        }),
        origin
      );
    } else {
      // CSV format
      let csv = '';
      if (results.overview) {
        csv += toCSV(results.overview, 'Overview Statistics');
      }
      if (results.timeseries) {
        csv += toCSV(results.timeseries.rooms, 'Timeseries - Rooms');
        csv += toCSV(results.timeseries.votes, 'Timeseries - Votes');
        csv += toCSV(results.timeseries.decisions, 'Timeseries - Decisions');
        csv += toCSV(results.timeseries.ratings, 'Timeseries - Ratings');
      }
      if (results.engagement) {
        csv += toCSV(results.engagement, 'Engagement Metrics');
      }
      if (results.topRestaurants) {
        csv += toCSV(
          results.topRestaurants.map((item: any) => ({
            name: item.restaurant?.name || 'Unknown',
            address: item.restaurant?.address || '',
            rating: item.restaurant?.rating || '',
            wins: item.wins,
          })),
          'Top Restaurants'
        );
      }

      return withCORS(
        new NextResponse(csv, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="analytics_${new Date().toISOString().split('T')[0]}.csv"`,
          },
        }),
        origin
      );
    }
  } catch (e) {
    const msg = (e as Error).message;
    const code = msg === "UNAUTHENTICATED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return withCORS(NextResponse.json({ error: msg }, { status: code }), origin);
  }
}

