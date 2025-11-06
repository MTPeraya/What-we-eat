import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withCORS, preflight } from "@/lib/cors";

export async function OPTIONS(req: NextRequest) { 
  const origin = req.headers.get('origin');
  return preflight('GET, OPTIONS', origin);
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const origin = req.headers.get('origin');
  
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

    return withCORS(NextResponse.json({ items }, { status: 200 }), origin);
  } catch (e) {
    return withCORS(NextResponse.json({ error: "RATINGS_LIST_FAILED", details: String(e) }, { status: 500 }), origin);
  }
}
