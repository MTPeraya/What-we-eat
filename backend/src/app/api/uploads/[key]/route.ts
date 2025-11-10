// backend/src/app/api/uploads/[key]/route.ts
import { NextRequest, NextResponse } from "next/server";
import storage from "@/lib/storage";
import { withCORS, preflight } from "@/lib/cors";

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return preflight('PUT, OPTIONS', origin);
}

export async function PUT(
  req: NextRequest,
  ctx: { params: { key: string } }
) {
  const origin = req.headers.get('origin');
  
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
      ),
      origin
    );
  } catch (e) {
    const msg = (e as Error).message ?? "UPLOAD_FAILED";
    return withCORS(NextResponse.json({ error: msg }, { status: 500 }), origin);
  }
}
