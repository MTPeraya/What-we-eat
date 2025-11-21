import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { writeMealHistory } from "@/services/decideService";
import { requireAuth } from "@/lib/session";
import { buildMapLinks } from "@/services/mapLink";
import { emitToRoom } from "@/services/realtime";
import { withCORS, preflight } from "@/lib/cors";
import { closeRoom } from "@/services/roomLifecycle";
import { buildCandidates } from "@/services/recoService";

// ================== CORS ==================
export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return preflight('POST, OPTIONS', origin);
}

// ================== Schemas ==================
const MysteryPickBodySchema = z
  .object({
    center: z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    }),
    radiusKm: z.number().min(0.1).max(50).optional().default(5), // Default 5km radius
  })
  .strict();

// ================== POST: Mystery Pick - Random restaurant within radius ==================
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ roomId: string }> }
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

    // Parse body (center is required for mystery pick)
    let body: unknown = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    const parsed = MysteryPickBodySchema.safeParse(body);
    if (!parsed.success) {
      return withCORS(
        NextResponse.json(
          { error: "INVALID_BODY", details: parsed.error.flatten() },
          { status: 400 }
        ),
        origin
      );
    }

    const { center, radiusKm } = parsed.data;

    // Build candidates within radius
    const candidates = await buildCandidates({
      roomId,
      center,
      limit: 100, // Get more candidates to filter by radius
      providerLimit: 120,
    });

    // Filter by radius (convert km to meters)
    const radiusM = radiusKm * 1000;
    const withinRadius = candidates.filter((c) => {
      if (c.distanceM == null) return false;
      return c.distanceM <= radiusM;
    });

    if (withinRadius.length === 0) {
      return withCORS(
        NextResponse.json(
          { error: "NO_RESTAURANTS_IN_RADIUS", radiusKm },
          { status: 404 }
        ),
        origin
      );
    }

    // Randomly pick one restaurant
    const randomIndex = Math.floor(Math.random() * withinRadius.length);
    const picked = withinRadius[randomIndex];

    // Fetch full restaurant data
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: picked.id },
      select: {
        id: true,
        name: true,
        address: true,
        lat: true,
        lng: true,
        rating: true,
      },
    });

    if (!restaurant) {
      return withCORS(
        NextResponse.json({ error: "RESTAURANT_NOT_FOUND" }, { status: 404 }),
        origin
      );
    }

    // Save decision history
    await writeMealHistory(roomId, restaurant.id);

    // Close room
    try {
      await closeRoom(roomId, { removeParticipants: true });
    } catch (closeError) {
      console.warn(
        "[mystery-pick] Failed to close room after decision",
        closeError
      );
    }

    // Build map links
    const mapLinks = buildMapLinks({
      lat: Number(restaurant.lat),
      lng: Number(restaurant.lng),
      name: restaurant.name,
    });

    const winner = {
      restaurantId: restaurant.id,
      name: restaurant.name,
      address: restaurant.address ?? null,
      lat: Number(restaurant.lat),
      lng: Number(restaurant.lng),
      rating: restaurant.rating ?? null,
      netScore: 0, // Mystery pick doesn't use votes
      approval: 0,
    };

    const decidedAtISO = new Date().toISOString();

    // Realtime notify room members
    await emitToRoom(roomId, "decision.finalized", {
      winner,
      decidedAt: decidedAtISO,
      mapLinks,
      isMysteryPick: true,
    });

    return withCORS(
      NextResponse.json(
        {
          winner,
          reason: { rule: "mystery-pick", radiusKm },
          scores: [],
          decidedAt: decidedAtISO,
          mapLinks,
          isMysteryPick: true,
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
        { error: "MYSTERY_PICK_FAILED", details: msg },
        { status: 500 }
      ),
      origin
    );
  }
}

