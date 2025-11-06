// backend/src/services/RoomService.ts
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

/** Generate random room code (excluding confusing characters like 0/O/I/1) */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function genCode(len = 6) {
  let s = "";
  for (let i = 0; i < len; i++) {
    s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return s;
}

/** Payload types (includes participants relation) */
export type RoomWithParticipants = Prisma.RoomGetPayload<{
  include: { participants: true };
}>;

export type CreateRoomInput = {
  hostId: string;
  /** Optional - if not set, room never expires */
  expiresInMinutes?: number;
  /** Host display name in participants list (default: "Host") */
  hostDisplayName?: string;
};

export type JoinByCodeInput = {
  code: string;
  /** Optional - leave empty for guest users */
  userId?: string;
  /** Display name shown in room */
  displayName: string;
};

export class RoomService {
  /**
   * Get room by code with participants (returns null if not found)
   */
  async getByCodeWithParticipants(code: string): Promise<RoomWithParticipants | null> {
    return prisma.room.findUnique({
      where: { code },
      include: { participants: true },
    });
  }

  /**
   * Create room + code + add host as participant (role=host)
   * - Validates host exists (prevents FK error)
   * - Ensures unique code (retries up to 10 times)
   */
  async createRoom(input: CreateRoomInput): Promise<RoomWithParticipants> {
    const host = await prisma.user.findUnique({ where: { id: input.hostId } });
    if (!host) throw new Error("HOST_NOT_FOUND");

    // Generate unique code
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
   * Join room by code (guest/registered user)
   * - Room must be OPEN and not expired
   * - If userId already in room → return existing room state (no duplicate)
   * - If guest → create new participant (userId=null)
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

    // If logged-in user already in room → return existing room state (no duplicate)
    if (input.userId) {
      const existed = await prisma.roomParticipant.findUnique({
        // From @@unique([roomId, userId]) → composite key named roomId_userId
        where: { roomId_userId: { roomId: room.id, userId: input.userId } },
      });
      if (existed) {
        return prisma.room.findUniqueOrThrow({
          where: { id: room.id },
          include: { participants: true },
        });
      }
    }

    // Add new participant (guest/registered)
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
   * Close room (optional)
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
