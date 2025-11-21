import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withCORS, preflight } from "@/lib/cors";
import { cleanupStaleRooms } from "@/services/roomLifecycle";

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
    
    // Run cleanup in background (don't await) to avoid blocking the request
    cleanupStaleRooms().catch((err) => {
      console.error("[rooms GET] Cleanup error (non-blocking):", err);
    });

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { id: true, hostId: true, status: true, centerLat: true, centerLng: true, updatedAt: true },
    });
    if (!room) {
      return withCORS(NextResponse.json({ error: "ROOM_NOT_FOUND" }, { status: 404 }), origin);
    }

    const participants = await prisma.roomParticipant.findMany({
      where: { roomId },
      select: { 
        id: true, 
        userId: true, 
        displayName: true, 
        role: true,
        user: {
          select: {
            profilePicture: true,
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    });

    // Map participants to include profilePicture
    const participantsWithProfile = participants.map(p => ({
      id: p.id,
      userId: p.userId,
      displayName: p.displayName,
      role: p.role,
      profilePicture: p.user?.profilePicture || null,
    }));

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
          participants: participantsWithProfile,
          updatedAt: room.updatedAt.toISOString(),
          viewingResults,
        },
        { status: 200 }
      ),
      origin
    );
  } catch (e) {
    const errorMsg = (e as Error)?.message ?? String(e);
    const errorStack = (e as Error)?.stack;
    console.error("[rooms GET] Error:", { roomId: "unknown", error: errorMsg, stack: errorStack });
    return withCORS(
      NextResponse.json(
        { error: "ROOM_FETCH_FAILED", details: errorMsg },
        { status: 500 }
      ),
      origin
    );
  }
}
