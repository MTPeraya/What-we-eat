// backend/src/app/api/restaurants/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { RestaurantService, type RestaurantUpsertInput } from "@/services/RestaurantService";

// ===== CORS =====
import { withCORS, preflight } from "@/lib/cors";

// -------- Types from Google Places we actually use --------
type GooglePlaceResult = {
  place_id: string;
  name: string;
  formatted_address?: string;
  geometry?: { location?: { lat: number; lng: number } };
  rating?: number;
  price_level?: number;
  user_ratings_total?: number;
};
type GooglePlacesResponse = { results?: GooglePlaceResult[] };

// -------- Validation --------
const querySchema = z.object({
  lat: z.coerce.number().optional().default(13.736717),
  lng: z.coerce.number().optional().default(100.523186),
  radius: z.coerce.number().optional().default(5000),
  budgetMax: z.coerce.number().optional(),
  keyword: z.string().optional(), // For filtering by cuisine/keyword
});

const upsertManySchema = z.object({
  items: z.array(z.object({
    placeId: z.string().min(1),
    name: z.string().min(1),
    address: z.string().optional(),
    lat: z.number(),
    lng: z.number(),
    rating: z.number().optional(),
    priceLevel: z.number().optional(),
    userRatingsTotal: z.number().optional(),
    source: z.string().optional(),
    fetchedAt: z.coerce.date().optional(),
  })).min(1),
});

// -------- Controller --------
class RestaurantsController {
  constructor(private service: RestaurantService) {}

  private toMessage(err: unknown, fallback = "Unexpected error") {
    if (err instanceof ZodError) return err.issues?.[0]?.message ?? "Validation failed";
    if (err instanceof Error) return err.message;
    try { return JSON.stringify(err); } catch { return fallback; }
  }

  // GET /api/restaurants
  async get(req: NextRequest) {
    const origin = req.headers.get('origin');
    
    try {
      const params = Object.fromEntries(req.nextUrl.searchParams.entries());
      const qp = querySchema.parse(params);

      const placesKey = process.env.EXTERNAL_PLACES_API_KEY;

      if (!placesKey && process.env.NODE_ENV !== "test") {
        return withCORS(NextResponse.json(
          { error: "Missing EXTERNAL_PLACES_API_KEY" },
          { status: 500 }
        ), origin);
      }

      const keyForCall = placesKey ?? "test";

      // Use Nearby Search instead of Text Search for better restaurant results
      let api =
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
        `?location=${qp.lat},${qp.lng}` +
        `&radius=${qp.radius}` +
        `&type=restaurant` +
        `&key=${keyForCall}`;

      // Add keyword if specified (for cuisine filtering)
      if (qp.keyword) {
        api += `&keyword=${encodeURIComponent(qp.keyword)}`;
      }

      const res = await fetch(api);
      if (!res.ok) {
        return withCORS(NextResponse.json(
          { error: `Google API error: ${res.status}` },
          { status: 500 }
        ), origin);
      }

      const data = (await res.json()) as GooglePlacesResponse;

      // filter by budget if specified
      const filtered: GooglePlaceResult[] = (data.results ?? []).filter((r) => {
        if (qp.budgetMax != null && (r.price_level ?? 999) > qp.budgetMax) return false;
        return true;
      });

      // map → DB payload
      const items: RestaurantUpsertInput[] = filtered.map((r) => ({
        placeId: r.place_id,
        name: r.name,
        address: r.formatted_address ?? "",
        lat: r.geometry?.location?.lat ?? 0,
        lng: r.geometry?.location?.lng ?? 0,
        rating: r.rating,
        priceLevel: r.price_level,
        userRatingsTotal: r.user_ratings_total,
        source: "google",
        fetchedAt: new Date(),
      }));

      // WWE-43: upsert cache and get internal IDs
      let savedRestaurants: Awaited<ReturnType<typeof this.service.createOrUpdateMany>> = [];
      if (items.length) {
        savedRestaurants = await this.service.createOrUpdateMany(items);
      }

      return withCORS(NextResponse.json({
        count: savedRestaurants.length,
        items: savedRestaurants.map((r) => ({
          id: r.id, // Internal database ID (cuid)
          placeId: r.placeId, // Google Place ID
          name: r.name,
          address: r.address,
          rating: r.rating ?? null,
          price: r.priceLevel ?? null,
          location: { lat: r.lat, lng: r.lng },
          userRatingsTotal: r.userRatingsTotal ?? null,
        })),
      }, { status: 200 }), origin);
    } catch (err: unknown) {
      const message = this.toMessage(err, "Failed to fetch restaurants");
      return withCORS(NextResponse.json({ error: message }, { status: 500 }), origin);
    }
  }

  // POST /api/restaurants (bulk upsert)
  async post(req: NextRequest) {
    const origin = req.headers.get('origin');
    
    try {
      const body = await req.json();
      const parsed = upsertManySchema.parse(body);
      const result = await this.service.createOrUpdateMany(parsed.items);
      return withCORS(NextResponse.json({ upserted: result.length }, { status: 200 }), origin);
    } catch (err: unknown) {
      const message = this.toMessage(err, "Failed to save restaurants");
      return withCORS(NextResponse.json({ error: message }, { status: 400 }), origin);
    }
  }

  async options(req: NextRequest) {
    const origin = req.headers.get('origin');
    return preflight('GET, POST, OPTIONS', origin);
  }
}

// -------- Wire up --------
const controller = new RestaurantsController(new RestaurantService());
export async function GET(req: NextRequest) { return controller.get(req); }
export async function POST(req: NextRequest) { return controller.post(req); }
export async function OPTIONS(req: NextRequest) { return controller.options(req); }
