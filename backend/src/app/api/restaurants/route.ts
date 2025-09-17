// backend/src/app/api/restaurants/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { RestaurantService, type RestaurantUpsertInput } from "@/services/RestaurantService";

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
  q: z.string().optional().default("restaurant"),
  lat: z.coerce.number().optional().default(13.736717),
  lng: z.coerce.number().optional().default(100.523186),
  radius: z.coerce.number().optional().default(3000),
  budgetMax: z.coerce.number().optional(),
  cuisine: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
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
    try {
      const params = Object.fromEntries(req.nextUrl.searchParams.entries());
      const qp = querySchema.parse(params);

      // อ่าน key "ต่อคำขอ" ไม่ cache ไว้ที่ constructor
      const placesKey = process.env.EXTERNAL_PLACES_API_KEY;

      // ในโหมด test อนุญาตให้ไม่มี key (เพราะจะ stub fetch)
      if (!placesKey && process.env.NODE_ENV !== "test") {
        return NextResponse.json(
          { error: "Missing EXTERNAL_PLACES_API_KEY" },
          { status: 500 }
        );
      }

      const keyForCall = placesKey ?? "test"; // ใน test ไม่ถูกใช้จริงเพราะ fetch ถูก stub

      const api =
        `https://maps.googleapis.com/maps/api/place/textsearch/json` +
        `?query=${encodeURIComponent(qp.q)}` +
        `&location=${qp.lat},${qp.lng}` +
        `&radius=${qp.radius}` +
        `&key=${keyForCall}`;

      const res = await fetch(api);
      if (!res.ok) {
        return NextResponse.json(
          { error: `Google API error: ${res.status}` },
          { status: 500 }
        );
      }

      const data = (await res.json()) as GooglePlacesResponse;

      // filter
      const filtered: GooglePlaceResult[] = (data.results ?? []).filter((r) => {
        if (qp.budgetMax != null && (r.price_level ?? 999) > qp.budgetMax) return false;
        if (qp.cuisine && !r.name.toLowerCase().includes(qp.cuisine.toLowerCase())) return false;
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

      // WWE-43: upsert cache
      if (items.length) await this.service.createOrUpdateMany(items);

      return NextResponse.json({
        count: items.length,
        items: items.map((i) => ({
          id: i.placeId,
          name: i.name,
          address: i.address,
          rating: i.rating ?? null,
          price: i.priceLevel ?? null,
          location: { lat: i.lat, lng: i.lng },
          userRatingsTotal: i.userRatingsTotal ?? null,
        })),
      }, { status: 200 });
    } catch (err: unknown) {
      const message = this.toMessage(err, "Failed to fetch restaurants");
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  // POST /api/restaurants (bulk upsert)
  async post(req: NextRequest) {
    try {
      const body = await req.json();
      const parsed = upsertManySchema.parse(body);
      const result = await this.service.createOrUpdateMany(parsed.items);
      return NextResponse.json({ upserted: result.length }, { status: 200 });
    } catch (err: unknown) {
      const message = this.toMessage(err, "Failed to save restaurants");
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  async options() {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }
}

// -------- Wire up --------
const controller = new RestaurantsController(new RestaurantService());
export async function GET(req: NextRequest) { return controller.get(req); }
export async function POST(req: NextRequest) { return controller.post(req); }
export async function OPTIONS() { return controller.options(); }
