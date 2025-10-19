import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getSession } from "@/lib/session"; // อนุญาต guest

// CORS
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";
function withCORS(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", FRONTEND_ORIGIN);
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.headers.set("Access-Control-Allow-Credentials", "true");
  return res;
}
export async function OPTIONS() {
  return withCORS(new NextResponse(null, { status: 204 }));
}

// body schema
const Body = z.object({
  displayName: z.string().min(1).max(50),
}).strict();

// POST /api/rooms/:roomId/join
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await ctx.params;
    const s = await getSession(req);
    const userId = s?.user?.id ?? null;

    let json: unknown = {};
    try { json = await req.json(); } catch {}
    const parsed = Body.safeParse(json);
    if (!parsed.success) {
      return withCORS(NextResponse.json(
        { error: "INVALID_BODY", details: parsed.error.flatten() },
        { status: 400 }
      ));
    }
    const { displayName } = parsed.data;

    // ตรวจว่าห้องมีอยู่และเปิดอยู่
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { id: true, status: true },
    });
    if (!room || room.status !== "OPEN") {
      return withCORS(NextResponse.json({ error: "ROOM_NOT_FOUND_OR_CLOSED" }, { status: 404 }));
    }

    // ถ้าเป็นผู้ใช้ที่ล็อกอินแล้ว และเคยอยู่ห้องนี้อยู่แล้ว -> 200
    if (userId) {
      const existed = await prisma.roomParticipant.findFirst({
        where: { roomId, userId },
        select: { id: true },
      });
      if (existed) {
        return withCORS(NextResponse.json({ ok: true, roomId }, { status: 200 }));
      }
    }

    // เพิ่มผู้เข้าร่วม (guest = userId=null ได้ เพราะสคีมาคุณอนุญาตซ้ำ)
    await prisma.roomParticipant.create({
      data: {
        roomId,
        userId, // อาจเป็น null
        displayName,
        role: "member",
      },
    });

    return withCORS(NextResponse.json({ ok: true, roomId }, { status: 201 }));
  } catch (e) {
    return withCORS(NextResponse.json({ error: "ROOM_JOIN_FAILED", details: String(e) }, { status: 500 }));
  }
}
