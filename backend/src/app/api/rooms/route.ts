import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import RoomService from "@/services/RoomService";

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
    return NextResponse.json(
      { id: room.id, code: room.code, status: room.status, expiresAt: room.expiresAt },
      { status }
    );
  } catch (err) {
    status = 400;
    return NextResponse.json({ error: toMsg(err, "Failed to create room") }, { status });
  } finally {
    const duration = Date.now() - started;
    console.log(`[API][done] POST /api/rooms ${status} ${duration}ms`);
  }
}
