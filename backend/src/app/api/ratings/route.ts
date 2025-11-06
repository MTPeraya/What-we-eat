import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/session";
import type { Prisma } from "@prisma/client";

// ---------- CORS ----------
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

// ---------- Validation ----------
const MAX_SIZE = Number(process.env.RATING_PHOTO_MAX_BYTES ?? 5_000_000); // 5MB

// Accept either: restaurantId or placeId
const BodySchema = z.object({
  roomId: z.string().optional(),
  restaurantId: z.string().optional(),
  placeId: z.string().optional(),
  score: z.number().int().min(1).max(5),
  tags: z.array(z.string().min(1).max(20)).max(10).optional(),
  comment: z.string().max(500).optional(),
  photos: z
    .array(
      z.object({
        storageKey: z.string(),
        publicUrl: z.string().url().nullable().optional(),
        width: z.number().int().positive().optional(),
        height: z.number().int().positive().optional(),
        mime: z.string().startsWith("image/"),
        sizeBytes: z.number().int().positive().max(MAX_SIZE),
      })
    )
    .max(3)
    .optional(),
})
.refine(v => !!v.restaurantId || !!v.placeId, {
  message: "restaurantId or placeId is required",
  path: ["restaurantId"],
})
.strict();

// ---------- POST /api/ratings ----------
export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth(req);

    const json = (await req.json().catch(() => ({}))) as unknown;
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return withCORS(
        NextResponse.json(
          { error: "INVALID_BODY", details: parsed.error.flatten() },
          { status: 400 }
        )
      );
    }

    const { roomId, restaurantId, placeId, score, tags, comment, photos = [] } =
      parsed.data;

    // Convert placeId -> restaurantId if needed
    let resolvedRestaurantId = restaurantId ?? null;
    if (!resolvedRestaurantId && placeId) {
      const r = await prisma.restaurant.findUnique({
        where: { placeId },
        select: { id: true },
      });
      if (!r) {
        return withCORS(
          NextResponse.json({ error: "RESTAURANT_NOT_FOUND" }, { status: 404 })
        );
      }
      resolvedRestaurantId = r.id;
    }

    // Create rating + photos (status default = pending)
    const createdId = await prisma.$transaction(async (tx) => {
      const created = await tx.rating.create({
        data: {
          roomId: roomId ?? null,
          userId,
          restaurantId: resolvedRestaurantId!, // Resolved value guaranteed
          score,
          tags: tags ? (tags as unknown as Prisma.InputJsonValue) : undefined,
          comment: comment ?? null,
        },
        select: { id: true },
      });

      if (photos.length) {
        await tx.ratingPhoto.createMany({
          data: photos.map((p) => ({
            ratingId: created.id,
            storageKey: p.storageKey,
            publicUrl: p.publicUrl ?? null,
            width: p.width ?? null,
            height: p.height ?? null,
            mime: p.mime,
            sizeBytes: p.sizeBytes,
          })),
        });
      }
      return created.id;
    });

    return withCORS(
      NextResponse.json({ ok: true, ratingId: createdId }, { status: 201 })
    );
  } catch (e) {
    const msg = (e as Error)?.message ?? String(e);
    if (msg === "UNAUTHENTICATED") {
      return withCORS(
        NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 })
      );
    }
    return withCORS(
      NextResponse.json(
        { error: "RATING_CREATE_FAILED", details: msg },
        { status: 500 }
      )
    );
  }
}
