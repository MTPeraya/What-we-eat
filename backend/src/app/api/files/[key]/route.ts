import { NextRequest, NextResponse } from "next/server";
import { extname } from "node:path";
import storage from "@/lib/storage";
import { withCORS, preflight } from "@/lib/cors";

export const runtime = "nodejs"; // Prevent edge runtime

function mimeFromExt(ext: string) {
  const t = ext.toLowerCase();
  if (t === ".jpg" || t === ".jpeg") return "image/jpeg";
  if (t === ".png") return "image/png";
  if (t === ".webp") return "image/webp";
  if (t === ".gif") return "image/gif";
  if (t === ".svg") return "image/svg+xml";
  return "application/octet-stream";
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return preflight('GET, OPTIONS', origin);
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ key: string }> }
) {
  const origin = req.headers.get('origin');
  
  try {
  const { key: rawKey } = await ctx.params;
  const key = decodeURIComponent(rawKey);

  if (storage.exists && !(await storage.exists(key))) {
      return withCORS(
        NextResponse.json({ error: "NOT_FOUND" }, { status: 404 }),
        origin
      );
  }

    const buf = await storage.getBuffer(key);
    const body = new Uint8Array(buf);

  const ext = extname(key);
    const res = new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": mimeFromExt(ext),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
    
    return withCORS(res, origin);
  } catch (e) {
    return withCORS(
      NextResponse.json({ error: "FILE_NOT_FOUND", details: String(e) }, { status: 404 }),
      origin
    );
  }
}
