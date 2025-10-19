import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/session";
import type { Prisma } from "@prisma/client";

// ---------- CORS ----------
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";
function withCORS(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", FRONTEND_ORIGIN);
  res.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.headers.set("Access-Control-Allow-Credentials", "true");
  return res;
}
export async function OPTIONS() {
  return withCORS(new NextResponse(null, { status: 204 }));
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
  cursor: z.string().optional(), // ใช้ id ของ MealHistory
});

// ---------- GET /api/me/history ----------
export async function GET(req: NextRequest) {
  try {
    const { userId } = await requireAuth(req);

    const qs = Object.fromEntries(req.nextUrl.searchParams.entries());
    const parsed = QuerySchema.safeParse(qs);
    if (!parsed.success) {
      return withCORS(
        NextResponse.json(
          { error: "INVALID_QUERY", details: parsed.error.flatten() },
          { status: 400 }
        )
      );
    }

    const { from, to, limit = 20, cursor } = parsed.data;

    // ใช้ Prisma types แทน any
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

    return withCORS(NextResponse.json({ items, nextCursor }, { status: 200 }));
  } catch (e) {
    const msg = (e as Error)?.message ?? String(e);
    if (msg === "UNAUTHENTICATED") {
      return withCORS(
        NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 })
      );
    }
    return withCORS(
      NextResponse.json(
        { error: "HISTORY_GET_FAILED", details: msg },
        { status: 500 }
      )
    );
  }
}
