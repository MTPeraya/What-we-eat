import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db"; // หรือ { prisma } ตามโปรเจ็กต์
import { finalDecide, writeMealHistory } from "@/services/decideService";
import { requireAuth } from "@/lib/session"; // ถ้าคุณตั้งไว้ที่ "@/lib/session" ให้แก้ path

// ตัดสินผล (ต้องเป็นสมาชิกห้อง)
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await ctx.params;
    const { userId } = await requireAuth(req);

    const isMember = await prisma.roomParticipant.findFirst({
      where: { roomId, userId },
      select: { id: true },
    });
    if (!isMember) {
      return NextResponse.json({ error: "FORBIDDEN_NOT_MEMBER" }, { status: 403 });
    }

    // รับ center จาก client ได้ (ถ้าจะใช้ระยะทางช่วย tie-break)
    // const body = await req.json().catch(() => ({} as any));
    const body = await req.json().catch(() => (console.log("eiei")));
    const center = body?.center as { lat: number; lng: number } | undefined;

    const result = await finalDecide(roomId, center);
    if (!result.winner) {
      return NextResponse.json({ error: "NO_WINNER" }, { status: 400 });
    }

    // บันทึกประวัติการตัดสิน
    await writeMealHistory(roomId, result.winner.restaurantId);

    return NextResponse.json(result, { status: 200 });
  } catch (e) {
    if ((e as Error).message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "FINAL_DECIDE_FAILED", details: String(e) },
      { status: 500 }
    );
  }
}

// อ่านผลล่าสุดของห้อง (ไม่บังคับล็อกอิน)
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await ctx.params;

  const last = await prisma.mealHistory.findFirst({
    where: { roomId },
    orderBy: { decidedAt: "desc" },
    select: { restaurantId: true, decidedAt: true },
  });

  if (!last) {
    return NextResponse.json({ winner: null, decidedAt: null }, { status: 200 });
  }

  const r = await prisma.restaurant.findUnique({
    where: { id: last.restaurantId },
    select: { id: true, name: true, address: true, lat: true, lng: true, rating: true },
  });

  return NextResponse.json(
    {
      winner: r
        ? {
            restaurantId: r.id,
            name: r.name,
            address: r.address,
            lat: r.lat,
            lng: r.lng,
            rating: r.rating ?? null,
          }
        : null,
      decidedAt: last.decidedAt,
    },
    { status: 200 }
  );
}
