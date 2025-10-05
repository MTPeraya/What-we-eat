// backend/src/app/api/rooms/[id]/route.ts
import { prisma } from "@/lib/db";

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";

function withCORS(res: Response) {
  const h = new Headers(res.headers);
  h.set("Access-Control-Allow-Origin", FRONTEND_ORIGIN);
  h.set("Access-Control-Allow-Methods", "GET, PATCH, DELETE, OPTIONS");
  h.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  h.set("Access-Control-Allow-Credentials", "true");
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
}

// Preflight
export async function OPTIONS() {
  return withCORS(new Response(null, { status: 204 }));
}

export async function GET(_: Request, { params }: { params: { id: string }}) {
  const room = await prisma.room.findUnique({ where: { id: params.id }});
  if (!room) return withCORS(new Response(JSON.stringify({ error: "NOT_FOUND" }), {
    status: 404, headers: { "content-type": "application/json" }
  }));
  return withCORS(new Response(JSON.stringify(room), {
    status: 200, headers: { "content-type": "application/json" }
  }));
}

export async function PATCH(req: Request, { params }: { params: { id: string }}) {
  const payload = await req.json();
  const room = await prisma.room.update({ where: { id: params.id }, data: payload });
  return withCORS(new Response(JSON.stringify(room), {
    status: 200, headers: { "content-type": "application/json" }
  }));
}

export async function DELETE(_: Request, { params }: { params: { id: string }}) {
  await prisma.room.delete({ where: { id: params.id }});
  return withCORS(new Response(null, { status: 204 }));
}
