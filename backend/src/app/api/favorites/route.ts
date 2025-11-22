import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { withCORS, preflight } from "@/lib/cors";

// ================== CORS ==================
export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return preflight('GET, POST, DELETE, OPTIONS', origin);
}

// ================== Schemas ==================
const AddFavoriteSchema = z.object({
  restaurantId: z.string().min(1),
}).strict();

// ================== GET: Get user's favorites ==================
export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin');
  
  try {
    const { userId } = await requireAuth(req);

    const favorites = await prisma.favorite.findMany({
      where: { userId },
      include: {
        restaurant: {
          select: {
            id: true,
            placeId: true,
            name: true,
            address: true,
            lat: true,
            lng: true,
            rating: true,
            priceLevel: true,
            images: {
              where: { isPrimary: true },
              take: 1,
              select: {
                externalUrl: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return withCORS(
      NextResponse.json(
        {
          favorites: favorites.map((f) => ({
            id: f.id,
            restaurantId: f.restaurantId,
            restaurant: {
              id: f.restaurant.id,
              placeId: f.restaurant.placeId,
              name: f.restaurant.name,
              address: f.restaurant.address,
              lat: Number(f.restaurant.lat),
              lng: Number(f.restaurant.lng),
              rating: f.restaurant.rating,
              priceLevel: f.restaurant.priceLevel,
              imageUrl: f.restaurant.images[0]?.externalUrl || null,
            },
            createdAt: f.createdAt.toISOString(),
          })),
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
        { error: "GET_FAVORITES_FAILED", details: msg },
        { status: 500 }
      ),
      origin
    );
  }
}

// ================== POST: Add favorite ==================
export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  
  try {
    const { userId } = await requireAuth(req);

    let body: unknown = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    const parsed = AddFavoriteSchema.safeParse(body);
    if (!parsed.success) {
      return withCORS(
        NextResponse.json(
          { error: "INVALID_BODY", details: parsed.error.flatten() },
          { status: 400 }
        ),
        origin
      );
    }

    const { restaurantId } = parsed.data;

    // Check if restaurant exists
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true },
    });

    if (!restaurant) {
      return withCORS(
        NextResponse.json({ error: "RESTAURANT_NOT_FOUND" }, { status: 404 }),
        origin
      );
    }

    // Check if already favorited
    const existing = await prisma.favorite.findUnique({
      where: {
        userId_restaurantId: {
          userId,
          restaurantId,
        },
      },
    });

    if (existing) {
      return withCORS(
        NextResponse.json(
          { error: "ALREADY_FAVORITED", favoriteId: existing.id },
          { status: 409 }
        ),
        origin
      );
    }

    // Create favorite
    const favorite = await prisma.favorite.create({
      data: {
        userId,
        restaurantId,
      },
      include: {
        restaurant: {
          select: {
            id: true,
            placeId: true,
            name: true,
            address: true,
            lat: true,
            lng: true,
            rating: true,
            priceLevel: true,
          },
        },
      },
    });

    return withCORS(
      NextResponse.json(
        {
          favorite: {
            id: favorite.id,
            restaurantId: favorite.restaurantId,
            restaurant: {
              id: favorite.restaurant.id,
              placeId: favorite.restaurant.placeId,
              name: favorite.restaurant.name,
              address: favorite.restaurant.address,
              lat: Number(favorite.restaurant.lat),
              lng: Number(favorite.restaurant.lng),
              rating: favorite.restaurant.rating,
              priceLevel: favorite.restaurant.priceLevel,
            },
            createdAt: favorite.createdAt.toISOString(),
          },
        },
        { status: 201 }
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
        { error: "ADD_FAVORITE_FAILED", details: msg },
        { status: 500 }
      ),
      origin
    );
  }
}

// ================== DELETE: Remove favorite ==================
export async function DELETE(req: NextRequest) {
  const origin = req.headers.get('origin');
  
  try {
    const { userId } = await requireAuth(req);

    let body: unknown = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    const parsed = AddFavoriteSchema.safeParse(body);
    if (!parsed.success) {
      return withCORS(
        NextResponse.json(
          { error: "INVALID_BODY", details: parsed.error.flatten() },
          { status: 400 }
        ),
        origin
      );
    }

    const { restaurantId } = parsed.data;

    // Delete favorite
    const deleted = await prisma.favorite.deleteMany({
      where: {
        userId,
        restaurantId,
      },
    });

    if (deleted.count === 0) {
      return withCORS(
        NextResponse.json({ error: "FAVORITE_NOT_FOUND" }, { status: 404 }),
        origin
      );
    }

    return withCORS(
      NextResponse.json(
        { success: true, message: "Favorite removed" },
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
        { error: "REMOVE_FAVORITE_FAILED", details: msg },
        { status: 500 }
      ),
      origin
    );
  }
}

