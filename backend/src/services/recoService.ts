import prisma from "@/lib/db";
import { fetchNearbyRestaurants, ProviderRestaurant } from "./providers/localProvider";

// ===== In-memory cache (MVP) =====
type CacheItem = { data: ProviderRestaurant[]; expireAt: number };
const cache = new Map<string, CacheItem>();
const TTL_MS_DEFAULT = 10 * 60 * 1000; // 10 min

function cacheKey(roomId: string) {
  return `cand:${roomId}`;
}

export function clearCandidatesCache(roomId: string) {
  cache.delete(cacheKey(roomId));
}

function getCached(roomId: string) {
  const k = cacheKey(roomId);
  const c = cache.get(k);
  if (c && c.expireAt > Date.now()) return c.data;
  if (c) cache.delete(k);
  return null;
}

function setCached(roomId: string, data: ProviderRestaurant[], ttlMs = TTL_MS_DEFAULT) {
  cache.set(cacheKey(roomId), { data, expireAt: Date.now() + ttlMs });
}

// ===== Utils =====
function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371e3;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); // meters
}

// ===== Main: candidates + scoring =====
const REPEAT_COOLDOWN_DAYS = Number(process.env.REPEAT_COOLDOWN_DAYS ?? 14);

export type Candidate = ProviderRestaurant & {
  score: number;
  reasons: string[];
  distanceM?: number;
};

export async function buildCandidates(params: {
  roomId: string;
  center?: { lat: number; lng: number };
  limit?: number;            // Number to return
  providerLimit?: number;    // Number to fetch from provider
  cacheTtlMs?: number;
}): Promise<Candidate[]> {
  const { roomId, center, limit = 30, providerLimit = 120, cacheTtlMs } = params;

  try {
    // 1) caching candidates (provider level)
    let list = getCached(roomId);
    if (!list) {
      console.log("[buildCandidates] Fetching restaurants from provider", { roomId, center, limit: providerLimit });
      try {
        // Only fetch from provider if center is provided
        if (center?.lat != null && center?.lng != null) {
          list = await fetchNearbyRestaurants({ center, limit: providerLimit });
          console.log("[buildCandidates] Fetched", list.length, "restaurants");
        } else {
          console.warn("[buildCandidates] No center provided, using fallback or cached data");
          // Try to get fallback from DB if center not provided
          if (process.env.FALLBACK_TO_SEEDED === "true") {
            const fallbackRows = await prisma.restaurant.findMany({
              take: providerLimit,
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
            list = fallbackRows.map((r) => ({
              id: r.id,
              name: r.name,
              address: r.address,
              lat: Number(r.lat),
              lng: Number(r.lng),
              rating: r.rating,
              priceLevel: r.priceLevel,
              source: r.source ?? "seed",
            }));
            console.log("[buildCandidates] Using fallback DB restaurants", list.length);
          } else {
            list = [];
          }
        }
        if (list.length === 0) {
          console.warn("[buildCandidates] No restaurants found in database!");
          // Return empty array instead of throwing error
          return [];
        }
        setCached(roomId, list, cacheTtlMs ?? TTL_MS_DEFAULT);
      } catch (providerError) {
        console.error("[buildCandidates] Error fetching from provider:", providerError);
        throw new Error(`Failed to fetch restaurants: ${(providerError as Error)?.message ?? String(providerError)}`);
      }
    } else {
      console.log("[buildCandidates] Using cached restaurants", list.length);
    }

    // 2) Prepare data for penalty/no-repeat logic
    let members: Array<{ userId: string | null }>;
    try {
      members = await prisma.roomParticipant.findMany({
        where: { roomId, userId: { not: null } },
        select: { userId: true },
      });
    } catch (err) {
      console.error("[buildCandidates] Error fetching room participants:", err);
      members = [];
    }

    const userIds = members.map((m) => m.userId!).filter(Boolean);

    const cooldownSince = new Date(Date.now() - REPEAT_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
    // FIX: Initialize the array to an empty array
    let recentHistories: Array<{ restaurantId: string; userId: string | null; decidedAt: Date }> = []; 

    if (userIds.length > 0) {
      try {
        recentHistories = await prisma.mealHistory.findMany({
          where: { userId: { in: userIds }, decidedAt: { gte: cooldownSince } },
          select: { restaurantId: true, userId: true, decidedAt: true },
        });
      } catch (err) {
        console.error("[buildCandidates] Error fetching meal history:", err);
        // On error, recentHistories remains [] (from initialization), which is safe.
      }
    }

    // No-repeat within session (restaurants already suggested in this room)
    let seen: Array<{ restaurantId: string }> = [];
    try {
      seen = await prisma.roomSuggestionHistory.findMany({
        where: { roomId },
        take: 200,
        orderBy: { suggestedAt: "desc" },
        select: { restaurantId: true },
      });
    } catch (err) {
      console.error("[buildCandidates] Error fetching suggestion history:", err);
    }
    const seenSet = new Set(seen.map((x) => x.restaurantId));

    // 3) scoring v1
    if (!list || list.length === 0) {
      console.warn("[buildCandidates] No restaurants available for scoring");
      return [];
    }

    const cands: Candidate[] = list.map((r) => {
      try {
        const reasons: string[] = [];
        let score = 0;

        // base rating
        const rating = r.rating ?? 3.5;
        score += rating * 10;               // weight rating

        // distance (closer is better)
        let dist = 0;
        if (center && r.lat != null && r.lng != null) {
          dist = haversine(center.lat, center.lng, r.lat, r.lng);
          const km = dist / 1000;
          score += Math.max(0, 30 - km * 5);  // drop 5 points per km after 0km
          reasons.push(`Near ~${km.toFixed(1)}km`);
        }

        // history penalty
        const visited = recentHistories.some((h) => h.restaurantId === r.id);
        if (visited) {
          score -= 20;
          reasons.push(`Visited in last ${REPEAT_COOLDOWN_DAYS} days`);
        }

        // room-level de-dup
        if (seenSet.has(r.id)) {
          score -= 50;
          reasons.push("Already suggested in this room");
        }

        // tag reason by rating
        if (rating >= 4.3) reasons.push("Good rating");

        return { ...r, score, reasons, distanceM: dist || undefined };
      } catch (err) {
        console.error("[buildCandidates] Error processing restaurant:", r.id, err);
        // Return a default candidate with low score
        return { ...r, score: -100, reasons: ["Error processing"], distanceM: undefined };
      }
    });

    // 4) sort & take
    cands.sort((a, b) => b.score - a.score);
    const top = cands.slice(0, limit);

    // 5) Save suggestion history for this room (to prevent duplicates next round)
    if (top.length) {
      try {
        // Use createMany for better performance and error handling
        await prisma.roomSuggestionHistory.createMany({
          data: top.map((t) => ({
            roomId,
            restaurantId: t.id,
          })),
          skipDuplicates: true, // Skip if already exists
        });
      } catch (err) {
        // Ignore duplicate key errors (roomSuggestionHistory might already exist)
        console.warn("[buildCandidates] Failed to save suggestion history:", err);
      }
    }

    return top;
  } catch (error) {
    console.error("[buildCandidates] Error:", error);
    throw error;
  }
}
