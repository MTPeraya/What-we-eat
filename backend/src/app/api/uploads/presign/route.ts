// backend/src/app/api/uploads/presign/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { withCORS, preflight } from "@/lib/cors";

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
    
    // Determine the backend URL to use for uploadUrl
    // Use the Host header to get the actual backend hostname/IP that was used to access the server
    // This ensures that when accessed from a network IP, the upload URL uses the same IP
    const host = req.headers.get('host') || req.nextUrl.host;
    const protocol = req.nextUrl.protocol || 'http:';
    const backendOrigin = `${protocol}//${host}`;
    
    const uploadUrl = `${backendOrigin}/api/uploads/${encodeURIComponent(key)}`;
    // Prefer env if provided; otherwise serve through this same backend
    const publicBase = process.env.PUBLIC_FILES_BASE || `${backendOrigin}/api/files`;
    const publicUrl = `${publicBase}/${encodeURIComponent(key)}`;

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
