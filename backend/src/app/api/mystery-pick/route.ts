import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { writeMealHistory } from "@/services/decideService";
import { getSession } from "@/lib/session";
import { buildMapLinks } from "@/services/mapLink";
import { withCORS, preflight } from "@/lib/cors";
import { closeRoom, computeRoomExpiry, generateRoomCode } from "@/services/roomLifecycle";
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
    displayName: z.string().min(1).max(50).optional().default("Guest"),
  })
  .strict();

// ================== POST: Mystery Pick - Auto-create room and pick random restaurant ==================
export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  
  try {
    // Allow both authenticated users and guests
    const session = await getSession(req);
    const userId = session?.user?.id ?? null;

    // Parse body
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

    const { center, radiusKm, displayName } = parsed.data;

    // Auto-create a room for mystery pick
    let code = generateRoomCode();
    while (await prisma.room.findUnique({ where: { code } })) {
      code = generateRoomCode();
    }
    const defaultExpiry = computeRoomExpiry();

    const room = await prisma.$transaction(async (tx) => {
      const created = await tx.room.create({
        data: {
          code,
          hostId: userId,
          expiresAt: defaultExpiry,
          status: "OPEN",
          centerLat: center.lat,
          centerLng: center.lng,
        },
        select: {
          id: true,
          code: true,
          hostId: true,
          status: true,
        },
      });

      // Add creator as participant
      await tx.roomParticipant.create({
        data: {
          roomId: created.id,
          userId,
          displayName,
          role: userId ? "host" : "member",
        },
      });

      return created;
    });

    const roomId = room.id;

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
      // Clean up the room if no restaurants found
      try {
        await closeRoom(roomId, { removeParticipants: true });
      } catch {}
      
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
      // Clean up the room if restaurant not found
      try {
        await closeRoom(roomId, { removeParticipants: true });
      } catch {}
      
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

    return withCORS(
      NextResponse.json(
        {
          winner,
          reason: { rule: "mystery-pick", radiusKm },
          scores: [],
          decidedAt: decidedAtISO,
          mapLinks,
          isMysteryPick: true,
          roomId,
        },
        { status: 200 }
      ),
      origin
    );
  } catch (e) {
    const msg = (e as Error)?.message ?? String(e);
    return withCORS(
      NextResponse.json(
        { error: "MYSTERY_PICK_FAILED", details: msg },
        { status: 500 }
      ),
      origin
    );
  }
}

