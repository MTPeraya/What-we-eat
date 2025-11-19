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
const MAX_BASE64_SIZE = 500_000; // 500KB - files larger than this should use URL/storage

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
          storageKey: z.string().optional(),  // Optional (for legacy)
          publicUrl: z.string().url().nullable().optional(),  // Optional (for legacy)
          base64Data: z.string().refine(
            (val) => {
              if (!val) return true;
              if (!val.startsWith('data:image/') || !val.includes(';base64,')) return false;
              // Check size: base64 is ~33% larger, so decode and check original size
              try {
                const base64Part = val.split(',')[1];
                const decodedSize = (base64Part.length * 3) / 4;
                return decodedSize <= MAX_BASE64_SIZE;
              } catch {
                return false;
              }
            },
            { message: `base64Data must be a valid base64 data URI and file size must be <= ${MAX_BASE64_SIZE} bytes (${Math.round(MAX_BASE64_SIZE / 1024)}KB). For larger files, use publicUrl or storageKey instead.` }
          ).optional(),  // For small files only (< 500KB)
          width: z.number().int().positive().optional(),
          height: z.number().int().positive().optional(),
          mime: z.string().startsWith("image/"),
          sizeBytes: z.number().int().positive().max(MAX_SIZE),
        })
        .refine(
          (val) => {
            // Must have at least one way to access the image
            if (val.base64Data || val.publicUrl || val.storageKey) return true;
            return false;
          },
          { message: "Either base64Data (for files <= 500KB), publicUrl, or storageKey must be provided" }
        )
        .refine(
          (val) => {
            // If file is large, must use URL/storage (not base64)
            if (val.sizeBytes > MAX_BASE64_SIZE && val.base64Data) {
              return false; // Large files should not use base64
            }
            return true;
          },
          { message: `Files larger than ${Math.round(MAX_BASE64_SIZE / 1024)}KB must use publicUrl or storageKey instead of base64Data` }
        )
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
          select: {
            displayName: true,
            username: true,
          }
        },
        photos: {
          select: {
            publicUrl: true,
            base64Data: true,  // Include base64 data
            mime: true,
          } as any, // Type assertion needed because Prisma types may not be updated yet
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const items = ratings.map((r: any) => ({
      id: r.id,
      restaurant: r.restaurant?.name ?? "Unknown",
      author: 
        r.user
          ? (r.user.displayName ?? r.user.username ?? "Anonymous")
          : "Anonymous",
      content: r.comment ?? "",
      status: r.status,
      // Return photos with base64Data if available, otherwise use publicUrl
      photos: (r.photos ?? []).map((p: any) => ({
        publicUrl: p.publicUrl,
        base64Data: p.base64Data, // Will be null for large files
        mime: p.mime,
      })),
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
          data: photos.map((p) => {
            const photoData: {
              ratingId: string;
              storageKey?: string | null;
              publicUrl?: string | null;
              base64Data?: string | null;
              width?: number | null;
              height?: number | null;
              mime: string;
              sizeBytes: number;
            } = {
            ratingId: created.id,
            mime: p.mime,
            sizeBytes: p.sizeBytes,
            };
            
            // Only include fields that are provided
            if (p.storageKey !== undefined) photoData.storageKey = p.storageKey;
            if (p.publicUrl !== undefined) photoData.publicUrl = p.publicUrl;
            if (p.base64Data !== undefined) photoData.base64Data = p.base64Data;
            if (p.width !== undefined) photoData.width = p.width;
            if (p.height !== undefined) photoData.height = p.height;
            
            return photoData;
          }) as any, // Type assertion needed because Prisma types may not be updated yet
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
