import { prisma } from "@/lib/db"; // ปรับ path ให้ตรงโปรเจกต์ของคุณ

export type VoteTallyRow = {
  restaurantId: string;
  accept: number;
  reject: number;
  approval: number; // 0..1
  netScore: number; // accept - reject
};

export async function tallyVotesByRoom(roomId: string): Promise<VoteTallyRow[]> {
  // ถ้า schema ใหม่: restaurantId เป็น string (ไม่ null) + มี value แน่นอน
  const votes = await prisma.vote.findMany({
    where: { roomId },
    select: { restaurantId: true, value: true },
  });
  // 👉 หากคุณยังไม่ reset DB และ restaurantId ยังมีสิทธิ์เป็น null อยู่
  // ให้เปิดคอมเมนต์บรรทัดล่างแทน:
  // const votes = await prisma.vote.findMany({
  //   where: { roomId, restaurantId: { not: null } },
  //   select: { restaurantId: true, value: true },
  // });

  const map = new Map<string, { accept: number; reject: number }>();

  for (const v of votes) {
    const key = v.restaurantId; // เป็น string แน่นอนถ้า schema ใหม่
    if (!map.has(key)) map.set(key, { accept: 0, reject: 0 });
    const agg = map.get(key)!;
    if (v.value === "ACCEPT") agg.accept += 1;
    else agg.reject += 1;
  }

  const rows: VoteTallyRow[] = [];
  for (const [restaurantId, { accept, reject }] of map.entries()) {
    const total = accept + reject;
    rows.push({
      restaurantId,
      accept,
      reject,
      approval: total > 0 ? accept / total : 0,
      netScore: accept - reject,
    });
  }

  // เรียงลำดับ: netScore > approval > accept
  rows.sort(
    (a, b) =>
      b.netScore - a.netScore ||
      b.approval - a.approval ||
      b.accept - a.accept
  );

  return rows;
}
