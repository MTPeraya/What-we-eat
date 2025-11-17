//backend/src/app/api/ratings/[ratingId]/delete/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/session";
import { withCORS, preflight } from "@/lib/cors";

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin");
  return preflight("DELETE, OPTIONS", origin);
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ ratingId: string }> }
) {
  const origin = req.headers.get("origin");

  try {
    const s = await getSession(req);
    if (!s) return withCORS(NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 }), origin);
    if (s.user.role !== "ADMIN")
      return withCORS(NextResponse.json({ error: "FORBIDDEN" }, { status: 403 }), origin);

    const { ratingId } = await ctx.params;

    await prisma.$transaction(async (tx) => {
      await tx.ratingPhoto.deleteMany({ where: { ratingId } });
      await tx.rating.delete({ where: { id: ratingId } });
    });

    return withCORS(NextResponse.json({ ok: true }), origin);
  } catch (err) {
    return withCORS(
      NextResponse.json({ error: "DELETE_FAILED", details: String(err) }, { status: 500 }),
      origin
    );
  }
}
