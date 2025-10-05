import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

// ---------- HOISTED MOCKS ----------
const { prismaMock, authMock, decideMock } = vi.hoisted(() => {
  return {
    prismaMock: {
      roomParticipant: { findFirst: vi.fn() },
      mealHistory: { findFirst: vi.fn() },
      restaurant: { findUnique: vi.fn() },
    },
    authMock: { requireAuth: vi.fn() },
    decideMock: {
      finalDecide: vi.fn(),
      writeMealHistory: vi.fn(),
    },
  };
});

// prisma
vi.mock('@/lib/db', () => ({ default: prismaMock }));
// ⚠️ ให้ดู route จริงของคุณว่า import จาก '@/lib/session' หรือ '@/lib/auth'
vi.mock('@/lib/session', () => authMock);
// decide service
vi.mock('@/services/decideService', () => decideMock);

// ---------- IMPORTS *หลัง* mock ----------
import { POST, GET } from '../../app/api/rooms/[roomId]/decide/final/route';

const ctx = (roomId: string): { params: Promise<{ roomId: string }> } => ({
  params: Promise.resolve({ roomId }),
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/rooms/[roomId]/decide/final', () => {
  it('200 เมื่อเป็นสมาชิกห้อง และเรียก writeMealHistory', async () => {
    authMock.requireAuth.mockResolvedValue({ userId: 'u1' });
    prismaMock.roomParticipant.findFirst.mockResolvedValue({ id: 'p1' });
    decideMock.finalDecide.mockResolvedValue({
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

    const req = new Request('http://test.local', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }) as unknown as NextRequest;

    const res = await POST(req, ctx('r1'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.winner.restaurantId).toBe('A');
    expect(decideMock.writeMealHistory).toHaveBeenCalledWith('r1', 'A');
  });

  it('403 เมื่อไม่เป็นสมาชิก', async () => {
    authMock.requireAuth.mockResolvedValue({ userId: 'u1' });
    prismaMock.roomParticipant.findFirst.mockResolvedValue(null);

    const req = new Request('http://test.local', {
      method: 'POST',
      body: JSON.stringify({}),
    }) as unknown as NextRequest;

    const res = await POST(req, ctx('r1'));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe('FORBIDDEN_NOT_MEMBER');
  });

  it('401 เมื่อไม่ได้ล็อกอิน', async () => {
    authMock.requireAuth.mockImplementation(() => {
      throw new Error('UNAUTHENTICATED');
    });

    const req = new Request('http://test.local', {
      method: 'POST',
      body: JSON.stringify({}),
    }) as unknown as NextRequest;

    const res = await POST(req, ctx('r1'));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe('UNAUTHENTICATED');
  });
});

describe('GET /api/rooms/[roomId]/decide/final', () => {
  it('คืน winner ล่าสุดของห้อง', async () => {
    const decidedAt = new Date();
    prismaMock.mealHistory.findFirst.mockResolvedValue({ restaurantId: 'A', decidedAt });
    prismaMock.restaurant.findUnique.mockResolvedValue({
      id: 'A',
      name: 'A',
      address: 'x',
      lat: 1,
      lng: 2,
      rating: 4.4,
    });

    const res = await GET(new Request('http://test.local') as unknown as NextRequest, ctx('r1'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.winner.name).toBe('A');
    expect(new Date(json.decidedAt).getTime()).toBe(decidedAt.getTime());
  });

  it('ถ้าไม่มีประวัติ → winner = null', async () => {
    prismaMock.mealHistory.findFirst.mockResolvedValue(null);

    const res = await GET(new Request('http://test.local') as unknown as NextRequest, ctx('r1'));
    expect(res.status).toBe(200);
    expect((await res.json()).winner).toBeNull();
  });
});
