// backend/src/app/api/short/[code]/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withCORS, preflight } from "@/lib/cors";

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return preflight('GET, HEAD, OPTIONS', origin);
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ code: string }> }
) {
  const origin = _req.headers.get('origin');
  
  try {
    const { code } = await ctx.params;

    const link = await prisma.shortLink.findUnique({
      where: { code },
      select: { targetUrl: true, expireAt: true },
    });

    if (!link) {
      return withCORS(
        NextResponse.json({ error: "NOT_FOUND" }, { status: 404 }),
        origin
      );
    }
    
    if (link.expireAt && link.expireAt.getTime() < Date.now()) {
      return withCORS(
        NextResponse.json({ error: "EXPIRED" }, { status: 404 }),
        origin
      );
    }

    const res = new NextResponse(null, { status: 302 });
    res.headers.set("Location", link.targetUrl);
    res.headers.set("Cache-Control", "no-store, must-revalidate");
    return withCORS(res, origin);
  } catch (e) {
    return withCORS(
      NextResponse.json(
        { error: "REDIRECT_FAILED", details: String(e) },
        { status: 500 }
      ),
      origin
    );
  }
}

export async function HEAD(
  _req: NextRequest,
  ctx: { params: Promise<{ code: string }> }
) {
  const origin = _req.headers.get('origin');
  
  try {
    const { code } = await ctx.params;
    const link = await prisma.shortLink.findUnique({
      where: { code },
      select: { expireAt: true },
    });
    
    if (!link || (link.expireAt && link.expireAt.getTime() < Date.now())) {
      return withCORS(
        new NextResponse(null, { status: 404 }),
        origin
      );
    }
    
    return withCORS(
      new NextResponse(null, { status: 200 }),
      origin
    );
  } catch {
    return withCORS(
      new NextResponse(null, { status: 500 }),
      origin
    );
  }
}
