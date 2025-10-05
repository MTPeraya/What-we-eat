// backend/src/app/api/rooms/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import RoomService from "@/services/RoomService";

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";
function withCORS(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", FRONTEND_ORIGIN);
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.headers.set("Access-Control-Allow-Credentials", "true");
  return res;
}

// Preflight
export async function OPTIONS() {
  return withCORS(new NextResponse(null, { status: 204 }));
}

const createSchema = z.object({
  hostId: z.string().min(1),
  expiresInMinutes: z.coerce.number().int().positive().max(60 * 24).optional(),
  hostDisplayName: z.string().optional(),
});

function toMsg(err: unknown, fb = "Unexpected error") {
  if (err instanceof ZodError) return err.issues?.[0]?.message ?? "Validation failed";
  if (err instanceof Error) return err.message;
  try { return JSON.stringify(err); } catch { return fb; }
}

const svc = new RoomService();

export async function POST(req: NextRequest) {
  const started = Date.now();
  let status = 201;
  try {
    const body = await req.json();
    const input = createSchema.parse(body);

    const room = await svc.createRoom(input);

    return withCORS(
      NextResponse.json(
        { id: room.id, code: room.code, status: room.status, expiresAt: room.expiresAt },
        { status }
      )
    );
  } catch (err) {
    status = 400;
    return withCORS(
      NextResponse.json({ error: toMsg(err, "Failed to create room") }, { status })
    );
  } finally {
    const duration = Date.now() - started;
    console.log(`[API][done] POST /api/rooms ${status} ${duration}ms`);
  }
}

/** 
 * TIP: โค้ดนี้เป็น helper ฝั่ง frontend มากกว่า 
 * แนะนำย้ายไปไว้ใน client code (เช่น src/lib/api.ts) 
 * และถ้า endpoint ต้องใช้ session cookie ให้ใส่ credentials: "include"
 */
export async function fetchRoomTally(roomId: string) {
  const res = await fetch(`/api/rooms/${roomId}/decide/score`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Fetch tally failed: ${res.status}`);
  return res.json() as Promise<{
    roomId: string;
    generatedAt: string;
    stats: { totalVotes: number; totalRestaurants: number };
    scores: { restaurantId: string; accept: number; reject: number; approval: number; netScore: number }[];
  }>;
}
