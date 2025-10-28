import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/session";

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";
function withCORS(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", FRONTEND_ORIGIN);
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.headers.set("Access-Control-Allow-Credentials", "true");
  return res;
}
export async function OPTIONS() {
  return withCORS(new NextResponse(null, { status: 204 }));
}

// ข้อมูลที่ client ส่งมา: แค่ชื่อที่จะแสดงของ host ในห้อง + วันหมดอายุ (ไม่บังคับ)
const BodySchema = z.object({
  displayName: z.string().min(1).max(50),
  expiresAt: z.string().datetime().optional(), // ISO string
}).strict();

function genRoomCode(len = 8) {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth(req);

    let body: unknown = {};
    try { body = await req.json(); } catch {}
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return withCORS(NextResponse.json(
        { error: "INVALID_BODY", details: parsed.error.flatten() },
        { status: 400 }
      ));
    }
    const { displayName, expiresAt } = parsed.data;

    // สร้าง code ที่ unique
    let code = genRoomCode();
    // กันชนซ้ำ (โอกาสน้อย แต่เช็คไว้)
    while (await prisma.room.findUnique({ where: { code } })) {
      code = genRoomCode();
    }

    const room = await prisma.$transaction(async (tx) => {
      const created = await tx.room.create({
        data: {
          code,
          hostId: userId,                  // << host = ผู้ใช้ปัจจุบัน
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          status: "OPEN",
        },
        select: { id: true, code: true, hostId: true, status: true, expiresAt: true, createdAt: true },
      });

      // เพิ่ม host เข้าเป็นผู้เข้าร่วมทันที
      await tx.roomParticipant.create({
        data: {
          roomId: created.id,
          userId,                          // host มี userId
          displayName,
          role: "host",
        },
      });

      return created;
    });

    return withCORS(NextResponse.json({ room }, { status: 201 }));
  } catch (e) {
    const msg = (e as Error)?.message ?? String(e);
    if (msg === "UNAUTHENTICATED") {
      return withCORS(NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 }));
    }
    return withCORS(NextResponse.json({ error: "ROOM_CREATE_FAILED", details: msg }, { status: 500 }));
  }
}
