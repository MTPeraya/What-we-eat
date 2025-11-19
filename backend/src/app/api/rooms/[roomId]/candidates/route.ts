import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { buildCandidates } from "@/services/recoService";
import { withCORS, preflight } from "@/lib/cors";

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  console.log("[candidates] OPTIONS request from origin:", origin);
  const res = preflight('POST, OPTIONS', origin);
  console.log("[candidates] OPTIONS response headers:", Object.fromEntries(res.headers.entries()));
  return res;
}

const BodySchema = z
  .object({
    center: z
      .object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
      })
      .optional(),
    limit: z.number().int().min(1).max(50).optional(),
  })
  .strict();

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ roomId: string }> }
) {
  const origin = req.headers.get('origin');
  console.log("[candidates] POST request from origin:", origin);
  let roomId: string | undefined;
  
  try {
    roomId = (await ctx.params).roomId;
    console.log("[candidates] Processing request for roomId:", roomId);
    const { userId } = await requireAuth(req);
    console.log("[candidates] User authenticated:", userId);

    // Check room exists and status
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { id: true, status: true },
    });
    if (!room) {
      return withCORS(NextResponse.json({ error: "ROOM_NOT_FOUND" }, { status: 404 }), origin);
    }
    if (room.status !== "STARTED") {
      return withCORS(NextResponse.json({ error: "ROOM_NOT_STARTED" }, { status: 400 }), origin);
    }

    // Must be room member
    const isMember = await prisma.roomParticipant.findFirst({
      where: { roomId, userId },
      select: { id: true },
    });
    if (!isMember) {
      return withCORS(NextResponse.json({ error: "FORBIDDEN_NOT_MEMBER" }, { status: 403 }), origin);
    }

    // body
    let body: unknown = {};
    try { body = await req.json(); } catch {}
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return withCORS(
        NextResponse.json({ error: "INVALID_BODY", details: parsed.error.flatten() }, { status: 400 }),
        origin
      );
    }

    const started = Date.now();
    console.log("[candidates] Calling buildCandidates with:", {
      roomId,
      center: parsed.data.center,
      limit: parsed.data.limit ?? 24,
    });
    const cands = await buildCandidates({
      roomId,
      center: parsed.data.center,
      limit: parsed.data.limit ?? 24,
    });
    const tookMs = Date.now() - started;
    console.log("[candidates] buildCandidates returned", cands.length, "candidates");

    // Basic metrics
    console.log("[reco] candidates", {
      roomId,
      count: cands.length,
      ms: tookMs,
    });

    const response = withCORS(
      NextResponse.json(
        {
          roomId,
          count: cands.length,
          tookMs,
          items: cands.map((c) => ({
            restaurantId: c.id,
            name: c.name,
            address: c.address ?? "",
            lat: c.lat,
            lng: c.lng,
            rating: c.rating ?? null,
            priceLevel: c.priceLevel ?? null,
            score: Math.round(c.score * 10) / 10,
            reasons: c.reasons,
            distanceM: c.distanceM ?? null,
          })),
        },
        { status: 200 }
      ),
      origin
    );
    console.log("[candidates] Success response headers:", Object.fromEntries(response.headers.entries()));
    return response;
  } catch (e) {
    const msg = (e as Error)?.message ?? String(e);
    const stack = (e as Error)?.stack;
    console.error("[candidates] Error:", { roomId: roomId || "unknown", error: msg, stack });
    
    // Always return CORS-enabled response, even on error
    let errorResponse: NextResponse;
    if (msg === "UNAUTHENTICATED") {
      errorResponse = withCORS(NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 }), origin);
    } else {
      errorResponse = withCORS(NextResponse.json({ error: "CANDIDATES_FAILED", details: msg }, { status: 500 }), origin);
    }
    console.log("[candidates] Error response headers:", Object.fromEntries(errorResponse.headers.entries()));
    return errorResponse;
  }
}
