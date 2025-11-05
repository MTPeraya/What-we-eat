import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { withCORS, preflight } from "@/lib/cors";

export async function OPTIONS() {
  return preflight("POST, OPTIONS");
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await ctx.params;
    const { userId } = await requireAuth(req);

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { id: true, hostId: true, status: true },
    });

    if (!room) {
      const res = NextResponse.json({ error: "ROOM_NOT_FOUND" }, { status: 404 });
      res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
      return withCORS(res);
    }

    if (room.hostId !== userId) {
      const res = NextResponse.json({ error: "FORBIDDEN_NOT_HOST" }, { status: 403 });
      res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
      return withCORS(res);
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

    const res = NextResponse.json(
      { ok: true, roomId, viewingResults: true, triggeredAt: updated.updatedAt.toISOString() },
      { status: 200 }
    );
    res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    return withCORS(res);
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    if (msg === "UNAUTHENTICATED") {
      const res = NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
      res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
      return withCORS(res);
    }
    const res = NextResponse.json(
      { error: "VIEW_RESULTS_FAILED", details: msg },
      { status: 500 }
    );
    res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    return withCORS(res);
  }
}

