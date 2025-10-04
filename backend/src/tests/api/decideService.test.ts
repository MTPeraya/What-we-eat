import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------- HOISTED MOCKS ----------
const { prismaMock } = vi.hoisted(() => {
  return {
    prismaMock: {
      vote: { findMany: vi.fn() },
      restaurant: { findMany: vi.fn() },
      mealHistory: { findMany: vi.fn() },
      $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
    },
  };
});

vi.mock('@/lib/db', () => ({ default: prismaMock }));

// ---------- IMPORTS *หลัง* mock ----------
import { tallyVotesByRoom, finalDecide } from '../../services/decideService';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('tallyVotesByRoom', () => {
  it('รวม accept/reject และคำนวณ approval, netScore ถูกต้อง', async () => {
    prismaMock.vote.findMany.mockResolvedValue([
      { restaurantId: 'A', value: 'ACCEPT' },
      { restaurantId: 'A', value: 'REJECT' },
      { restaurantId: 'A', value: 'ACCEPT' },
      { restaurantId: 'B', value: 'REJECT' },
      { restaurantId: 'B', value: 'REJECT' },
      { restaurantId: 'B', value: 'ACCEPT' },
    ]);

    const rows = await tallyVotesByRoom('room-1');
    const A = rows.find((r) => r.restaurantId === 'A')!;
    const B = rows.find((r) => r.restaurantId === 'B')!;

    expect(A.accept).toBe(2);
    expect(A.reject).toBe(1);
    expect(A.netScore).toBe(1);
    expect(A.approval).toBeCloseTo(2 / 3);

    expect(B.accept).toBe(1);
    expect(B.reject).toBe(2);
    expect(B.netScore).toBe(-1);
    expect(B.approval).toBeCloseTo(1 / 3);
  });

  it('คืนลิสต์ว่างเมื่อยังไม่มีโหวต', async () => {
    prismaMock.vote.findMany.mockResolvedValue([]);
    const rows = await tallyVotesByRoom('room-1');
    expect(rows).toEqual([]);
  });
});

describe('finalDecide (tie-breakers)', () => {
  it('คะแนนเท่ากัน + มี center → เลือกร้านที่ใกล้กว่า', async () => {
    prismaMock.vote.findMany.mockResolvedValue([
      { restaurantId: 'A', value: 'ACCEPT' },
      { restaurantId: 'B', value: 'ACCEPT' },
    ]);
    prismaMock.restaurant.findMany.mockResolvedValue([
      { id: 'A', name: 'A', address: 'a', lat: 13.736, lng: 100.532, rating: 4.3 },
      { id: 'B', name: 'B', address: 'b', lat: 13.746, lng: 100.542, rating: 5.0 },
    ]);
    prismaMock.mealHistory.findMany.mockResolvedValue([]);

    const result = await finalDecide('room-1', { lat: 13.7361, lng: 100.5321 });

    expect(result.winner).not.toBeNull();
    expect(result.winner!.restaurantId).toBe('A'); // ใกล้กว่า
    expect(result.reason.usedCenter).toBe(true);
  });

  it('ไม่มี center → ใช้ rating สูงกว่า', async () => {
    prismaMock.vote.findMany.mockResolvedValue([
      { restaurantId: 'A', value: 'ACCEPT' },
      { restaurantId: 'B', value: 'ACCEPT' },
    ]);
    prismaMock.restaurant.findMany.mockResolvedValue([
      { id: 'A', name: 'A', address: 'a', lat: 0, lng: 0, rating: 4.1 },
      { id: 'B', name: 'B', address: 'b', lat: 0, lng: 0, rating: 4.7 },
    ]);
    prismaMock.mealHistory.findMany.mockResolvedValue([]);

    const result = await finalDecide('room-1');

    expect(result.winner).not.toBeNull();
    expect(result.winner!.restaurantId).toBe('B');
    expect(result.reason.usedCenter).toBe(false);
  });

  it('rating เท่ากัน → ตัดร้านที่ซ้ำใน history ล่าสุด', async () => {
    prismaMock.vote.findMany.mockResolvedValue([
      { restaurantId: 'A', value: 'ACCEPT' },
      { restaurantId: 'B', value: 'ACCEPT' },
    ]);
    prismaMock.restaurant.findMany.mockResolvedValue([
      { id: 'A', name: 'A', address: 'a', lat: 0, lng: 0, rating: 4.5 },
      { id: 'B', name: 'B', address: 'b', lat: 0, lng: 0, rating: 4.5 },
    ]);
    prismaMock.mealHistory.findMany.mockResolvedValue([{ restaurantId: 'B' }]);

    const result = await finalDecide('room-1');

    expect(result.winner).not.toBeNull();
    expect(result.winner!.restaurantId).toBe('A');
  });

  it('ไม่มีโหวต → winner = null', async () => {
    prismaMock.vote.findMany.mockResolvedValue([]);
    const result = await finalDecide('room-1');
    expect(result.winner).toBeNull();
  });
});
