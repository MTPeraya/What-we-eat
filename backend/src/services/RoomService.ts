// backend/src/services/RoomService.ts
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

/** สุ่มโค้ดห้อง (ตัดตัวที่สับสนอย่าง 0/O/I/1) */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function genCode(len = 6) {
  let s = "";
  for (let i = 0; i < len; i++) {
    s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return s;
}

/** payload types (ให้ TS รู้ว่ามี participants ติดมาด้วย) */
export type RoomWithParticipants = Prisma.RoomGetPayload<{
  include: { participants: true };
}>;

export type CreateRoomInput = {
  hostId: string;
  /** ไม่ใส่ = ไม่หมดอายุ */
  expiresInMinutes?: number;
  /** ชื่อ host ที่จะแสดงใน participants (default: "Host") */
  hostDisplayName?: string;
};

export type JoinByCodeInput = {
  code: string;
  /** ถ้าเป็น guest ให้เว้นไว้ */
  userId?: string;
  /** ชื่อที่จะแสดงในห้อง */
  displayName: string;
};

export class RoomService {
  /**
   * ดึงห้องด้วย code พร้อม participants (ถ้าไม่เจอ → null)
   */
  async getByCodeWithParticipants(code: string): Promise<RoomWithParticipants | null> {
    return prisma.room.findUnique({
      where: { code },
      include: { participants: true },
    });
  }

  /**
   * สร้างห้อง + โค้ด + เพิ่ม host เป็น participant(role=host)
   * - เช็คว่า host มีอยู่จริง (กัน FK error)
   * - โค้ดไม่ซ้ำ (ลองสุ่มใหม่สูงสุด 10 ครั้ง)
   */
  async createRoom(input: CreateRoomInput): Promise<RoomWithParticipants> {
    const host = await prisma.user.findUnique({ where: { id: input.hostId } });
    if (!host) throw new Error("HOST_NOT_FOUND");

    // สร้างโค้ดไม่ซ้ำ
    let code = genCode();
    for (let i = 0; i < 10; i++) {
      const exists = await prisma.room.findUnique({ where: { code } });
      if (!exists) break;
      code = genCode();
      if (i === 9) throw new Error("ROOM_CODE_COLLISION");
    }

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
   * - ห้องต้อง OPEN และไม่หมดอายุ
   * - ถ้า userId มีอยู่เดิมในห้อง → ไม่สร้างซ้ำ (คืนสถานะห้องเดิม)
   * - ถ้า guest → สร้าง participant ใหม่ (userId=null)
   */
  async joinByCode(input: JoinByCodeInput): Promise<RoomWithParticipants> {
    const room = await prisma.room.findUnique({
      where: { code: input.code },
    });

    if (!room) throw new Error("ROOM_NOT_FOUND");
    if (room.status !== "OPEN") throw new Error("ROOM_CLOSED");
    if (room.expiresAt && room.expiresAt.getTime() < Date.now()) {
      throw new Error("ROOM_EXPIRED");
    }

    // ถ้าเป็นผู้ใช้ที่ล็อกอินและเคยเข้าห้องแล้ว -> คืนสถานะห้องเลย (ไม่สร้างซ้ำ)
    if (input.userId) {
      const existed = await prisma.roomParticipant.findUnique({
        // จาก @@unique([roomId, userId]) → composite key ชื่อ roomId_userId
        where: { roomId_userId: { roomId: room.id, userId: input.userId } },
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
        userId: input.userId ?? null,
        displayName: input.displayName,
        role: "member",
      },
    });

    return prisma.room.findUniqueOrThrow({
      where: { id: room.id },
      include: { participants: true },
    });
  }

  /**
   * (ตัวเลือก) ปิดห้อง
   */
  async closeRoom(roomId: string): Promise<RoomWithParticipants> {
    return prisma.room.update({
      where: { id: roomId },
      data: { status: "CLOSED" },
      include: { participants: true },
    });
  }
}

export default RoomService;
