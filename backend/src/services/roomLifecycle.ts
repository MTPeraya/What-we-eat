import prisma from "@/lib/db";

const ROOM_CLOSE_GRACE_MINUTES = Number(
  process.env.ROOM_CLOSE_GRACE_MINUTES ?? 10
);
const ROOM_TTL_MINUTES = Number(process.env.ROOM_TTL_MINUTES ?? 120);

const minutesToMs = (minutes: number) => minutes * 60 * 1000;

export function generateRoomCode(len = 8) {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export function computeRoomExpiry(base?: Date) {
  const start = base ? new Date(base) : new Date();
  return new Date(start.getTime() + minutesToMs(ROOM_TTL_MINUTES));
}

export async function closeRoom(
  roomId: string,
  opts?: { removeParticipants?: boolean }
) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { id: true, code: true, status: true, closedAt: true },
  });
  if (!room) return null;
  if (room.status === "CLOSED" && room.closedAt) {
    if (opts?.removeParticipants) {
      await prisma.roomParticipant.deleteMany({ where: { roomId } });
    }
    return room;
  }

  let newCode = generateRoomCode();
  let attempts = 0;
  while (
    attempts < 10 &&
    (await prisma.room.findUnique({ where: { code: newCode } }))
  ) {
    newCode = generateRoomCode();
    attempts++;
  }

  const closedAt = new Date();
  const updated = await prisma.room.update({
    where: { id: roomId },
    data: {
      status: "CLOSED",
      closedAt,
      expiresAt: closedAt,
      code: newCode,
    },
    select: { id: true, status: true, closedAt: true, code: true },
  });

  if (opts?.removeParticipants ?? true) {
    await prisma.roomParticipant.deleteMany({ where: { roomId } });
  }

  return updated;
}

export async function cleanupStaleRooms() {
  const now = new Date();
  const staleThreshold = new Date(
    now.getTime() - minutesToMs(ROOM_CLOSE_GRACE_MINUTES)
  );
  const ttlThreshold = new Date(
    now.getTime() - minutesToMs(ROOM_TTL_MINUTES)
  );

  const staleRooms = await prisma.room.findMany({
    where: {
      status: { in: ["OPEN", "STARTED"] },
      closedAt: null,
      updatedAt: { lt: staleThreshold },
    },
    select: { id: true },
  });

  if (staleRooms.length) {
    await Promise.all(
      staleRooms.map((room) => closeRoom(room.id, { removeParticipants: true }))
    );
  }

  const oldRooms = await prisma.room.findMany({
    where: {
      status: "CLOSED",
      closedAt: { not: null, lt: ttlThreshold },
    },
    select: { id: true },
  });

  if (!oldRooms.length) {
    return;
  }

  const roomIds = oldRooms.map((r) => r.id);

  await prisma.$transaction([
    prisma.roomParticipant.deleteMany({ where: { roomId: { in: roomIds } } }),
    prisma.roomSuggestionHistory.deleteMany({
      where: { roomId: { in: roomIds } },
    }),
    prisma.vote.deleteMany({ where: { roomId: { in: roomIds } } }),
    prisma.imageAsset.updateMany({
      where: { roomId: { in: roomIds } },
      data: { roomId: null },
    }),
  ]);
}

export function getRoomLifecycleConfig() {
  return {
    closeGraceMinutes: ROOM_CLOSE_GRACE_MINUTES,
    ttlMinutes: ROOM_TTL_MINUTES,
  };
}

