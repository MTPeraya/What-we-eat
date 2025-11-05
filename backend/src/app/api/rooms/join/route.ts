import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getSession } from "@/lib/session";
import { withCORS, preflight } from "@/lib/cors";

const BodySchema = z
  .object({
    code: z.string().min(4).max(16),
    displayName: z.string().min(1).max(50),
  })
  .strict();

export async function OPTIONS() {
  return preflight("POST, OPTIONS");
}

export async function POST(req: NextRequest) {
  try {
    const s = await getSession(req); // Allow guest (userId = null)
    const userId = s?.user?.id ?? null;

    let body: unknown = {};
    try {
      body = await req.json();
    } catch {}
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      const res = NextResponse.json(
        { error: "INVALID_BODY", details: parsed.error.flatten() },
        { status: 400 }
      );
      res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
      return withCORS(res);
    }
    const code = parsed.data.code.toUpperCase();
    const displayName = parsed.data.displayName;

    const room = await prisma.room.findUnique({
      where: { code },
      select: { id: true, status: true, code: true },
    });
    if (!room || room.status !== "OPEN") {
      const res = NextResponse.json(
        { error: "ROOM_NOT_FOUND_OR_CLOSED" },
        { status: 404 }
      );
      res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
      return withCORS(res);
    }

    // If existing user rejoining same room
    if (userId) {
      const existing = await prisma.roomParticipant.findFirst({
        where: { roomId: room.id, userId },
        select: { id: true },
      });
      if (existing) {
        const res = NextResponse.json(
          { ok: true, roomId: room.id, code: room.code },
          { status: 200 }
        );
        res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
        return withCORS(res);
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

    const res = NextResponse.json(
      { ok: true, roomId: room.id, code: room.code },
      { status: 201 }
    );
    res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    return withCORS(res);
  } catch (e) {
    const res = NextResponse.json(
      { error: "ROOM_JOIN_FAILED", details: String(e) },
      { status: 500 }
    );
    res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    return withCORS(res);
  }
}
