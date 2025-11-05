// backend/src/app/api/auth/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";

// ✅ frontend origin (Vite or Next.js dev server)
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";

// ✅ helper to add CORS headers
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

// ✅ Get user info from session
export async function GET(req: NextRequest) {
  const s = await getSession(req);

  if (!s) {
    return withCORS(
      NextResponse.json({ user: null }, { status: 200 })
    );
  }

  const { user } = s;
  return withCORS(
    NextResponse.json(
      { user: { id: user.id, username: user.username, role: user.role } },
      { status: 200 }
    )
  );
}
