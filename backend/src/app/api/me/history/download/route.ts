import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/session";
import type { Prisma } from "@prisma/client";
import { withCORS, preflight } from "@/lib/cors";

// ---------- CORS ----------
export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return preflight('GET, OPTIONS', origin);
}

// ---------- Query schema ----------
const QuerySchema = z.object({
  from: z.string().datetime().optional(), // ISO
  to: z.string().datetime().optional(),   // ISO
  format: z.enum(['csv', 'json']).default('csv'),
});

type MealHistoryItem = {
  decidedAt: Date | null;
  roomId: string | null;
  restaurant: {
    name: string | null;
    address: string | null;
    rating: number | null;
    lat: number | null;
    lng: number | null;
    placeId: string | null;
  } | null;
};

// Helper function to convert data to CSV
function toCSV(data: MealHistoryItem[]): string {
  if (data.length === 0) return '';
  
  const headers = ['Date', 'Restaurant Name', 'Address', 'Rating', 'Latitude', 'Longitude', 'Place ID', 'Room ID'];
  const rows = data.map(item => [
    item.decidedAt ? new Date(item.decidedAt).toISOString() : '',
    item.restaurant?.name || 'Unknown',
    item.restaurant?.address || '',
    item.restaurant?.rating?.toString() || '',
    item.restaurant?.lat?.toString() || '',
    item.restaurant?.lng?.toString() || '',
    item.restaurant?.placeId || '',
    item.roomId || '',
  ]);
  
  // Escape CSV values
  const escapeCSV = (val: string) => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };
  
  const csvRows = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(','))
  ];
  
  return csvRows.join('\n');
}

// ---------- GET /api/me/history/download ----------
export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin');
  
  try {
    const { userId } = await requireAuth(req);

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

    const { from, to, format } = parsed.data;

    // Use Prisma types instead of any
    const where: Prisma.MealHistoryWhereInput = { userId };

    if (from || to) {
      const decidedAt: Prisma.DateTimeFilter = {};
      if (from) decidedAt.gte = new Date(from);
      if (to) decidedAt.lte = new Date(to);
      where.decidedAt = decidedAt;
    }

    // Fetch all history (no pagination for download)
    const items = await prisma.mealHistory.findMany({
      where,
      orderBy: { decidedAt: "desc" },
      select: {
        id: true,
        decidedAt: true,
        roomId: true,
        restaurant: {
          select: {
            id: true,
            placeId: true,
            name: true,
            address: true,
            lat: true,
            lng: true,
            rating: true,
          },
        },
      },
    });

    if (format === 'json') {
      const jsonData = items.map(item => ({
        date: item.decidedAt ? item.decidedAt.toISOString() : null,
        restaurant: {
          name: item.restaurant?.name || 'Unknown',
          address: item.restaurant?.address || null,
          rating: item.restaurant?.rating || null,
          lat: item.restaurant?.lat || null,
          lng: item.restaurant?.lng || null,
          placeId: item.restaurant?.placeId || null,
        },
        roomId: item.roomId || null,
      }));

      return withCORS(
        NextResponse.json(jsonData, {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="history_${new Date().toISOString().split('T')[0]}.json"`,
          },
        }),
        origin
      );
    } else {
      // CSV format
      const csv = toCSV(items);
      return withCORS(
        new NextResponse(csv, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="history_${new Date().toISOString().split('T')[0]}.csv"`,
          },
        }),
        origin
      );
    }
  } catch (e) {
    const msg = (e as Error)?.message ?? String(e);
    if (msg === "UNAUTHENTICATED") {
      return withCORS(
        NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 }),
        origin
      );
    }
    return withCORS(
      NextResponse.json(
        { error: "HISTORY_DOWNLOAD_FAILED", details: msg },
        { status: 500 }
      ),
      origin
    );
  }
}

