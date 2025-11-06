import { describe, expect, it } from "vitest";
// import { tallyVotesByRoom } from "../../services/voteService";


// Assume you separate the "tally logic" from the prisma layer for easier testing
// This example mocks data "after fetching from prisma" and feeds it to the tally function
// If you stick with the real file approach (calling prisma inside), extract a pure function layer

// ===== voteService.test.ts =====
type TallyInput = { restaurantId: string; value: 'ACCEPT' | 'REJECT' };

function combine(votes: TallyInput[]) {
  const map = new Map<string, { accept: number; reject: number }>();

  for (const v of votes) {
    if (!map.has(v.restaurantId)) map.set(v.restaurantId, { accept: 0, reject: 0 });
    const agg = map.get(v.restaurantId)!;
    if (v.value === 'ACCEPT') {
      agg.accept += 1;
    } else {
      agg.reject += 1;
    }
  }

  const rows = [...map.entries()].map(([restaurantId, { accept, reject }]) => {
    const total = accept + reject;
    const approval = total > 0 ? accept / total : 0;
    return { restaurantId, accept, reject, approval, netScore: accept - reject };
  });

  rows.sort(
    (a, b) =>
      b.netScore - a.netScore ||
      b.approval - a.approval ||
      b.accept - a.accept
  );
  return rows;
}

describe('vote tally logic', () => {
  it('calculates approval and netScore per restaurant', () => {
    const rows = combine([
      { restaurantId: 'A', value: 'ACCEPT' },
      { restaurantId: 'A', value: 'REJECT' },
      { restaurantId: 'A', value: 'ACCEPT' },
      { restaurantId: 'B', value: 'REJECT' },
      { restaurantId: 'B', value: 'REJECT' },
      { restaurantId: 'B', value: 'ACCEPT' },
    ]);

    const A = rows.find(r => r.restaurantId === 'A')!;
    const B = rows.find(r => r.restaurantId === 'B')!;
    expect(A.accept).toBe(2);
    expect(A.reject).toBe(1);
    expect(A.netScore).toBe(1);
    expect(A.approval).toBeCloseTo(2 / 3, 5);
    expect(B.accept).toBe(1);
    expect(B.reject).toBe(2);
    expect(B.netScore).toBe(-1);
    expect(B.approval).toBeCloseTo(1 / 3, 5);
  });

  it('sorts by netScore > approval > accept', () => {
    const rows = combine([
      { restaurantId: 'X', value: 'ACCEPT' },
      { restaurantId: 'Y', value: 'ACCEPT' },
      { restaurantId: 'Y', value: 'REJECT' },
    ]);
    expect(rows[0].restaurantId).toBe('X');
  });

  it('handles empty votes', () => {
    const rows = combine([]);
    expect(rows).toEqual([]);
  });
});
