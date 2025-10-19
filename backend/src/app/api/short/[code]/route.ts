// backend/src/app/api/s/[code]/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ code: string }> }
) {
  const { code } = await ctx.params;

  const link = await prisma.shortLink.findUnique({
    where: { code },
    select: { targetUrl: true, expireAt: true },
  });

  if (!link) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (link.expireAt && link.expireAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "EXPIRED" }, { status: 404 });
  }

  const res = new NextResponse(null, { status: 302 });
  res.headers.set("Location", link.targetUrl);
  res.headers.set("Cache-Control", "no-store, must-revalidate");
  return res;
}

export async function HEAD(
  _req: NextRequest,
  ctx: { params: Promise<{ code: string }> }
) {
  const { code } = await ctx.params;
  const link = await prisma.shortLink.findUnique({
    where: { code },
    select: { expireAt: true },
  });
  if (!link || (link.expireAt && link.expireAt.getTime() < Date.now())) {
    return new NextResponse(null, { status: 404 });
  }
  return new NextResponse(null, { status: 200 });
}
