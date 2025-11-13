import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { Prisma, RatingStatus } from "@prisma/client"; // ✅ fixed import
import { withCORS, preflight } from "@/lib/cors";

// ---------- CORS ----------
export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin");
  return preflight("POST, OPTIONS", origin);
}

// ---------- Validation ----------
const MAX_SIZE = Number(process.env.RATING_PHOTO_MAX_BYTES ?? 5_000_000); // 5MB

// Accept either: restaurantId or placeId
const BodySchema = z
  .object({
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
  .refine((v) => !!v.restaurantId || !!v.placeId, {
    message: "restaurantId or placeId is required",
    path: ["restaurantId"],
  })
  .strict();

// ---------- GET /api/ratings ----------
export async function GET(req: NextRequest) {
  const origin = req.headers.get("origin");

  try {
    await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    // ✅ fix type-safe Prisma filter
    const where: Prisma.RatingWhereInput =
      status && Object.values(RatingStatus).includes(status as RatingStatus)
        ? { status: status as RatingStatus }
        : {};

    const ratings = await prisma.rating.findMany({
      where,
      include: {
        restaurant: {
          select: { name: true },
        },
        user: {
          select: { name: true },
        },
        photos: {
          select: {
            publicUrl: true,
            mime: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const items = ratings.map((r) => ({
      id: r.id,
      restaurant: r.restaurant?.name ?? "Unknown",
      author: r.user?.name ?? "Anonymous",
      content: r.comment ?? "",
      status: r.status,
      photos: r.photos ?? [],
      score: r.score,
      createdAt: r.createdAt,
    }));

    return withCORS(NextResponse.json({ ok: true, items }), origin);
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
        { error: "RATING_FETCH_FAILED", details: msg },
        { status: 500 }
      ),
      origin
    );
  }
}

// ---------- POST /api/ratings ----------
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");

  try {
    const { userId } = await requireAuth(req);

    const json = (await req.json().catch(() => ({}))) as unknown;
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return withCORS(
        NextResponse.json(
          { error: "INVALID_BODY", details: parsed.error.flatten() },
          { status: 400 }
        ),
        origin
      );
    }

    const { roomId, restaurantId, placeId, score, tags, comment, photos = [] } =
      parsed.data;

    let resolvedRestaurantId = restaurantId ?? null;
    if (!resolvedRestaurantId && placeId) {
      const r = await prisma.restaurant.findUnique({
        where: { placeId },
        select: { id: true },
      });
      if (!r) {
        return withCORS(
          NextResponse.json({ error: "RESTAURANT_NOT_FOUND" }, { status: 404 }),
          origin
        );
      }
      resolvedRestaurantId = r.id;
    }

    const createdId = await prisma.$transaction(async (tx) => {
      const created = await tx.rating.create({
        data: {
          roomId: roomId ?? null,
          userId,
          restaurantId: resolvedRestaurantId!,
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
      NextResponse.json({ ok: true, ratingId: createdId }, { status: 201 }),
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
        { error: "RATING_CREATE_FAILED", details: msg },
        { status: 500 }
      ),
      origin
    );
  }
}
