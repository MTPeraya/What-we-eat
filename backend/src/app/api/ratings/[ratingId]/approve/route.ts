// backend/src/app/api/ratings/[ratingId]/approve/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/session";

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

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ ratingId: string }> }
) {
  try {
    // Use getSession to check role
    const s = await getSession(req);
    if (!s) {
      return withCORS(NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 }));
    }
    if (s.user.role !== "ADMIN") {
      return withCORS(NextResponse.json({ error: "FORBIDDEN" }, { status: 403 }));
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

    return withCORS(NextResponse.json({ ok: true }, { status: 200 }));
  } catch (e) {
    const msg = (e as Error)?.message ?? String(e);
    return withCORS(
      NextResponse.json({ error: "APPROVE_FAILED", details: msg }, { status: 500 })
    );
  }
}
