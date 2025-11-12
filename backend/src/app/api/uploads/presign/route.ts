// backend/src/app/api/uploads/presign/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { withCORS, preflight } from "@/lib/cors";

const PUBLIC_BASE = process.env.PUBLIC_FILES_BASE || "http://localhost:4001/api/files";

function newKey(mime: string) {
  const ext = mime.split("/")[1] || "bin";
  const ymd = new Date().toISOString().slice(0, 10);
  const rand = crypto.randomBytes(16).toString("hex");
  return `ratings/${ymd}/${rand}.${ext}`;
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return preflight('POST, OPTIONS', origin);
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  
  try {
    const { mime } = await req.json();
    if (!mime || typeof mime !== "string") {
      return withCORS(
        NextResponse.json({ error: "INVALID_MIME" }, { status: 400 }),
        origin
      );
    }
    
    const key = newKey(mime);
    const uploadUrl = `${req.nextUrl.origin}/api/uploads/${encodeURIComponent(key)}`;
    const publicUrl = `${PUBLIC_BASE}/${encodeURIComponent(key)}`;

    return withCORS(
      NextResponse.json({ key, uploadUrl, publicUrl }, { status: 200 }),
      origin
    );
  } catch (e) {
    const msg = (e as Error)?.message ?? String(e);
    return withCORS(
      NextResponse.json({ error: "PRESIGN_FAILED", details: msg }, { status: 500 }),
      origin
    );
  }
}
