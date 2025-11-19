import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { withCORS, preflight } from "@/lib/cors";
import { closeRoom, cleanupStaleRooms } from "@/services/roomLifecycle";

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return preflight("POST, OPTIONS", origin);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ roomId: string }> }) {
  const origin = req.headers.get('origin');
  
  try {
    const { roomId } = await ctx.params;
    await cleanupStaleRooms();
    const { userId } = await requireAuth(req);

    // Find room and current host
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { hostId: true, status: true },
    });
    if (!room) return withCORS(NextResponse.json({ error: "ROOM_NOT_FOUND" }, { status: 404 }), origin);

    // Remove user from participants
    await prisma.roomParticipant.deleteMany({
      where: { roomId, userId }
    });

    let newHostId = room.hostId;
    if (room.hostId === userId) {
      // Select new host (if original host leaves, pick first remaining member)
      const next = await prisma.roomParticipant.findFirst({ where: { roomId }, orderBy: { joinedAt: "asc" }});
      
      if (next?.userId) {
        // Transfer host to next member
        newHostId = next.userId;
        await prisma.room.update({ where: { id: roomId }, data: { hostId: newHostId } });
      } else {
        // No members left, close the room
        await closeRoom(roomId, { removeParticipants: false });
        newHostId = null;
      }
    }

    const remaining = await prisma.roomParticipant.count({ where: { roomId } });
    if (remaining === 0 && room.status === "OPEN") {
      await closeRoom(roomId, { removeParticipants: false });
    }

    return withCORS(NextResponse.json({ ok: true, newHostId }, { status: 200 }), origin);
  } catch (e) {
    return withCORS(NextResponse.json({ error: "LEAVE_FAILED", details: String(e) }, { status: 500 }), origin);
  }
}