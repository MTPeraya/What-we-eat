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
      select: { id: true, hostId: true, updatedAt: true },
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

    // Check if room was recently updated (within last 3 seconds) - indicates viewing results
    const now = Date.now();
    const updatedTime = new Date(room.updatedAt).getTime();
    const timeDiff = now - updatedTime;
    const viewingResults = timeDiff < 3000; // Within 3 seconds = viewing results

    const res = NextResponse.json(
      {
        id: room.id,
        hostId: room.hostId,
        participants,
        updatedAt: room.updatedAt.toISOString(),
        viewingResults,
      },
      { status: 200 }
    );
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


