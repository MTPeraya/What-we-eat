import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getSession } from "@/lib/session"; // อนุญาต guest เข้าห้องได้ (ไม่มี userId ก็เข้าได้)

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";
function withCORS(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", FRONTEND_ORIGIN);
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.headers.set("Access-Control-Allow-Credentials", "true");
  return res;
}
export async function OPTIONS() { return withCORS(new NextResponse(null, { status: 204 })); }

const BodySchema = z.object({
  code: z.string().min(4).max(16),
  displayName: z.string().min(1).max(50),
}).strict();

export async function POST(req: NextRequest) {
  try {
    const s = await getSession(req); // มีหรือไม่มีก็ได้
    const userId = s?.user?.id ?? null;

    let body: unknown = {};
    try { body = await req.json(); } catch {}
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return withCORS(NextResponse.json({ error: "INVALID_BODY", details: parsed.error.flatten() }, { status: 400 }));
    }
    const { code, displayName } = parsed.data;

    const room = await prisma.room.findUnique({ where: { code }, select: { id: true, status: true } });
    if (!room || room.status !== "OPEN") {
      return withCORS(NextResponse.json({ error: "ROOM_NOT_FOUND_OR_CLOSED" }, { status: 404 }));
    }

    // หากผู้ใช้คนเดิมเข้าห้องซ้ำ ให้ return 200 เฉย ๆ
    const existing = userId
      ? await prisma.roomParticipant.findFirst({ where: { roomId: room.id, userId }, select: { id: true } })
      : null;
    if (existing) {
      return withCORS(NextResponse.json({ ok: true, roomId: room.id }, { status: 200 }));
    }

    await prisma.roomParticipant.create({
      data: {
        roomId: room.id,
        userId, // guest = null
        displayName,
        role: "member",
      },
    });

    return withCORS(NextResponse.json({ ok: true, roomId: room.id }, { status: 201 }));
  } catch (e) {
    return withCORS(NextResponse.json({ error: "ROOM_JOIN_FAILED", details: String(e) }, { status: 500 }));
  }
}
