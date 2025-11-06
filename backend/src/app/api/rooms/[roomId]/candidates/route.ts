import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { buildCandidates } from "@/services/recoService";

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";
function withCORS(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", FRONTEND_ORIGIN);
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.headers.set("Access-Control-Allow-Credentials", "true");
  return res;
}
export async function OPTIONS() {
  return withCORS(new NextResponse(null, { status: 204 }));
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
  try {
    const { roomId } = await ctx.params;
    const { userId } = await requireAuth(req);

    // Must be room member
    const isMember = await prisma.roomParticipant.findFirst({
      where: { roomId, userId },
      select: { id: true },
    });
    if (!isMember) {
      return withCORS(NextResponse.json({ error: "FORBIDDEN_NOT_MEMBER" }, { status: 403 }));
    }

    // body
    let body: unknown = {};
    try { body = await req.json(); } catch {}
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return withCORS(
        NextResponse.json({ error: "INVALID_BODY", details: parsed.error.flatten() }, { status: 400 })
      );
    }

    const started = Date.now();
    const cands = await buildCandidates({
      roomId,
      center: parsed.data.center,
      limit: parsed.data.limit ?? 24,
    });
    const tookMs = Date.now() - started;

    // Basic metrics
    console.log("[reco] candidates", {
      roomId,
      count: cands.length,
      ms: tookMs,
    });

    return withCORS(
      NextResponse.json(
        {
          roomId,
          count: cands.length,
          tookMs,
          items: cands.map((c) => ({
            restaurantId: c.id,
            name: c.name,
            address: c.address,
            lat: c.lat,
            lng: c.lng,
            rating: c.rating,
            priceLevel: c.priceLevel,
            score: Math.round(c.score * 10) / 10,
            reasons: c.reasons,
            distanceM: c.distanceM ?? null,
          })),
        },
        { status: 200 }
      )
    );
  } catch (e) {
    const msg = (e as Error)?.message ?? String(e);
    if (msg === "UNAUTHENTICATED") {
      return withCORS(NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 }));
    }
    return withCORS(NextResponse.json({ error: "CANDIDATES_FAILED", details: msg }, { status: 500 }));
  }
}
