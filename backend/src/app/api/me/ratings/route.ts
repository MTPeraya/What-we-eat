import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { withCORS, preflight } from "@/lib/cors";

// ---------- CORS ----------
export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin");
  return preflight("GET, OPTIONS", origin);
}

// ---------- GET /api/me/ratings - Get current user's ratings ----------
export async function GET(req: NextRequest) {
  const origin = req.headers.get("origin");
  
  try {
    const { userId } = await requireAuth(req);

    const ratings = await prisma.rating.findMany({
      where: { userId },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            address: true,
            placeId: true,
          },
        },
        photos: {
          select: {
            id: true,
            publicUrl: true,
            base64Data: true,
            mime: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const items = ratings.map((r) => ({
      id: r.id,
      restaurantId: r.restaurantId,
      restaurant: {
        id: r.restaurant.id,
        name: r.restaurant.name,
        address: r.restaurant.address,
        placeId: r.restaurant.placeId,
      },
      score: r.score,
      comment: r.comment,
      tags: r.tags,
      status: r.status,
      photos: r.photos.map((p) => ({
        id: p.id,
        publicUrl: p.publicUrl,
        base64Data: p.base64Data,
        mime: p.mime,
      })),
      createdAt: r.createdAt.toISOString(),
    }));

    return withCORS(NextResponse.json({ items }, { status: 200 }), origin);
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
        { error: "GET_MY_RATINGS_FAILED", details: msg },
        { status: 500 }
      ),
      origin
    );
  }
}

