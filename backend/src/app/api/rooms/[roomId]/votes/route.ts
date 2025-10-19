import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/session";

// ===== CORS =====
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";
function withCORS(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", FRONTEND_ORIGIN);
  res.headers.set("Access-Control-Allow-Methods", "POST, DELETE, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.headers.set("Access-Control-Allow-Credentials", "true");
  return res;
}
export async function OPTIONS() {
  return withCORS(new NextResponse(null, { status: 204 }));
}

// ===== Validation =====
const BodySchema = z.object({
  restaurantId: z.string().min(1),
  value: z.enum(["ACCEPT", "REJECT"]),
}).strict();

const DeleteSchema = z.object({
  restaurantId: z.string().min(1),
}).strict();

// ===== POST /api/rooms/:roomId/votes  (create/update vote) =====
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await ctx.params;
    const { userId } = await requireAuth(req);

    // ต้องเป็นสมาชิกห้อง
    const isMember = await prisma.roomParticipant.findFirst({
      where: { roomId, userId },
      select: { id: true },
    });
    if (!isMember) {
      return withCORS(NextResponse.json({ error: "FORBIDDEN_NOT_MEMBER" }, { status: 403 }));
    }

    let json: unknown = {};
    try { json = await req.json(); } catch {}
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return withCORS(
        NextResponse.json({ error: "INVALID_BODY", details: parsed.error.flatten() }, { status: 400 })
      );
    }
    const { restaurantId, value } = parsed.data;

    // upsert โหวต (unique: roomId+userId+restaurantId)
    const vote = await prisma.vote.upsert({
      where: { roomId_userId_restaurantId: { roomId, userId, restaurantId } },
      update: { value }, // ถ้ามีอยู่แล้ว เปลี่ยนค่า
      create: { roomId, userId, restaurantId, value },
      select: { id: true, value: true, createdAt: true },
    });

    // tally เฉพาะร้านนี้ในห้องนี้
    const grouped = await prisma.vote.groupBy({
      by: ["value"],
      where: { roomId, restaurantId },
      _count: { _all: true },
    });
    const accept = grouped.find(g => g.value === "ACCEPT")?._count._all ?? 0;
    const reject = grouped.find(g => g.value === "REJECT")?._count._all ?? 0;

    return withCORS(
      NextResponse.json(
        {
          ok: true,
          vote,
          tally: { accept, reject, netScore: accept - reject, total: accept + reject },
        },
        { status: 200 }
      )
    );
  } catch (e) {
    const msg = (e as Error)?.message ?? String(e);
    if (msg === "UNAUTHENTICATED") {
      return withCORS(NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 }));
    }
    return withCORS(NextResponse.json({ error: "VOTE_FAILED", details: msg }, { status: 500 }));
  }
}

// ===== DELETE /api/rooms/:roomId/votes  (ยกเลิกโหวตของตัวเองสำหรับร้านหนึ่ง) =====
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await ctx.params;
    const { userId } = await requireAuth(req);

    // สมาชิกเท่านั้น
    const isMember = await prisma.roomParticipant.findFirst({
      where: { roomId, userId },
      select: { id: true },
    });
    if (!isMember) {
      return withCORS(NextResponse.json({ error: "FORBIDDEN_NOT_MEMBER" }, { status: 403 }));
    }

    let json: unknown = {};
    try { json = await req.json(); } catch {}
    const parsed = DeleteSchema.safeParse(json);
    if (!parsed.success) {
      return withCORS(
        NextResponse.json({ error: "INVALID_BODY", details: parsed.error.flatten() }, { status: 400 })
      );
    }
    const { restaurantId } = parsed.data;

    await prisma.vote.delete({
      where: { roomId_userId_restaurantId: { roomId, userId, restaurantId } },
    }).catch(() => undefined); // ถ้าไม่มีอยู่ก็เงียบๆ

    return withCORS(NextResponse.json({ ok: true }, { status: 200 }));
  } catch (e) {
    const msg = (e as Error)?.message ?? String(e);
    if (msg === "UNAUTHENTICATED") {
      return withCORS(NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 }));
    }
    return withCORS(NextResponse.json({ error: "VOTE_DELETE_FAILED", details: msg }, { status: 500 }));
  }
}
