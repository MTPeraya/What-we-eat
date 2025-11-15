import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { withCORS, preflight } from "@/lib/cors";

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return preflight('DELETE, OPTIONS', origin);
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const origin = req.headers.get('origin');
  
  try {
    const { userId } = await requireAuth(req);
    const { id } = await ctx.params;

    // Delete only if owner
    const row = await prisma.mealHistory.findUnique({ where: { id } });
    if (!row || row.userId !== userId) {
      return withCORS(NextResponse.json({ error: "NOT_FOUND_OR_FORBIDDEN" }, { status: 404 }), origin);
    }

    await prisma.mealHistory.delete({ where: { id } });

    return withCORS(NextResponse.json({ ok: true }, { status: 200 }), origin);
  } catch (e) {
    const msg = (e as Error)?.message ?? String(e);
    if (msg === "UNAUTHENTICATED") {
      return withCORS(NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 }), origin);
    }
    return withCORS(NextResponse.json({ error: "HISTORY_DELETE_FAILED", details: msg }, { status: 500 }), origin);
  }
}
