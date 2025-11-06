import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { withCORS, preflight } from "@/lib/cors";

// ===== CORS =====
export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return preflight('POST, DELETE, OPTIONS', origin);
}

// ===== Validation =====
const BodySchema = z.object({
  restaurantId: z.string().min(1),
  value: z.enum(["ACCEPT", "REJECT"]),
}).strict();

const DeleteSchema = z.object({
  restaurantId: z.string().min(1),
}).strict();

// ===== POST /api/rooms/:roomId/votes  (create/update vote) =====
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ roomId: string }> }
) {
  const origin = req.headers.get('origin');
  
  try {
    const { roomId } = await ctx.params;
    const { userId } = await requireAuth(req);

    // Must be room member
    const isMember = await prisma.roomParticipant.findFirst({
      where: { roomId, userId },
      select: { id: true },
    });
    if (!isMember) {
      return withCORS(NextResponse.json({ error: "FORBIDDEN_NOT_MEMBER" }, { status: 403 }), origin);
    }

    let json: unknown = {};
    try { json = await req.json(); } catch {}
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return withCORS(
        NextResponse.json({ error: "INVALID_BODY", details: parsed.error.flatten() }, { status: 400 }),
        origin
      );
    }
    const { restaurantId, value } = parsed.data;

    // Upsert vote (unique: roomId+userId+restaurantId)
    const vote = await prisma.vote.upsert({
      where: { roomId_userId_restaurantId: { roomId, userId, restaurantId } },
      update: { value }, // If exists, update value
      create: { roomId, userId, restaurantId, value },
      select: { id: true, value: true, createdAt: true },
    });

    // Tally votes for this restaurant in this room
    const grouped = await prisma.vote.groupBy({
      by: ["value"],
      where: { roomId, restaurantId },
      _count: { _all: true },
    });
    const accept = grouped.find(g => g.value === "ACCEPT")?._count._all ?? 0;
    const reject = grouped.find(g => g.value === "REJECT")?._count._all ?? 0;

    return withCORS(
      NextResponse.json(
        {
          ok: true,
          vote,
          tally: { accept, reject, netScore: accept - reject, total: accept + reject },
        },
        { status: 200 }
      ),
      origin
    );
  } catch (e) {
    const msg = (e as Error)?.message ?? String(e);
    if (msg === "UNAUTHENTICATED") {
      return withCORS(NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 }), origin);
    }
    return withCORS(NextResponse.json({ error: "VOTE_FAILED", details: msg }, { status: 500 }), origin);
  }
}

// ===== DELETE /api/rooms/:roomId/votes  (Cancel own vote for a restaurant) =====
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ roomId: string }> }
) {
  const origin = req.headers.get('origin');
  
  try {
    const { roomId } = await ctx.params;
    const { userId } = await requireAuth(req);

    // Must be room member
    const isMember = await prisma.roomParticipant.findFirst({
      where: { roomId, userId },
      select: { id: true },
    });
    if (!isMember) {
      return withCORS(NextResponse.json({ error: "FORBIDDEN_NOT_MEMBER" }, { status: 403 }), origin);
    }

    let json: unknown = {};
    try { json = await req.json(); } catch {}
    const parsed = DeleteSchema.safeParse(json);
    if (!parsed.success) {
      return withCORS(
        NextResponse.json({ error: "INVALID_BODY", details: parsed.error.flatten() }, { status: 400 }),
        origin
      );
    }
    const { restaurantId } = parsed.data;

    await prisma.vote.delete({
      where: { roomId_userId_restaurantId: { roomId, userId, restaurantId } },
    }).catch(() => undefined); // Silently ignore if not exists

    return withCORS(NextResponse.json({ ok: true }, { status: 200 }), origin);
  } catch (e) {
    const msg = (e as Error)?.message ?? String(e);
    if (msg === "UNAUTHENTICATED") {
      return withCORS(NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 }), origin);
    }
    return withCORS(NextResponse.json({ error: "VOTE_DELETE_FAILED", details: msg }, { status: 500 }), origin);
  }
}
