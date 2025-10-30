import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getSession } from "@/lib/session";
import { withCORS, preflight } from "@/lib/cors";

const BodySchema = z
  .object({
    displayName: z.string().min(1).max(50),
  })
  .strict();

export async function OPTIONS() {
  return preflight("POST, OPTIONS");
}

export async function POST(
  req: NextRequest,
  ctx: { params: { roomId: string } } // ชื่อต้องตรงกับชื่อโฟลเดอร์ [roomId]
) {
  try {
    const { roomId } = ctx.params;
    const s = await getSession(req);
    const userId = s?.user?.id ?? null;

    let body: unknown = {};
    try {
      body = await req.json();
    } catch {}
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      const res = NextResponse.json(
        { error: "INVALID_BODY", details: parsed.error.flatten() },
        { status: 400 }
      );
      res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
      return withCORS(res);
    }
    const { displayName } = parsed.data;

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { id: true, status: true },
    });
    if (!room || room.status !== "OPEN") {
      const res = NextResponse.json(
        { error: "ROOM_NOT_FOUND_OR_CLOSED" },
        { status: 404 }
      );
      res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
      return withCORS(res);
    }

    if (userId) {
      const existed = await prisma.roomParticipant.findFirst({
        where: { roomId, userId },
        select: { id: true },
      });
      if (existed) {
        const res = NextResponse.json({ ok: true, roomId }, { status: 200 });
        res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
        return withCORS(res);
      }
    }

    await prisma.roomParticipant.create({
      data: { roomId, userId, displayName, role: "member" },
    });

    const res = NextResponse.json({ ok: true, roomId }, { status: 201 });
    res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    return withCORS(res);
  } catch (e) {
    const res = NextResponse.json(
      { error: "ROOM_JOIN_FAILED", details: String(e) },
      { status: 500 }
    );
    res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    return withCORS(res);
  }
}
