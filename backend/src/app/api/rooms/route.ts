import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getSession } from "@/lib/session";
import { withCORS, preflight } from "@/lib/cors";

const BodySchema = z
  .object({
    displayName: z.string().min(1).max(50),
    expiresAt: z.string().datetime().optional(), // ISO string
  })
  .strict();

function genRoomCode(len = 8) {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++)
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return preflight("POST, OPTIONS", origin);
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  
  try {
    // Allow both authenticated users and guests to create rooms
    const session = await getSession(req);
    const userId = session?.user?.id ?? null;

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
    const { displayName, expiresAt } = parsed.data;

    // unique code
    let code = genRoomCode();
    while (await prisma.room.findUnique({ where: { code } })) {
      code = genRoomCode();
    }

    const room = await prisma.$transaction(async (tx) => {
      const created = await tx.room.create({
        data: {
          code,
          hostId: userId, // Can be null for guest
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          status: "OPEN",
        },
        select: {
          id: true,
          code: true,
          hostId: true,
          status: true,
          expiresAt: true,
          createdAt: true,
        },
      });

      // add host/creator as participant
      await tx.roomParticipant.create({
        data: {
          roomId: created.id,
          userId, // Can be null for guest
          displayName,
          role: userId ? "host" : "member", // Guests are members, not hosts
        },
      });

      return created;
    });

    return withCORS(NextResponse.json({ room }, { status: 201 }), origin);
  } catch (e: unknown) {
    const msg = (e as Error)?.message ?? String(e);
    return withCORS(
      NextResponse.json(
        { error: "ROOM_CREATE_FAILED", details: msg },
        { status: 500 }
      ),
      origin
    );
  }
}
