import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

// ---- mocks ----
const mockPrisma = {
  roomParticipant: { findFirst: vi.fn() },
  mealHistory: { findFirst: vi.fn() },
  restaurant: { findUnique: vi.fn() },
};
vi.mock('@/lib/db', () => ({ default: mockPrisma }));

const mockAuth = { requireAuth: vi.fn() };
// แก้ path ให้ตรงโปรเจ็กต์คุณ ถ้าเก็บไว้ "@/lib/session" ให้เปลี่ยนเป็น path นั้น
vi.mock('@/lib/auth', () => mockAuth);

const mockDecide = {
  finalDecide: vi.fn(),
  writeMealHistory: vi.fn(),
};
vi.mock('@/services/decideService', () => mockDecide);

// import หลัง mock
import { POST, GET } from '../../app/api/rooms/[roomId]/decide/final/route';

const makeCtx = (roomId: string): { params: Promise<{ roomId: string }> } => ({
  params: Promise.resolve({ roomId }),
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/rooms/[roomId]/decide/final', () => {
  it('200 เมื่อเป็นสมาชิกห้อง และเรียก writeMealHistory', async () => {
    mockAuth.requireAuth.mockResolvedValue({ userId: 'u1' });
    mockPrisma.roomParticipant.findFirst.mockResolvedValue({ id: 'p1' });
    mockDecide.finalDecide.mockResolvedValue({
      winner: {
        restaurantId: 'A',
        name: 'A',
        address: 'x',
        lat: 0,
        lng: 0,
        rating: 4.5,
        netScore: 1,
        approval: 0.66,
      },
      reason: { rule: 'score→rating→noRepeat', noRepeatLastN: 5, usedCenter: false },
      scores: [{ restaurantId: 'A', accept: 2, reject: 1, approval: 0.66, netScore: 1 }],
    });

    // ใช้ Request ปกติ แล้ว cast เป็น NextRequest เพื่อหลีกเลี่ยง any
    const req = new Request('http://test.local', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }) as unknown as NextRequest;

    const res = await POST(req, makeCtx('r1'));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.winner.restaurantId).toBe('A');
    expect(mockDecide.writeMealHistory).toHaveBeenCalledWith('r1', 'A');
  });

  it('403 เมื่อไม่เป็นสมาชิก', async () => {
    mockAuth.requireAuth.mockResolvedValue({ userId: 'u1' });
    mockPrisma.roomParticipant.findFirst.mockResolvedValue(null);

    const req = new Request('http://test.local', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }) as unknown as NextRequest;

    const res = await POST(req, makeCtx('r1'));

    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe('FORBIDDEN_NOT_MEMBER');
  });

  it('401 เมื่อไม่ได้ล็อกอิน', async () => {
    mockAuth.requireAuth.mockImplementation(() => {
      throw new Error('UNAUTHENTICATED');
    });

    const req = new Request('http://test.local', {
      method: 'POST',
      body: JSON.stringify({}),
    }) as unknown as NextRequest;

    const res = await POST(req, makeCtx('r1'));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe('UNAUTHENTICATED');
  });
});

describe('GET /api/rooms/[roomId]/decide/final', () => {
  it('คืน winner ล่าสุดของห้อง', async () => {
    const decidedAt = new Date();
    mockPrisma.mealHistory.findFirst.mockResolvedValue({ restaurantId: 'A', decidedAt });
    mockPrisma.restaurant.findUnique.mockResolvedValue({
      id: 'A',
      name: 'A',
      address: 'x',
      lat: 1,
      lng: 2,
      rating: 4.4,
    });

    const res = await GET(new Request('http://test.local') as unknown as NextRequest, makeCtx('r1'));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.winner.name).toBe('A');
    expect(new Date(json.decidedAt).getTime()).toBe(decidedAt.getTime());
  });

  it('ถ้าไม่มีประวัติ → winner = null', async () => {
    mockPrisma.mealHistory.findFirst.mockResolvedValue(null);

    const res = await GET(new Request('http://test.local') as unknown as NextRequest, makeCtx('r1'));
    expect(res.status).toBe(200);
    expect((await res.json()).winner).toBeNull();
  });
});
