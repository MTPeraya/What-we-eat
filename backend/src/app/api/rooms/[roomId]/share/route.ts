import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { createShortLink } from "@/services/shortLinkService";
import QRCode from "qrcode";
import { withCORS, preflight } from "@/lib/cors";

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return preflight('POST, OPTIONS', origin);
}

const BodySchema = z
  .object({
    ttlMinutes: z.number().int().min(1).max(60 * 24).optional(), // max age = 1 day
  })
  .strict();

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ roomId: string }> }
) {
  const origin = req.headers.get('origin');
  const FRONTEND_ORIGIN = origin || 'https://what-we-eat.vercel.app';
  
  try {
    const { roomId } = await ctx.params;
    const { userId } = await requireAuth(req);

    // check room member
    const isMember = await prisma.roomParticipant.findFirst({
      where: { roomId, userId },
      select: { id: true },
    });
    if (!isMember) {
      return withCORS(
        NextResponse.json({ error: "FORBIDDEN_NOT_MEMBER" }, { status: 403 }),
        origin
      );
    }

    // must have the latest decision results
    const last = await prisma.mealHistory.findFirst({
      where: { roomId },
      orderBy: { decidedAt: "desc" },
      select: { decidedAt: true },
    });
    if (!last) {
      return withCORS(
        NextResponse.json({ error: "NO_DECISION" }, { status: 400 }),
        origin
      );
    }

    // read body
    let body: unknown = {};
    try {
      body = await req.json();
    } catch {}
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return withCORS(
        NextResponse.json(
          { error: "INVALID_BODY", details: parsed.error.flatten() },
          { status: 400 }
        ),
        origin
      );
    }

    // target = Frontend Result page (set path same as web)
    // ex: https://frontend/result/ROOM_ID
    const targetUrl = `${FRONTEND_ORIGIN}/result/${encodeURIComponent(roomId)}`;

    // create short link
    const row = await createShortLink({
      targetUrl,
      roomId,
      createdBy: userId,
      ttlMinutes: parsed.data.ttlMinutes ?? 60 * 24, // default 24 hours
    });

    // base of backend use from request
    const backendOrigin = req.nextUrl.origin;
    const shortUrl = `${backendOrigin}/api/short/${row.code}`;

    // create QR (data URL) for show
    const qrDataUrl = await QRCode.toDataURL(shortUrl, {
      errorCorrectionLevel: "M",
      margin: 1,
      scale: 4,
    });

    return withCORS(
      NextResponse.json(
        {
          roomId,
          shortUrl,
          targetUrl,
          expireAt: row.expireAt,
          qrDataUrl, // data:image/png;base64,...
        },
        { status: 201 }
      ),
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
      NextResponse.json({ error: "SHARE_CREATE_FAILED", details: msg }, { status: 500 }),
      origin
    );
  }
}
