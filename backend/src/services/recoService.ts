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

  // 1) caching candidates (provider level)
  let list = getCached(roomId);
  if (!list) {
    list = await fetchNearbyRestaurants({ center, limit: providerLimit });
    setCached(roomId, list, cacheTtlMs ?? TTL_MS_DEFAULT);
  }

  // 2) Prepare data for penalty/no-repeat logic
  const members = await prisma.roomParticipant.findMany({
    where: { roomId, userId: { not: null } },
    select: { userId: true },
  });

  const userIds = members.map((m) => m.userId!) || [];

  const cooldownSince = new Date(Date.now() - REPEAT_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
  const recentHistories = userIds.length
    ? await prisma.mealHistory.findMany({
        where: { userId: { in: userIds }, decidedAt: { gte: cooldownSince } },
        select: { restaurantId: true, userId: true, decidedAt: true },
      })
    : [];

  // No-repeat within session (restaurants already suggested in this room)
  const seen = await prisma.roomSuggestionHistory.findMany({
    where: { roomId },
    take: 200,
    orderBy: { suggestedAt: "desc" },
    select: { restaurantId: true },
  });
  const seenSet = new Set(seen.map((x) => x.restaurantId));

  // 3) scoring v1
  const cands: Candidate[] = list.map((r) => {
    const reasons: string[] = [];
    let score = 0;

    // base rating
    const rating = r.rating ?? 3.5;
    score += rating * 10;               // weight rating

    // distance (closer is better)
    let dist = 0;
    if (center) {
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
  });

  // 4) sort & take
  cands.sort((a, b) => b.score - a.score);
  const top = cands.slice(0, limit);

  // 5) Save suggestion history for this room (to prevent duplicates next round)
  if (top.length) {
    await prisma.$transaction(
      top.map((t) =>
        prisma.roomSuggestionHistory.create({
          data: { roomId, restaurantId: t.id },
        })
      )
    );
  }

  return top;
}
