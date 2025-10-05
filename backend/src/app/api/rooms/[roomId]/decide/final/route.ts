// backend/src/app/api/rooms/[roomId]/decide/final/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db"; // หรือใช้ { prisma } ตามโปรเจ็กต์จริง
import { finalDecide, writeMealHistory } from "@/services/decideService";
import { requireAuth } from "@/lib/session";

// ===== CORS =====
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";
function withCORS(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", FRONTEND_ORIGIN);
  res.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.headers.set("Access-Control-Allow-Credentials", "true");
  return res;
}
export async function OPTIONS() {
  return withCORS(new NextResponse(null, { status: 204 }));
}

// ตัดสินผล (ต้องเป็นสมาชิกห้อง)
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ roomId: string }> } // v15: params เป็น Promise
) {
  try {
    const { roomId } = await ctx.params;
    const { userId } = await requireAuth(req);

    const isMember = await prisma.roomParticipant.findFirst({
      where: { roomId, userId },
      select: { id: true },
    });
    if (!isMember) {
      return withCORS(NextResponse.json({ error: "FORBIDDEN_NOT_MEMBER" }, { status: 403 }));
    }

    // รับ center จาก client (optional)
    type FinalBody = { center?: { lat: number; lng: number } };

    const body: FinalBody = (await req.json().catch(() => ({}))) as FinalBody;
    const center = body.center; // type: {lat:number; lng:number} | undefined
    //     try { body = await req.json(); } catch { body = {}; }

    const result = await finalDecide(roomId, center);
    if (!result.winner) {
      return withCORS(NextResponse.json({ error: "NO_WINNER" }, { status: 400 }));
    }

    // บันทึกประวัติการตัดสิน
    await writeMealHistory(roomId, result.winner.restaurantId);

    return withCORS(NextResponse.json(result, { status: 200 }));
  } catch (e) {
    const msg = (e as Error)?.message;
    if (msg === "UNAUTHENTICATED") {
      return withCORS(NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 }));
    }
    return withCORS(
      NextResponse.json(
        { error: "FINAL_DECIDE_FAILED", details: String(e) },
        { status: 500 }
      )
    );
  }
}

// อ่านผลล่าสุดของห้อง (ไม่บังคับล็อกอิน)
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await ctx.params;

    const last = await prisma.mealHistory.findFirst({
      where: { roomId },
      orderBy: { decidedAt: "desc" },
      select: { restaurantId: true, decidedAt: true },
    });

    if (!last) {
      return withCORS(NextResponse.json({ winner: null, decidedAt: null }, { status: 200 }));
    }

    const r = await prisma.restaurant.findUnique({
      where: { id: last.restaurantId },
      select: { id: true, name: true, address: true, lat: true, lng: true, rating: true },
    });

    return withCORS(
      NextResponse.json(
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
      )
    );
  } catch (e) {
    return withCORS(
      NextResponse.json(
        { error: "FINAL_GET_FAILED", details: String(e) },
        { status: 500 }
      )
    );
  }
}
