import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withCORS, preflight } from "@/lib/cors";

export async function OPTIONS() {
  return preflight("GET, OPTIONS");
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await ctx.params; // Next.js v15: params is a Promise

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { id: true, hostId: true },
    });
    if (!room) {
      const res = NextResponse.json({ error: "ROOM_NOT_FOUND" }, { status: 404 });
      res.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
      return withCORS(res);
    }

    const participants = await prisma.roomParticipant.findMany({
      where: { roomId },
      select: { id: true, userId: true, displayName: true, role: true },
      orderBy: { joinedAt: "asc" },
    });

    const res = NextResponse.json({ id: room.id, hostId: room.hostId, participants }, { status: 200 });
    res.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    return withCORS(res);
  } catch (e) {
    const res = NextResponse.json(
      { error: "ROOM_FETCH_FAILED", details: String(e) },
      { status: 500 }
    );
    res.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    return withCORS(res);
  }
}


