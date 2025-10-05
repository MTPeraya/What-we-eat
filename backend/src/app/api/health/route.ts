// backend/src/app/api/health/route.ts
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";

function withCORS(res: Response) {
  const headers = new Headers(res.headers);
  headers.set("Access-Control-Allow-Origin", FRONTEND_ORIGIN);
  headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  headers.set("Access-Control-Allow-Credentials", "true");
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

// Preflight
export async function OPTIONS() {
  return withCORS(new Response(null, { status: 204 }));
}

// Health check
export async function GET() {
  const res = new Response(JSON.stringify({ ok: true, ts: Date.now() }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
  return withCORS(res);
}
