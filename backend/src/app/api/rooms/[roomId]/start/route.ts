import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { withCORS, preflight } from "@/lib/cors";
import { cleanupStaleRooms, computeRoomExpiry } from "@/services/roomLifecycle";

const BodySchema = z.object({
  center: z.object({
    lat: z.number(),
    lng: z.number(),
  }).optional(),
}).strict();

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return preflight("POST, OPTIONS", origin);
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ roomId: string }> }
) {
  const origin = req.headers.get('origin');
  
  try {
    const { roomId } = await ctx.params;
    await cleanupStaleRooms();
    const { userId } = await requireAuth(req);

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { id: true, hostId: true, status: true },
    });

    if (!room) {
      return withCORS(NextResponse.json({ error: "ROOM_NOT_FOUND" }, { status: 404 }), origin);
    }

    if (room.hostId !== userId) {
      return withCORS(NextResponse.json({ error: "FORBIDDEN_NOT_HOST" }, { status: 403 }), origin);
    }

    if (room.status !== "OPEN") {
      return withCORS(NextResponse.json({ error: "ROOM_NOT_OPEN" }, { status: 400 }), origin);
    }

    // Parse body to get center coordinates
    let body: unknown = {};
    try {
      body = await req.json();
    } catch {}
    const parsed = BodySchema.safeParse(body);
    
    // Update room status to mark as started and save center
    const updateData: {
      status: "STARTED";
      centerLat?: number;
      centerLng?: number;
      expiresAt?: Date;
    } = { status: "STARTED", expiresAt: computeRoomExpiry() };
    
    if (parsed.success && parsed.data.center) {
      updateData.centerLat = parsed.data.center.lat;
      updateData.centerLng = parsed.data.center.lng;
    }
    
    const updated = await prisma.room.update({
      where: { id: roomId },
      data: updateData,
      select: { id: true, status: true, centerLat: true, centerLng: true, updatedAt: true },
    });

    return withCORS(
      NextResponse.json(
        { 
          ok: true, 
          roomId, 
          status: updated.status,
          center: updated.centerLat && updated.centerLng 
            ? { lat: updated.centerLat, lng: updated.centerLng }
            : null,
          startedAt: updated.updatedAt.toISOString() 
        },
        { status: 200 }
      ),
      origin
    );
  } catch (e: unknown) {
    const msg = (e as Error)?.message ?? String(e);
    if (msg === "UNAUTHENTICATED") {
      return withCORS(NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 }), origin);
    }
    return withCORS(
      NextResponse.json(
        { error: "START_FAILED", details: msg },
        { status: 500 }
      ),
      origin
    );
  }
}

