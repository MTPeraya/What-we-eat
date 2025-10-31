import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { withCORS, preflight } from "@/lib/cors";

export async function OPTIONS() {
  return preflight("POST, OPTIONS");
}

export async function POST(req: NextRequest, ctx: { params: { roomId: string } }) {
  try {
    const { roomId } = ctx.params;
    const { userId } = await requireAuth(req);

    // หาห้องและ host ปัจจุบัน
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { hostId: true },
    });
    if (!room) return withCORS(NextResponse.json({ error: "ROOM_NOT_FOUND" }, { status: 404 }));

    // ลบ user ออกจาก participants
    await prisma.roomParticipant.deleteMany({
      where: { roomId, userId }
    });

    let newHostId = room.hostId;
    if (room.hostId === userId) {
      // เลือก host คนใหม่ (ถ้า host เดิมออกคนแรก)
      const next = await prisma.roomParticipant.findFirst({ where: { roomId }, orderBy: { joinedAt: "asc" }});
      newHostId = next?.userId ?? "not found";
      await prisma.room.update({ where: { id: roomId }, data: { hostId: newHostId } });
    }

    return withCORS(NextResponse.json({ ok: true, newHostId }, { status: 200 }));
  } catch (e) {
    return withCORS(NextResponse.json({ error: "LEAVE_FAILED", details: String(e) }, { status: 500 }));
  }
}