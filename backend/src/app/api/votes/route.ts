// backend/src/app/api/votes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

// NOTE: ตอนนี้ schema ยังไม่มี decision ดังนั้นจะ "รับ" ไว้เฉยๆ แต่ไม่เซฟ
const voteSchema = z.object({
  roomId: z.string().min(1),
  restaurantId: z.string().optional().nullable(),
  userId: z.string().optional().default("TEMP_USER"),
  decision: z.enum(["accept", "reject"]).optional(), // <-- ignored for now
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = voteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const { roomId, restaurantId, userId } = parsed.data;

    // หา vote เดิม (ไม่มี unique composite ใน schema ตอนนี้ เลยใช้ findFirst)
    const existing = await prisma.vote.findFirst({
      where: { roomId, userId, restaurantId: restaurantId ?? null },
    });

    const vote = existing
      ? await prisma.vote.update({
          where: { id: existing.id },
          data: {}, // ยังไม่มี field ให้แก้ (เช่น decision) เลยไม่อัปเดตอะไร
        })
      : await prisma.vote.create({
          data: {
            roomId,
            userId,
            restaurantId: restaurantId ?? null,
          },
        });

    return NextResponse.json({ vote }, { status: existing ? 200 : 201 });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to save vote", details: String(err) },
      { status: 500 }
    );
  }
}
