// backend/src/app/api/ratings/[ratingId]/approve/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/session";
import { withCORS, preflight } from "@/lib/cors";

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return preflight('POST, OPTIONS', origin);
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ ratingId: string }> }
) {
  const origin = req.headers.get('origin');
  
  try {
    // Use getSession to check role
    const s = await getSession(req);
    if (!s) {
      return withCORS(NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 }), origin);
    }
    if (s.user.role !== "ADMIN") {
      return withCORS(NextResponse.json({ error: "FORBIDDEN" }, { status: 403 }), origin);
    }

    const { ratingId } = await ctx.params;

    await prisma.$transaction(async (tx) => {
      // Approve rating
      await tx.rating.update({
        where: { id: ratingId },
        data: { status: "approved" },
      });

      // Note: Current schema's RatingPhoto doesn't have status field
      // If adding status to photos in future, enable this:
      //
      // await tx.ratingPhoto.updateMany({
      //   where: { ratingId },
      //   data: { status: "approved" },
      // });
    });

    return withCORS(NextResponse.json({ ok: true }, { status: 200 }), origin);
  } catch (e) {
    const msg = (e as Error)?.message ?? String(e);
    return withCORS(
      NextResponse.json({ error: "APPROVE_FAILED", details: msg }, { status: 500 }),
      origin
    );
  }
}
