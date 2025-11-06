import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/session";

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";
function withCORS(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", FRONTEND_ORIGIN);
  res.headers.set("Access-Control-Allow-Methods", "DELETE, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.headers.set("Access-Control-Allow-Credentials", "true");
  return res;
}
export async function OPTIONS() {
  return withCORS(new NextResponse(null, { status: 204 }));
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireAuth(req);
    const { id } = await ctx.params;

    // Delete only if owner
    const row = await prisma.mealHistory.findUnique({ where: { id } });
    if (!row || row.userId !== userId) {
      return withCORS(NextResponse.json({ error: "NOT_FOUND_OR_FORBIDDEN" }, { status: 404 }));
    }

    await prisma.mealHistory.delete({ where: { id } });

    return withCORS(NextResponse.json({ ok: true }, { status: 200 }));
  } catch (e) {
    const msg = (e as Error)?.message ?? String(e);
    if (msg === "UNAUTHENTICATED") {
      return withCORS(NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 }));
    }
    return withCORS(NextResponse.json({ error: "HISTORY_DELETE_FAILED", details: msg }, { status: 500 }));
  }
}
