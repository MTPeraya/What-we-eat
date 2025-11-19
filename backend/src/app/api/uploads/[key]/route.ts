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
  ctx: { params: Promise<{ key: string }> }
) {
  const origin = req.headers.get('origin');
  
  try {
    const { key: rawKey } = await ctx.params;
    const key = decodeURIComponent(rawKey);        // decode back to full path
    const contentType = req.headers.get("content-type") ?? "application/octet-stream";

    const ab = await req.arrayBuffer();
    const buf = Buffer.from(ab);
    const fileSize = buf.length;

    // Save to storage (always)
    await storage.putBuffer(key, buf, contentType);
    const publicUrl = storage.publicUrl(key);

    // Only convert to base64 for small files (< 500KB) to avoid database bloat
    // Base64 encoding increases size by ~33%, so 500KB file becomes ~667KB in database
    const MAX_BASE64_SIZE = 500_000; // 500KB
    const response: { ok: boolean; key: string; url: string; base64Data?: string } = {
      ok: true,
      key,
      url: publicUrl,
    };

    if (fileSize <= MAX_BASE64_SIZE) {
      // For small files, also provide base64 for direct database storage
      const base64 = buf.toString('base64');
      response.base64Data = `data:${contentType};base64,${base64}`;
    }
    // For large files, only return URL (must use storage)

    return withCORS(
      NextResponse.json(response, { status: 201 }),
      origin
    );
  } catch (e) {
    const msg = (e as Error).message ?? "UPLOAD_FAILED";
    return withCORS(NextResponse.json({ error: msg }, { status: 500 }), origin);
  }
}
