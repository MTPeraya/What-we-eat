// backend/src/app/api/uploads/presign/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
const PUBLIC_BASE = process.env.PUBLIC_FILES_BASE || "http://localhost:4001/api/files";

function newKey(mime: string) {
  const ext = mime.split("/")[1] || "bin";
  const ymd = new Date().toISOString().slice(0, 10);
  const rand = crypto.randomBytes(16).toString("hex");
  return `ratings/${ymd}/${rand}.${ext}`;
}

export async function OPTIONS() {
  const res = NextResponse.json({}, { status: 204 });
  res.headers.set("Access-Control-Allow-Origin", FRONTEND_ORIGIN);
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.headers.set("Access-Control-Allow-Credentials", "true");
  return res;
}

export async function POST(req: NextRequest) {
  const { mime } = await req.json();
  if (!mime || typeof mime !== "string") {
    return NextResponse.json({ error: "INVALID_MIME" }, { status: 400 });
  }
  const key = newKey(mime);
  const uploadUrl = `${req.nextUrl.origin}/api/uploads/${encodeURIComponent(key)}`;
  const publicUrl = `${PUBLIC_BASE}/${encodeURIComponent(key)}`;

  const res = NextResponse.json({ key, uploadUrl, publicUrl }, { status: 200 });
  res.headers.set("Access-Control-Allow-Origin", FRONTEND_ORIGIN);
  res.headers.set("Access-Control-Allow-Credentials", "true");
  return res;
}
