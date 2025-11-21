import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { withCORS, preflight } from "@/lib/cors";

// ================== CORS ==================
export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return preflight('GET, OPTIONS', origin);
}

// ================== GET: Check if restaurant is favorited ==================
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ restaurantId: string }> }
) {
  const origin = req.headers.get('origin');
  
  try {
    const { userId } = await requireAuth(req);
    const { restaurantId } = await ctx.params;

    const favorite = await prisma.favorite.findUnique({
      where: {
        userId_restaurantId: {
          userId,
          restaurantId,
        },
      },
      select: {
        id: true,
        createdAt: true,
      },
    });

    return withCORS(
      NextResponse.json(
        {
          isFavorited: !!favorite,
          favoriteId: favorite?.id || null,
        },
        { status: 200 }
      ),
      origin
    );
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
        { error: "CHECK_FAVORITE_FAILED", details: msg },
        { status: 500 }
      ),
      origin
    );
  }
}

