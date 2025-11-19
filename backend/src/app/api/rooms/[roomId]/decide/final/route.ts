import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { finalDecide, writeMealHistory } from "@/services/decideService";
import { requireAuth } from "@/lib/session";
import { buildMapLinks } from "@/services/mapLink";
import { emitToRoom } from "@/services/realtime";
import { withCORS, preflight } from "@/lib/cors";
import { closeRoom } from "@/services/roomLifecycle";

// ================== CORS ==================
export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return preflight('GET, POST, OPTIONS', origin);
}

// ================== Schemas ==================
const FinalBodySchema = z
  .object({
    center: z
      .object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
      })
      .optional(),
    tiedRestaurantIds: z.array(z.string()).optional(),
  })
  .strict();

// ================== POST: Finalize decision (must be room member) ==================
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ roomId: string }> } // Next.js v15: params is a Promise
) {
  const origin = req.headers.get('origin');
  
  try {
    const { roomId } = await ctx.params;

    // Must be authenticated
    const { userId } = await requireAuth(req);

    // Must be room member
    const isMember = await prisma.roomParticipant.findFirst({
      where: { roomId, userId },
      select: { id: true },
    });
    if (!isMember) {
      return withCORS(
        NextResponse.json({ error: "FORBIDDEN_NOT_MEMBER" }, { status: 403 }),
        origin
      );
    }

    // Parse body (optional center)
    let body: unknown = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    const parsed = FinalBodySchema.safeParse(body);
    if (!parsed.success) {
      return withCORS(
        NextResponse.json(
          { error: "INVALID_BODY", details: parsed.error.flatten() },
          { status: 400 }
        ),
        origin
      );
    }

    // Calculate winner (tie-break in service: votes → rating → distance(center) → no-repeat)
    // If tiedRestaurantIds provided, winner must be one of those restaurants (for draw scenarios)
    const result = await finalDecide(
      roomId,
      parsed.data.center,
      parsed.data.tiedRestaurantIds
    );
    if (!result?.winner) {
      return withCORS(
        NextResponse.json({ error: "NO_WINNER" }, { status: 400 }),
        origin
      );
    }

    // Save decision history (for affected members — service may loop insert per user/room-level)
    await writeMealHistory(roomId, result.winner.restaurantId);

    try {
      await closeRoom(roomId, { removeParticipants: true });
    } catch (closeError) {
      console.warn(
        "[decide/final] Failed to close room after decision",
        closeError
      );
    }

    // Build map links
    const mapLinks = buildMapLinks({
      lat: result.winner.lat,
      lng: result.winner.lng,
      name: result.winner.name,
    });

    // Realtime notify room members
    await emitToRoom(roomId, "decision.finalized", {
      winner: result.winner,
      decidedAt: result.decidedAt ?? new Date().toISOString(),
      mapLinks,
    });

    return withCORS(
      NextResponse.json(
        {
          ...result,
          mapLinks,
        },
        { status: 200 }
      ),
      origin
    );
  } catch (e) {
    const msg = (e as Error)?.message ?? String(e);
    if (msg === "UNAUTHENTICATED") {
      return withCORS(
        NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 }),
        origin
      );
    }
    return withCORS(
      NextResponse.json(
        { error: "FINAL_DECIDE_FAILED", details: msg },
        { status: 500 }
      ),
      origin
    );
  }
}

// ================== GET: Read latest room decision (public) ==================
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ roomId: string }> }
) {
  const origin = req.headers.get('origin');
  
  try {
    const { roomId } = await ctx.params;

    // Read latest history entry for room
    const last = await prisma.mealHistory.findFirst({
      where: { roomId },
      orderBy: { decidedAt: "desc" },
      select: { restaurantId: true, decidedAt: true },
    });

    if (!last) {
      return withCORS(
        NextResponse.json(
          { winner: null, decidedAt: null, mapLinks: null },
          { status: 200 }
        ),
        origin
      );
    }

    // Fetch restaurant data
    const r = await prisma.restaurant.findUnique({
      where: { id: last.restaurantId },
      select: {
        id: true,
        name: true,
        address: true,
        lat: true,
        lng: true,
        rating: true,
      },
    });

    if (!r) {
      // Restaurant deleted or not found
      return withCORS(
        NextResponse.json(
          { winner: null, decidedAt: last.decidedAt, mapLinks: null },
          { status: 200 }
        ),
        origin
      );
    }

    const mapLinks =
      r.lat != null && r.lng != null
        ? buildMapLinks({ lat: r.lat, lng: r.lng, name: r.name })
        : null;

    return withCORS(
      NextResponse.json(
        {
          winner: {
            restaurantId: r.id,
            name: r.name,
            address: r.address,
            lat: r.lat,
            lng: r.lng,
            rating: r.rating ?? null,
          },
          decidedAt: last.decidedAt,
          mapLinks,
        },
        { status: 200 }
      ),
      origin
    );
  } catch (e) {
    return withCORS(
      NextResponse.json(
        { error: "FINAL_GET_FAILED", details: String(e) },
        { status: 500 }
      ),
      origin
    );
  }
}
