import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { withCORS, preflight } from "@/lib/cors";

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

    // Update room to mark as viewing results (touching updatedAt)
    const updated = await prisma.room.update({
      where: { id: roomId },
      data: { 
        // We'll use updatedAt to signal results viewing
        // Could also add a status field if needed
      },
      select: { id: true, updatedAt: true },
    });

    return withCORS(
      NextResponse.json(
        { ok: true, roomId, viewingResults: true, triggeredAt: updated.updatedAt.toISOString() },
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
        { error: "VIEW_RESULTS_FAILED", details: msg },
        { status: 500 }
      ),
      origin
    );
  }
}

