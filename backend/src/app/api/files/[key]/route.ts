import { NextRequest, NextResponse } from "next/server";
import { extname } from "node:path";
import storage from "@/lib/storage";
import { preflight } from "@/lib/cors";

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
  _req: NextRequest,
  ctx: { params: Promise<{ key: string }> }
) {
  const { key: rawKey } = await ctx.params;
  const key = decodeURIComponent(rawKey);

  if (storage.exists && !(await storage.exists(key))) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const buf = await storage.getBuffer(key);      // Buffer
  const body = new Uint8Array(buf);              // ✅ Convert explicitly to Uint8Array

  const ext = extname(key);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": mimeFromExt(ext),
      "Cache-Control": "public, max-age=31536000, immutable",
      "Access-Control-Allow-Origin": "*", // Public files accessible from anywhere
    },
  });
}
