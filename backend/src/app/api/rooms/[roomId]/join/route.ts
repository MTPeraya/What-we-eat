import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getSession } from "@/lib/session";
import { withCORS, preflight } from "@/lib/cors";
import { cleanupStaleRooms } from "@/services/roomLifecycle";

const BodySchema = z
  .object({
    displayName: z.string().min(1).max(50),
  })
  .strict();

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return preflight("POST, OPTIONS", origin);
}

export async function POST(
  req: NextRequest,
  ctx: { params: { roomId: string } } // Name must match folder name [roomId]
) {
  const origin = req.headers.get('origin');
  
  try {
    const { roomId } = ctx.params;
    await cleanupStaleRooms();
    const s = await getSession(req);
    const userId = s?.user?.id ?? null;

    let body: unknown = {};
    try {
      body = await req.json();
    } catch {}
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return withCORS(
        NextResponse.json(
          { error: "INVALID_BODY", details: parsed.error.flatten() },
          { status: 400 }
        ),
        origin
      );
    }
    let { displayName } = parsed.data;

    // If user is logged in, use their username or displayName from user object instead
    if (userId && s?.user) {
      displayName = s.user.displayName || s.user.username || displayName;
    }

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { id: true, status: true },
    });
    if (!room || room.status !== "OPEN") {
      return withCORS(
        NextResponse.json(
          { error: "ROOM_NOT_FOUND_OR_CLOSED" },
          { status: 404 }
        ),
        origin
      );
    }

    if (userId) {
      const existed = await prisma.roomParticipant.findFirst({
        where: { roomId, userId },
        select: { id: true },
      });
      if (existed) {
        // Update displayName if it changed (e.g., user logged in after joining as guest)
        await prisma.roomParticipant.update({
          where: { id: existed.id },
          data: { displayName },
        });
        return withCORS(
          NextResponse.json({ ok: true, roomId }, { status: 200 }),
          origin
        );
      }
    }

    await prisma.roomParticipant.create({
      data: { roomId, userId, displayName, role: "member" },
    });

    return withCORS(
      NextResponse.json({ ok: true, roomId }, { status: 201 }),
      origin
    );
  } catch (e) {
    return withCORS(
      NextResponse.json(
        { error: "ROOM_JOIN_FAILED", details: String(e) },
        { status: 500 }
      ),
      origin
    );
  }
}
