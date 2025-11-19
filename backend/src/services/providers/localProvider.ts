import { RestaurantService, type RestaurantUpsertInput } from "@/services/RestaurantService";
import prisma from "@/lib/db";

export type ProviderRestaurant = {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  rating: number | null;
  priceLevel: number | null;
  source: string;
  distanceM?: number;
};

type GooglePlaceResult = {
  place_id: string;
  name: string;
  formatted_address?: string;
  geometry?: { location?: { lat: number; lng: number } };
  rating?: number;
  price_level?: number;
  user_ratings_total?: number;
};

type GooglePlacesResponse = {
  results?: GooglePlaceResult[];
  next_page_token?: string;
  status?: string;
};

const GOOGLE_BASE_URL = "https://maps.googleapis.com/maps/api/place/nearbysearch/json";
const MAX_RADIUS_M = 50_000; // Google Nearby capped at 50km
const WAIT_MS_FOR_NEXT_PAGE = 2000;
const EXCLUDED_KEYWORDS = ["hotel", "resort", "lodge", "inn", "hostel", "motel"];
const restaurantService = new RestaurantService();

function haversineMeters(lat1: number, lon1: number, lat2?: number | null, lon2?: number | null) {
  if (
    lat2 == null ||
    lon2 == null ||
    Number.isNaN(lat2) ||
    Number.isNaN(lon2)
  ) {
    return undefined;
  }
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371e3;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); // meters
}

function filterPlacesByBudget(place: GooglePlaceResult, budgetMax?: number) {
  if (budgetMax == null) return true;
  const price = place.price_level ?? 999;
  return price <= budgetMax;
}

function isRestaurant(place: GooglePlaceResult) {
  const lowerName = place.name?.toLowerCase() ?? "";
  return !EXCLUDED_KEYWORDS.some((kw) => lowerName.includes(kw));
}

async function fetchPlacesPage(params: URLSearchParams) {
  const res = await fetch(`${GOOGLE_BASE_URL}?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Google Places error: ${res.status}`);
  }
  return (await res.json()) as GooglePlacesResponse;
}

async function fetchFromGoogle(params: {
  center: { lat: number; lng: number };
  providerTake: number;
  radius: number;
  keyword?: string;
  budgetMax?: number;
}) {
  const key = process.env.EXTERNAL_PLACES_API_KEY;
  if (!key) {
    throw new Error("Missing EXTERNAL_PLACES_API_KEY");
  }

  const { center, providerTake, radius, keyword, budgetMax } = params;
  const collected: GooglePlaceResult[] = [];
  let pageToken: string | undefined;

  while (collected.length < providerTake) {
    const search = new URLSearchParams({
      location: `${center.lat},${center.lng}`,
      radius: radius.toString(),
      type: "restaurant",
      key,
    });
    if (keyword) search.set("keyword", keyword);
    if (pageToken) search.set("pagetoken", pageToken);

    const data = await fetchPlacesPage(search);

    const filtered =
      data.results?.filter((r) => isRestaurant(r) && filterPlacesByBudget(r, budgetMax)) ?? [];
    collected.push(...filtered);

    if (!data.next_page_token || collected.length >= providerTake) {
      break;
    }

    pageToken = data.next_page_token;
    await new Promise((resolve) => setTimeout(resolve, WAIT_MS_FOR_NEXT_PAGE));
  }

  const uniqueByPlace = new Map<string, GooglePlaceResult>();
  for (const place of collected) {
    if (!place.place_id) continue;
    if (!uniqueByPlace.has(place.place_id)) {
      uniqueByPlace.set(place.place_id, place);
    }
  }

  const upsertPayload: RestaurantUpsertInput[] = [];
  for (const place of uniqueByPlace.values()) {
    const lat = place.geometry?.location?.lat;
    const lng = place.geometry?.location?.lng;
    if (lat == null || lng == null) continue;
    upsertPayload.push({
      placeId: place.place_id,
      name: place.name,
      address: place.formatted_address ?? "",
      lat,
      lng,
      rating: place.rating,
      priceLevel: place.price_level,
      userRatingsTotal: place.user_ratings_total,
      source: "google",
      fetchedAt: new Date(),
    });
  }

  if (!upsertPayload.length) return [];

  const saved = await restaurantService.createOrUpdateMany(upsertPayload);
  return saved.map((r) => ({
    id: r.id,
    name: r.name,
    address: r.address,
    lat: Number(r.lat),
    lng: Number(r.lng),
    rating: r.rating,
    priceLevel: r.priceLevel,
    source: r.source ?? "google",
  }));
}

