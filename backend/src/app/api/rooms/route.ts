import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/session";
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

export async function OPTIONS() {
  return preflight("POST, OPTIONS");
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth(req);

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
        )
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
          hostId: userId,
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

      // add host as participant
      await tx.roomParticipant.create({
        data: {
          roomId: created.id,
          userId,
          displayName,
          role: "host",
        },
      });

      return created;
    });

    const res = NextResponse.json({ room }, { status: 201 });
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
      { error: "ROOM_CREATE_FAILED", details: msg },
      { status: 500 }
    );
    res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    return withCORS(res);
  }
}
