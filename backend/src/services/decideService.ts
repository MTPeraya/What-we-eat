import prisma from "@/lib/db"; // ถ้าโปรเจ็กต์คุณ export เป็น { prisma } ให้แก้บรรทัดนี้
// import { prisma } from "@/lib/db";

type TallyRow = {
  restaurantId: string;
  accept: number;
  reject: number;
  approval: number;  // 0..1
  netScore: number;  // accept - reject
};

const NO_REPEAT_LAST_N = 5; // กันซ้ำจากประวัติห้อง N ครั้งล่าสุด

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

/** รวมคะแนนโหวตต่อห้อง (ใช้แล้วใน tie-break) */
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

/** ตัดสินผู้ชนะ: คะแนน → (ถ้ามี center) ระยะ → rating → ไม่ซ้ำใน history ล่าสุด */
export async function finalDecide(
  roomId: string,
  center?: { lat: number; lng: number }
) {
  // 1) รวมคะแนน
  const scores = await tallyVotesByRoom(roomId);
  if (!scores.length) {
    return { winner: null as null, reason: { rule: "no-candidates" as const }, scores: [] };
  }

  // 2) ดึงข้อมูลร้านของผู้ท้าชิง
  const restaurants = await prisma.restaurant.findMany({
    where: { id: { in: scores.map(s => s.restaurantId) } },
    select: { id: true, name: true, address: true, lat: true, lng: true, rating: true },
  });
  const byId = new Map(restaurants.map(r => [r.id, r]));

  // 3) no-repeat set: ร้านที่ถูกเลือกไปแล้วล่าสุด N ครั้งของห้อง
  const recent = await prisma.mealHistory.findMany({
    where: { roomId },
    orderBy: { decidedAt: "desc" },
    take: NO_REPEAT_LAST_N,
    select: { restaurantId: true },
  });
  const noRepeat = new Set(recent.map(x => x.restaurantId));

  // 4) จัดอันดับขั้นสุดท้าย
  const ranked = scores.slice().sort((a, b) => {
    // จากคะแนนรวม (netScore → approval → accept)
    const base = b.netScore - a.netScore || b.approval - a.approval || b.accept - a.accept;
    if (base !== 0) return base;

    const ra = byId.get(a.restaurantId);
    const rb = byId.get(b.restaurantId);

    // (1) ระยะทาง (ถ้ามี center)
    if (center && ra && rb) {
      const da = haversineDistance(center.lat, center.lng, ra.lat, ra.lng);
      const db = haversineDistance(center.lat, center.lng, rb.lat, rb.lng);
      if (da !== db) return da - db; // ใกล้ชนะ
    }

    // (2) rating สูงชนะ
    const ratingA = ra?.rating ?? 0;
    const ratingB = rb?.rating ?? 0;
    if (ratingA !== ratingB) return ratingB - ratingA;

    // (3) no-repeat ล่าสุด: ตัวที่ "ไม่อยู่ในชุดล่าสุด" ชนะ
    const aIn = noRepeat.has(a.restaurantId);
    const bIn = noRepeat.has(b.restaurantId);
    if (aIn !== bIn) return aIn ? 1 : -1;

    return 0;
  });

  const top = ranked[0]!;
  const winner = byId.get(top.restaurantId)!;

  return {
    winner: {
      restaurantId: winner.id,
      name: winner.name,
      address: winner.address,
      lat: winner.lat,
      lng: winner.lng,
      rating: winner.rating ?? null,
      netScore: top.netScore,
      approval: top.approval,
    },
    reason: {
      rule: center ? "score→distance→rating→noRepeat" as const : "score→rating→noRepeat" as const,
      noRepeatLastN: NO_REPEAT_LAST_N,
      usedCenter: !!center,
    },
    scores: ranked,
  };
}

/** บันทึกลงประวัติ (สำหรับสมาชิกที่มี userId) */
export async function writeMealHistory(roomId: string, restaurantId: string) {
  const members = await prisma.roomParticipant.findMany({
    where: { roomId, userId: { not: null } },
    select: { userId: true },
  });
  if (!members.length) return;

  await prisma.$transaction(
    members.map(m =>
      prisma.mealHistory.create({
        data: { userId: m.userId!, roomId, restaurantId },
      })
    )
  );
}
