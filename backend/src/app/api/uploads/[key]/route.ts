// backend/src/app/api/uploads/[key]/route.ts
import { NextRequest, NextResponse } from "next/server";
import storage from "@/lib/storage";

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

function withCORS(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", FRONTEND_ORIGIN);
  res.headers.set("Access-Control-Allow-Methods", "PUT, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.headers.set("Access-Control-Allow-Credentials", "true");
  return res;
}

export async function OPTIONS() {
  return withCORS(new NextResponse(null, { status: 204 }));
}

export async function PUT(
  req: NextRequest,
  ctx: { params: { key: string } }
) {
  try {
    const rawKey = ctx.params.key;                 // key was encodeURIComponent'd
    const key = decodeURIComponent(rawKey);        // decode back to full path
    const contentType = req.headers.get("content-type") ?? "application/octet-stream";

    const ab = await req.arrayBuffer();
    const buf = Buffer.from(ab);

    await storage.putBuffer(key, buf, contentType);

    return withCORS(
      NextResponse.json(
        { ok: true, key, url: storage.publicUrl(key) },
        { status: 201 }
      )
    );
  } catch (e) {
    const msg = (e as Error).message ?? "UPLOAD_FAILED";
    return withCORS(NextResponse.json({ error: msg }, { status: 500 }));
  }
}
