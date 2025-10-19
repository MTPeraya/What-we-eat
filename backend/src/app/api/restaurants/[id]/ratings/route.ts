import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";
function withCORS(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", FRONTEND_ORIGIN);
  res.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.headers.set("Access-Control-Allow-Credentials", "true");
  return res;
}
export async function OPTIONS() { return withCORS(new NextResponse(null, { status: 204 })); }

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;

    const items = await prisma.rating.findMany({
      where: { restaurantId: id, status: "approved" },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true, score: true, tags: true, comment: true, createdAt: true,
        photos: { select: { publicUrl: true, width: true, height: true } },
      },
    });

    return withCORS(NextResponse.json({ items }, { status: 200 }));
  } catch (e) {
    return withCORS(NextResponse.json({ error: "RATINGS_LIST_FAILED", details: String(e) }, { status: 500 }));
  }
}
