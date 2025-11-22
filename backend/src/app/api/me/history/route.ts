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
  limit: z
    .string()
    .regex(/^\d+$/)
    .transform((v) => Number(v))
    .optional(),
  cursor: z.string().optional(), // Using MealHistory id
});

// ---------- GET /api/me/history ----------
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

    const { from, to, limit = 20, cursor } = parsed.data;

    // Use Prisma types instead of any
    const where: Prisma.MealHistoryWhereInput = { userId };

    if (from || to) {
      const decidedAt: Prisma.DateTimeFilter = {};
      if (from) decidedAt.gte = new Date(from);
      if (to) decidedAt.lte = new Date(to);
      where.decidedAt = decidedAt;
    }

    const items = await prisma.mealHistory.findMany({
      where,
      take: limit,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
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

    const nextCursor = items.length === limit ? items[items.length - 1].id : null;

    return withCORS(NextResponse.json({ items, nextCursor }, { status: 200 }), origin);
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
        { error: "HISTORY_GET_FAILED", details: msg },
        { status: 500 }
      ),
      origin
    );
  }
}
