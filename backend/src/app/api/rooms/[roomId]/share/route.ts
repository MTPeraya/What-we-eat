import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { createShortLink } from "@/services/shortLinkService";
import QRCode from "qrcode";

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

const BodySchema = z
  .object({
    ttlMinutes: z.number().int().min(1).max(60 * 24).optional(), // max age = 1 day
  })
  .strict();

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ roomId: string }> }
) {
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
        NextResponse.json({ error: "FORBIDDEN_NOT_MEMBER" }, { status: 403 })
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
        NextResponse.json({ error: "NO_DECISION" }, { status: 400 })
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
        )
      );
    }

    // target = Result ฝั่ง FE (set path same as web)
    // ex: https://frontend/result/ROOM_ID
    const targetUrl = `${FRONTEND_ORIGIN}/result/${encodeURIComponent(roomId)}`;

    // create short link
    const row = await createShortLink({
      targetUrl,
      roomId,
      createdBy: userId,
      ttlMinutes: parsed.data.ttlMinutes ?? 60 * 24, // default 24 ชม.
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
      )
    );
  } catch (e) {
    const msg = (e as Error)?.message ?? String(e);
    if (msg === "UNAUTHENTICATED") {
      return withCORS(
        NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 })
      );
    }
    return withCORS(
      NextResponse.json({ error: "SHARE_CREATE_FAILED", details: msg }, { status: 500 })
    );
  }
}
