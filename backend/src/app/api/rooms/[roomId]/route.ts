import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withCORS, preflight } from "@/lib/cors";

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return preflight("GET, OPTIONS", origin);
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ roomId: string }> }
) {
  const origin = req.headers.get('origin');
  
  try {
    const { roomId } = await ctx.params; // Next.js v15: params is a Promise

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { id: true, hostId: true, status: true, centerLat: true, centerLng: true, updatedAt: true },
    });
    if (!room) {
      return withCORS(NextResponse.json({ error: "ROOM_NOT_FOUND" }, { status: 404 }), origin);
    }

    const participants = await prisma.roomParticipant.findMany({
      where: { roomId },
      select: { id: true, userId: true, displayName: true, role: true },
      orderBy: { joinedAt: "asc" },
    });

    // Check if room has started (status changed from OPEN to STARTED)
    const viewingResults = room.status === "STARTED";

    return withCORS(
      NextResponse.json(
        {
          id: room.id,
          hostId: room.hostId,
          status: room.status,
          center: room.centerLat && room.centerLng 
            ? { lat: room.centerLat, lng: room.centerLng }
            : null,
          participants,
          updatedAt: room.updatedAt.toISOString(),
          viewingResults,
        },
        { status: 200 }
      ),
      origin
    );
  } catch (e) {
    return withCORS(
      NextResponse.json(
        { error: "ROOM_FETCH_FAILED", details: String(e) },
        { status: 500 }
      ),
      origin
    );
  }
}


