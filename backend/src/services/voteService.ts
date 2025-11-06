import { prisma } from "@/lib/db";

export type VoteTallyRow = {
  restaurantId: string;
  accept: number;
  reject: number;
  approval: number; // 0..1
  netScore: number; // accept - reject
};

export async function tallyVotesByRoom(roomId: string): Promise<VoteTallyRow[]> {
  // For new schema: restaurantId is string (non-null) with guaranteed value
  const votes = await prisma.vote.findMany({
    where: { roomId },
    select: { restaurantId: true, value: true },
  });
  // 👉 If you haven't reset DB and restaurantId can still be null:
  // Uncomment below instead:
  // const votes = await prisma.vote.findMany({
  //   where: { roomId, restaurantId: { not: null } },
  //   select: { restaurantId: true, value: true },
  // });

  const map = new Map<string, { accept: number; reject: number }>();

  for (const v of votes) {
    const key = v.restaurantId; // Guaranteed to be string in new schema
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

  // Sort order: netScore > approval > accept
  rows.sort(
    (a, b) =>
      b.netScore - a.netScore ||
      b.approval - a.approval ||
      b.accept - a.accept
  );

  return rows;
}
