import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getSession } from "@/lib/session";
import { withCORS, preflight } from "@/lib/cors";
import { cleanupStaleRooms } from "@/services/roomLifecycle";

const BodySchema = z
  .object({
    code: z.string().min(4).max(16),
    displayName: z.string().min(1).max(50),
  })
  .strict();

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return preflight("POST, OPTIONS", origin);
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  
  try {
    await cleanupStaleRooms();
    const s = await getSession(req); // Allow guest (userId = null)
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
    const code = parsed.data.code.toUpperCase();
    let displayName = parsed.data.displayName;

    // If user is logged in, use their username or displayName from user object instead
    if (userId && s?.user) {
      displayName = s.user.displayName || s.user.username || displayName;
    }

    const room = await prisma.room.findUnique({
      where: { code },
      select: { id: true, status: true, code: true },
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

    // If existing user rejoining same room
    if (userId) {
      const existing = await prisma.roomParticipant.findFirst({
        where: { roomId: room.id, userId },
        select: { id: true },
      });
      if (existing) {
        // Update displayName if it changed (e.g., user logged in after joining as guest)
        await prisma.roomParticipant.update({
          where: { id: existing.id },
          data: { displayName },
        });
        return withCORS(
          NextResponse.json(
            { ok: true, roomId: room.id, code: room.code },
            { status: 200 }
          ),
          origin
        );
      }
    }

    await prisma.roomParticipant.create({
      data: {
        roomId: room.id,
        userId, // guest = null
        displayName,
        role: "member",
      },
    });

    return withCORS(
      NextResponse.json(
        { ok: true, roomId: room.id, code: room.code },
        { status: 201 }
      ),
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
