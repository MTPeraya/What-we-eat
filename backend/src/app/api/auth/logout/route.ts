// backend/src/app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { destroySession } from "@/lib/session";

// ✅ ตั้ง origin ของ frontend (Vite/Next)
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";

// ✅ helper function ใส่ CORS headers ให้ทุก response
function withCORS(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", FRONTEND_ORIGIN);
  res.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, DELETE");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.headers.set("Access-Control-Allow-Credentials", "true");
  return res;
}

// ✅ รองรับ preflight (OPTIONS)
export async function OPTIONS() {
  return withCORS(new NextResponse(null, { status: 204 }));
}

// ✅ Logout (ลบ session cookie)
export async function POST(req: NextRequest) {
  const res = withCORS(NextResponse.json({ ok: true }, { status: 200 }));
  await destroySession(req, res);
  return res;
}
