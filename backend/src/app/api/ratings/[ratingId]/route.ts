import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getSession } from "@/lib/session";
import { withCORS, preflight } from "@/lib/cors";
import type { Prisma } from "@prisma/client";

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return preflight('PUT, DELETE, OPTIONS', origin);
}

// ---------- Validation ----------
const UpdateBodySchema = z.object({
  score: z.number().int().min(1).max(5).optional(),
  tags: z.array(z.string().min(1).max(20)).max(10).optional(),
  comment: z.string().max(500).optional(),
}).strict();

// ---------- PUT /api/ratings/[ratingId] - Update Rating ----------
export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ ratingId: string }> }
) {
  const origin = req.headers.get('origin');
  
  try {
    const session = await getSession(req);
    if (!session) {
      return withCORS(
        NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 }),
        origin
      );
    }

    const { ratingId } = await ctx.params;

    // Check if rating exists and user owns it
    const existingRating = await prisma.rating.findUnique({
      where: { id: ratingId },
      select: { userId: true }
    });

    if (!existingRating) {
      return withCORS(
        NextResponse.json({ error: "RATING_NOT_FOUND" }, { status: 404 }),
        origin
      );
    }

    // Only owner can update (admin can't update others' reviews)
    if (existingRating.userId !== session.user.id) {
      return withCORS(
        NextResponse.json({ error: "FORBIDDEN" }, { status: 403 }),
        origin
      );
    }

    const json = (await req.json().catch(() => ({}))) as unknown;
    const parsed = UpdateBodySchema.safeParse(json);
    
    if (!parsed.success) {
      return withCORS(
        NextResponse.json(
          { error: "INVALID_BODY", details: parsed.error.flatten() },
          { status: 400 }
        ),
        origin
      );
    }

    const { score, tags, comment } = parsed.data;

    // Update rating
    await prisma.rating.update({
      where: { id: ratingId },
      data: {
        ...(score !== undefined && { score }),
        ...(tags !== undefined && { tags: tags as unknown as Prisma.InputJsonValue }),
        ...(comment !== undefined && { comment }),
      }
    });

    return withCORS(
      NextResponse.json({ ok: true }, { status: 200 }),
      origin
    );
  } catch (e) {
    const msg = (e as Error)?.message ?? String(e);
    return withCORS(
      NextResponse.json(
        { error: "UPDATE_FAILED", details: msg },
        { status: 500 }
      ),
      origin
    );
  }
}

// ---------- DELETE /api/ratings/[ratingId] - Delete Rating ----------
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ ratingId: string }> }
) {
  const origin = req.headers.get('origin');
  
  try {
    const session = await getSession(req);
    if (!session) {
      return withCORS(
        NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 }),
        origin
      );
    }

    const { ratingId } = await ctx.params;

    // Check if rating exists
    const existingRating = await prisma.rating.findUnique({
      where: { id: ratingId },
      select: { userId: true }
    });

    if (!existingRating) {
      return withCORS(
        NextResponse.json({ error: "RATING_NOT_FOUND" }, { status: 404 }),
        origin
      );
    }

    // Admin can delete any, user can delete their own
    const isAdmin = session.user.role === "ADMIN";
    const isOwner = existingRating.userId === session.user.id;

    if (!isAdmin && !isOwner) {
      return withCORS(
        NextResponse.json({ error: "FORBIDDEN" }, { status: 403 }),
        origin
      );
    }

    // Delete rating (photos will cascade delete if set in schema)
    await prisma.rating.delete({
      where: { id: ratingId }
    });

    return withCORS(
      NextResponse.json({ ok: true }, { status: 200 }),
      origin
    );
  } catch (e) {
    const msg = (e as Error)?.message ?? String(e);
    return withCORS(
      NextResponse.json(
        { error: "DELETE_FAILED", details: msg },
        { status: 500 }
      ),
      origin
    );
  }
}

