import prisma from "@/lib/db";

// ===== Types =====
export type TallyRow = {
  restaurantId: string;
  accept: number;
  reject: number;
  approval: number; // 0..1
  netScore: number; // accept - reject
};

export type FinalDecideResult = {
  winner: {
    restaurantId: string;
    name: string;
    address: string | null;
    lat: number;
    lng: number;
    rating: number | null;
    netScore: number;
    approval: number;
  } | null;
  reason:
    | { rule: "no-candidates" }
    | {
        rule:
          | "score→distance→rating→noRepeat"
          | "score→rating→noRepeat";
        noRepeatLastN: number;
        usedCenter: boolean;
      };
  scores: TallyRow[];       // Sorted from best to worst
  decidedAt?: string;       // ISO string (added for route usage)
};

const NO_REPEAT_LAST_N = 5; // Prevent repeat from room's last N history entries

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371e3; // meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Tally votes by room (used in tie-break logic) */
export async function tallyVotesByRoom(roomId: string): Promise<TallyRow[]> {
  const votes = await prisma.vote.findMany({
    where: { roomId },
    select: { restaurantId: true, value: true },
  });

  const map = new Map<string, { accept: number; reject: number }>();
  for (const v of votes) {
    const agg = map.get(v.restaurantId) ?? { accept: 0, reject: 0 };
    if (v.value === "ACCEPT") agg.accept += 1;
    else agg.reject += 1;
    map.set(v.restaurantId, agg);
  }

  const rows: TallyRow[] = [];
  for (const [restaurantId, { accept, reject }] of map.entries()) {
    const total = accept + reject;
    rows.push({
      restaurantId,
      accept,
      reject,
      approval: total ? accept / total : 0,
      netScore: accept - reject,
    });
  }

  rows.sort(
    (a, b) =>
      b.netScore - a.netScore ||
      b.approval - a.approval ||
      b.accept - a.accept
  );
  return rows;
}

/** Decide winner: score → (if center) distance → rating → no-repeat from recent history */
export async function finalDecide(
  roomId: string,
  center?: { lat: number; lng: number }
): Promise<FinalDecideResult> {
  // 1) Tally scores
  const scores = await tallyVotesByRoom(roomId);
  if (!scores.length) {
    return { winner: null, reason: { rule: "no-candidates" }, scores: [] };
  }

  // 2) Fetch restaurant data for candidates
  const restaurants = await prisma.restaurant.findMany({
    where: { id: { in: scores.map((s) => s.restaurantId) } },
    select: {
      id: true,
      name: true,
      address: true,
      lat: true,
      lng: true,
      rating: true,
    },
  });
  const byId = new Map(restaurants.map((r) => [r.id, r]));

  // 3) no-repeat set: restaurants selected in last N times for this room
  const recent = await prisma.mealHistory.findMany({
    where: { roomId },
    orderBy: { decidedAt: "desc" },
    take: NO_REPEAT_LAST_N,
    select: { restaurantId: true },
  });
  const noRepeat = new Set(recent.map((x) => x.restaurantId));

  // 4) Final ranking with tie-break rules
  const ranked = scores.slice().sort((a, b) => {
    // Base score comparison (netScore → approval → accept)
    const base =
      b.netScore - a.netScore ||
      b.approval - a.approval ||
      b.accept - a.accept;
    if (base !== 0) return base;

    const ra = byId.get(a.restaurantId);
    const rb = byId.get(b.restaurantId);

    // (1) Distance (if center provided and restaurants have coordinates)
    if (
      center &&
      ra?.lat != null &&
      ra?.lng != null &&
      rb?.lat != null &&
      rb?.lng != null
    ) {
      const da = haversineDistance(center.lat, center.lng, ra.lat, ra.lng);
      const db = haversineDistance(center.lat, center.lng, rb.lat, rb.lng);
      if (da !== db) return da - db; // Closer wins
    }

    // (2) Higher rating wins
    const ratingA = ra?.rating ?? 0;
    const ratingB = rb?.rating ?? 0;
    if (ratingA !== ratingB) return ratingB - ratingA;

    // (3) no-repeat: restaurant "not in recent set" wins
    const aIn = noRepeat.has(a.restaurantId);
    const bIn = noRepeat.has(b.restaurantId);
    if (aIn !== bIn) return aIn ? 1 : -1;

    return 0;
  });

  const top = ranked[0]!;
  const winner = byId.get(top.restaurantId)!;

  const decidedAtISO = new Date().toISOString();

  return {
    winner: {
      restaurantId: winner.id,
      name: winner.name,
      address: winner.address ?? null,
      lat: Number(winner.lat),
      lng: Number(winner.lng),
      rating: winner.rating ?? null,
      netScore: top.netScore,
      approval: top.approval,
    },
    reason: {
      rule: center
        ? "score→distance→rating→noRepeat"
        : "score→rating→noRepeat",
      noRepeatLastN: NO_REPEAT_LAST_N,
      usedCenter: !!center,
    },
    scores: ranked,
    decidedAt: decidedAtISO, // ✅ Added for route emit/response
  };
}

/** Write to meal history (for members with userId) */
export async function writeMealHistory(roomId: string, restaurantId: string) {
  const decidedAt = new Date(); // Ensure value is set
  const members = await prisma.roomParticipant.findMany({
    where: { roomId, userId: { not: null } },
    select: { userId: true },
  });
  if (!members.length) return;

  await prisma.$transaction(
    members.map((m) =>
      prisma.mealHistory.create({
        data: { userId: m.userId!, roomId, restaurantId, decidedAt },
      })
    )
  );
}
