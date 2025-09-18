import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import RoomService from "@/services/RoomService";
// import type { Prisma } from '@prisma/client';


const joinSchema = z.object({
  code: z.string().min(4),
  userId: z.string().optional(),       // ถ้าเป็น guest ให้ไม่ส่งก็ได้
  displayName: z.string().min(1),      // ชื่อที่จะแสดงในห้อง
});

function toMsg(err: unknown, fb = "Unexpected error") {
  if (err instanceof ZodError) return err.issues?.[0]?.message ?? "Validation failed";
  if (err instanceof Error) return err.message;
  try { return JSON.stringify(err); } catch { return fb; }
}

const svc = new RoomService();

export async function POST(req: NextRequest) {
  const started = Date.now();
  let status = 200;
  try {
    const body = await req.json();
    const input = joinSchema.parse(body);

    const room = await svc.joinByCode(input);
    return NextResponse.json(
      {
        id: room?.id,
        code: room?.code,
        status: room?.status,
        participants: (room?.participants ?? []).map(
          (p: { id: string; userId: string | null; displayName: string; role: string }) => ({
            id: p.id,
            userId: p.userId,
            name: p.displayName,
            role: p.role,
          })
        ),
      },
      { status }
    );
  } catch (err) {
    // map business errors → http
    const m = toMsg(err);
    if (m.includes("ROOM_NOT_FOUND")) status = 404;
    else if (m.includes("ROOM_CLOSED") || m.includes("ROOM_EXPIRED")) status = 409;
    else status = 400;
    return NextResponse.json({ error: m }, { status });
  } finally {
    const duration = Date.now() - started;
    console.log(`[API][done] POST /api/rooms/join ${status} ${duration}ms`);
  }
}