export async function fetchNearbyRestaurants(params: {
  center?: { lat: number; lng: number };
  limit?: number;
  keyword?: string;
  budgetMax?: number;
}): Promise<ProviderRestaurant[]> {
  try {
    const requestedLimit = params.limit ?? 80;
    const providerTake = Math.max(requestedLimit * 2, 60);
    const radiusEnv = Number(process.env.RECO_RADIUS_METERS ?? 5000);
    const radiusMeters = Math.min(Math.max(radiusEnv, 1000), MAX_RADIUS_M);
    const center = params.center;

    console.log("[fetchNearbyRestaurants] Starting fetch", {
      center,
      limit: requestedLimit,
      providerTake,
      radiusMeters,
      keyword: params.keyword,
      budgetMax: params.budgetMax,
    });

    if (!center) {
      throw new Error("CENTER_REQUIRED");
    }

    let rows = await fetchFromGoogle({
      center,
      providerTake,
      radius: radiusMeters,
      keyword: params.keyword,
      budgetMax: params.budgetMax,
    });

    if ((!rows || rows.length === 0) && process.env.FALLBACK_TO_SEEDED === "true") {
      console.warn("[fetchNearbyRestaurants] Google returned no rows, falling back to DB cache");
      const fallbackRows = await prisma.restaurant.findMany({
        take: providerTake,
        orderBy: [{ rating: "desc" }, { userRatingsTotal: "desc" }],
        select: {
          id: true,
          name: true,
          address: true,
          lat: true,
          lng: true,
          rating: true,
          priceLevel: true,
          source: true,
        },
      });
      rows = fallbackRows.map((r) => ({
        id: r.id,
        name: r.name,
        address: r.address,
        lat: Number(r.lat),
        lng: Number(r.lng),
        rating: r.rating,
        priceLevel: r.priceLevel,
        source: r.source ?? "seed",
      }));
    }

    if (!rows || rows.length === 0) {
      console.warn("[fetchNearbyRestaurants] No restaurants found from provider");
      return [];
    }

    const mapped = rows
      .map((r) => {
        const lat = Number(r.lat);
        const lng = Number(r.lng);
        const distanceM =
          center && !Number.isNaN(lat) && !Number.isNaN(lng)
            ? haversineMeters(center.lat, center.lng, lat, lng)
            : undefined;

        return {
          id: r.id,
          name: r.name,
          address: r.address ?? "",
          lat,
          lng,
          rating: r.rating ?? null,
          priceLevel: r.priceLevel ?? null,
          source: r.source,
          distanceM,
        } as ProviderRestaurant;
      })
      .filter((r) => !Number.isNaN(r.lat) && !Number.isNaN(r.lng));

    mapped.sort((a, b) => {
      const da = a.distanceM ?? Number.POSITIVE_INFINITY;
      const db = b.distanceM ?? Number.POSITIVE_INFINITY;
      if (da !== db) return da - db;
      const ratingA = a.rating ?? 0;
      const ratingB = b.rating ?? 0;
      if (ratingA !== ratingB) return ratingB - ratingA;
      return (b.priceLevel ?? 0) - (a.priceLevel ?? 0);
    });

    const result = mapped.slice(0, requestedLimit);
    console.log("[fetchNearbyRestaurants] Returning", result.length, "restaurants");
    return result;
  } catch (error) {
    const errorMsg = (error as Error)?.message ?? String(error);
    const errorStack = (error as Error)?.stack;
    console.error("[fetchNearbyRestaurants] Error:", {
      message: errorMsg,
      stack: errorStack,
      params,
    });
    throw new Error(`fetchNearbyRestaurants failed: ${errorMsg}`);
  }
}
