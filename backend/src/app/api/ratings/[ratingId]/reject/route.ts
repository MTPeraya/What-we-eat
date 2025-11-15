//backend/src/app/api/ratings/[ratingId]/reject/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/session";
import { withCORS, preflight } from "@/lib/cors";

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin");
  return preflight("POST, OPTIONS", origin);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { ratingId: string } }
) {
  const origin = req.headers.get("origin");

  try {
    const s = await getSession(req);
    if (!s) return withCORS(NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 }), origin);
    if (s.user.role !== "ADMIN")
      return withCORS(NextResponse.json({ error: "FORBIDDEN" }, { status: 403 }), origin);

    await prisma.rating.update({
      where: { id: params.ratingId },
      data: { status: "rejected" },
    });

    return withCORS(NextResponse.json({ ok: true }), origin);
  } catch (err) {
    return withCORS(
      NextResponse.json({ error: "REJECT_FAILED", details: String(err) }, { status: 500 }),
      origin
    );
  }
}
