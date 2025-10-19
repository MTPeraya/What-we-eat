import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { finalDecide, writeMealHistory } from "@/services/decideService";
import { requireAuth } from "@/lib/session";
import { buildMapLinks } from "@/services/mapLink";
import { emitToRoom } from "@/services/realtime";

// ================== CORS ==================
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

// ================== Schemas ==================
const FinalBodySchema = z
  .object({
    center: z
      .object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
      })
      .optional(),
  })
  .strict();

// ================== POST: ตัดสินผล (ต้องเป็นสมาชิกห้อง) ==================
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ roomId: string }> } // Next.js v15: params เป็น Promise
) {
  try {
    const { roomId } = await ctx.params;

    // ต้องล็อกอิน
    const { userId } = await requireAuth(req);

    // ต้องเป็นสมาชิกห้อง
    const isMember = await prisma.roomParticipant.findFirst({
      where: { roomId, userId },
      select: { id: true },
    });
    if (!isMember) {
      return withCORS(
        NextResponse.json({ error: "FORBIDDEN_NOT_MEMBER" }, { status: 403 })
      );
    }

    // รับ body (optional center)
    let body: unknown = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    const parsed = FinalBodySchema.safeParse(body);
    if (!parsed.success) {
      return withCORS(
        NextResponse.json(
          { error: "INVALID_BODY", details: parsed.error.flatten() },
          { status: 400 }
        )
      );
    }

    // คำนวณผลผู้ชนะ (tie-break ภายใน service: votes → rating → distance(center) → no-repeat)
    const result = await finalDecide(roomId, parsed.data.center);
    if (!result?.winner) {
      return withCORS(
        NextResponse.json({ error: "NO_WINNER" }, { status: 400 })
      );
    }

    // บันทึกประวัติการตัดสิน (สำหรับสมาชิกที่เกี่ยวข้อง — ภายใน service อาจ loop insert ต่อผู้ใช้/หรือ room-level)
    await writeMealHistory(roomId, result.winner.restaurantId);

    // สร้างลิงก์แผนที่
    const mapLinks = buildMapLinks({
      lat: result.winner.lat,
      lng: result.winner.lng,
      name: result.winner.name,
    });

    // Realtime แจ้งสมาชิกในห้อง
    await emitToRoom(roomId, "decision.finalized", {
      winner: result.winner,
      decidedAt: result.decidedAt ?? new Date().toISOString(),
      mapLinks,
    });

    return withCORS(
      NextResponse.json(
        {
          ...result,
          mapLinks,
        },
        { status: 200 }
      )
    );
  } catch (e) {
    const msg = (e as Error)?.message ?? String(e);
    if (msg === "UNAUTHENTICATED") {
      return withCORS(
        NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 })
      );
    }
    return withCORS(
      NextResponse.json(
        { error: "FINAL_DECIDE_FAILED", details: msg },
        { status: 500 }
      )
    );
  }
}

// ================== GET: อ่านผลล่าสุดของห้อง (สาธารณะ) ==================
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await ctx.params;

    // อ่านประวัติล่าสุดของห้อง
    const last = await prisma.mealHistory.findFirst({
      where: { roomId },
      orderBy: { decidedAt: "desc" },
      select: { restaurantId: true, decidedAt: true },
    });

    if (!last) {
      return withCORS(
        NextResponse.json(
          { winner: null, decidedAt: null, mapLinks: null },
          { status: 200 }
        )
      );
    }

    // ดึงข้อมูลร้าน
    const r = await prisma.restaurant.findUnique({
      where: { id: last.restaurantId },
      select: {
        id: true,
        name: true,
        address: true,
        lat: true,
        lng: true,
        rating: true,
      },
    });

    if (!r) {
      // กรณีร้านถูกลบหรือหาไม่เจอ
      return withCORS(
        NextResponse.json(
          { winner: null, decidedAt: last.decidedAt, mapLinks: null },
          { status: 200 }
        )
      );
    }

    const mapLinks =
      r.lat != null && r.lng != null
        ? buildMapLinks({ lat: r.lat, lng: r.lng, name: r.name })
        : null;

    return withCORS(
      NextResponse.json(
        {
          winner: {
            restaurantId: r.id,
            name: r.name,
            address: r.address,
            lat: r.lat,
            lng: r.lng,
            rating: r.rating ?? null,
          },
          decidedAt: last.decidedAt,
          mapLinks,
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
