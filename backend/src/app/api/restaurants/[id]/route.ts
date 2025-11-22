import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withCORS, preflight } from "@/lib/cors";

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  console.log(`[restaurants/[id] OPTIONS] Preflight request from origin: ${origin}`);
  const response = preflight('GET, OPTIONS', origin);
  console.log(`[restaurants/[id] OPTIONS] Preflight response headers:`, {
    'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
    'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
    'Access-Control-Allow-Credentials': response.headers.get('Access-Control-Allow-Credentials'),
  });
  return response;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const origin = req.headers.get('origin');
  console.log(`[restaurants/[id] GET] Request from origin: ${origin}`);
  
  try {
    const { id } = await ctx.params;
    console.log(`[restaurants/[id] GET] Fetching restaurant with id: ${id}`);

    if (!id || id.trim() === '') {
      console.warn(`[restaurants/[id] GET] Empty or invalid restaurant ID`);
      return withCORS(
        NextResponse.json({ error: "INVALID_RESTAURANT_ID" }, { status: 400 }),
        origin
      );
    }

    // Fetch restaurant from database
    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        address: true,
        lat: true,
        lng: true,
        rating: true,
        userRatingsTotal: true,
        priceLevel: true,
        placeId: true,
        images: {
          where: { isPrimary: true },
          select: {
            externalUrl: true,
          },
          take: 1,
        },
        assets: {
          where: { status: 'approved' },
          select: {
            publicUrl: true,
          },
          take: 1,
        },
      },
    });

    if (!restaurant) {
      console.warn(`[restaurants/[id] GET] Restaurant not found: ${id}`);
      return withCORS(
        NextResponse.json({ error: "RESTAURANT_NOT_FOUND" }, { status: 404 }),
        origin
      );
    }

    console.log(`[restaurants/[id] GET] Found restaurant: ${restaurant.name}`);

    // Get image URL - prefer primary image, then approved asset, then fallback
    let imageUrl: string | null = null;
    if (restaurant.images && restaurant.images.length > 0 && restaurant.images[0].externalUrl) {
      imageUrl = restaurant.images[0].externalUrl;
    } else if (restaurant.assets && restaurant.assets.length > 0 && restaurant.assets[0].publicUrl) {
      imageUrl = restaurant.assets[0].publicUrl;
    }

    // Return restaurant data in the format expected by the frontend
    const response = withCORS(
      NextResponse.json(
        {
          id: restaurant.id,
          name: restaurant.name,
          address: restaurant.address,
          rating: restaurant.rating,
          googleRatingCount: restaurant.userRatingsTotal,
          priceLevel: restaurant.priceLevel,
          location: {
            lat: restaurant.lat,
            lng: restaurant.lng,
          },
          url: imageUrl, // Frontend expects 'url' field for image
        },
        { status: 200 }
      ),
      origin
    );
    
    console.log(`[restaurants/[id] GET] Successfully returning restaurant data`);
    return response;
  } catch (e) {
    console.error("[restaurants/[id] GET] Error:", e);
    const errorMessage = e instanceof Error ? e.message : String(e);
    return withCORS(
      NextResponse.json(
        { error: "RESTAURANT_FETCH_FAILED", details: errorMessage },
        { status: 500 }
      ),
      origin
    );
  }
}

