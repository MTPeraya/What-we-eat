// backend/src/app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { destroySession } from "@/lib/session";

// ✅ Set frontend origin (Vite/Next)
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";

// ✅ helper function to add CORS headers to all responses
function withCORS(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", FRONTEND_ORIGIN);
  res.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, DELETE");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.headers.set("Access-Control-Allow-Credentials", "true");
  return res;
}

// ✅ Support preflight (OPTIONS)
export async function OPTIONS() {
  return withCORS(new NextResponse(null, { status: 204 }));
}

// ✅ Logout (destroy session cookie)
export async function POST(req: NextRequest) {
  const res = withCORS(NextResponse.json({ ok: true }, { status: 200 }));
  await destroySession(req, res);
  return res;
}
