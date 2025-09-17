// backend/src/services/RoomService.ts
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

// --- helper: สร้างโค้ดห้อง ---
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // ตัด 0/O/I/1
function genCode(len = 6) {
  let s = "";
  for (let i = 0; i < len; i++) s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return s;
}

// --- input types ---
export type CreateRoomInput = {
  hostId: string;
  expiresInMinutes?: number;   // ไม่ใส่ = ไม่หมดอายุ
  hostDisplayName?: string;
};

export type JoinByCodeInput = {
  code: string;
  userId?: string;             // ถ้า guest ให้ไม่ส่ง
  displayName: string;
};

// --- payload types (ให้ TS รู้ว่า include อะไรบ้าง) ---
export type RoomWithParticipants = Prisma.RoomGetPayload<{
  include: { participants: true };
}>;

export class RoomService {
  /**
   * สร้างห้อง + โค้ด + เพิ่ม host เป็น participant(role=host)
   */
  async createRoom(input: CreateRoomInput): Promise<RoomWithParticipants> {
    // กันโค้ดซ้ำ (ลองสุ่มใหม่ไม่เกิน 5 ครั้ง)
    let code = genCode();
    for (let i = 0; i < 5; i++) {
      const exists = await prisma.room.findUnique({ where: { code } });
      if (!exists) break;
      code = genCode();
    }

    const host = await prisma.user.findUnique({ where: { id: input.hostId } });
    if (!host) throw new Error("HOST_NOT_FOUND");

    const expiresAt =
      input.expiresInMinutes && input.expiresInMinutes > 0
        ? new Date(Date.now() + input.expiresInMinutes * 60_000)
        : null;

    const room = await prisma.room.create({
      data: {
        code,
        hostId: input.hostId,
        expiresAt: expiresAt ?? undefined,
        participants: {
          create: {
            userId: input.hostId,
            displayName: input.hostDisplayName ?? "Host",
            role: "host",
          },
        },
      },
      include: { participants: true },
    });

    return room;
  }

  /**
   * เข้าห้องด้วย code (guest/registered)
   */
  async joinByCode(input: JoinByCodeInput): Promise<RoomWithParticipants> {
    // ดึงห้องจาก code
    const room = await prisma.room.findUnique({
      where: { code: input.code },
    });

    if (!room) throw new Error("ROOM_NOT_FOUND");
    if (room.status !== "OPEN") throw new Error("ROOM_CLOSED");
    if (room.expiresAt && room.expiresAt.getTime() < Date.now()) {
      throw new Error("ROOM_EXPIRED");
    }

    // ถ้าเป็นผู้ใช้ที่ล็อกอินและเคยอยู่ในห้องแล้ว -> คืนสถานะห้อง (พร้อม participants)
    if (input.userId) {
      const existed = await prisma.roomParticipant.findUnique({
        where: {
          // มาจาก @@unique([roomId, userId]) ใน schema → ชื่อฟิลด์ composite key จะเป็น roomId_userId
          roomId_userId: { roomId: room.id, userId: input.userId },
        },
      });

      if (existed) {
        return prisma.room.findUniqueOrThrow({
          where: { id: room.id },
          include: { participants: true },
        });
      }
    }

    // เพิ่มผู้เข้าร่วมใหม่ (guest/registered)
    await prisma.roomParticipant.create({
      data: {
        roomId: room.id,
        userId: input.userId ?? null, // Prisma รับ null ได้ถ้า field เป็น optional
        displayName: input.displayName,
        role: "member",
      },
    });

    // คืนห้องพร้อม participants
    return prisma.room.findUniqueOrThrow({
      where: { id: room.id },
      include: { participants: true },
    });
  }
}

export default RoomService;
