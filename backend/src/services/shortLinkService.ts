import { customAlphabet } from "nanoid";
import prisma from "@/lib/db";

const nano = customAlphabet("ABCDEFGHJKMNPQRSTUVWXYZ23456789", 8); // easy to read

export async function createShortLink(params: {
  targetUrl: string;
  roomId?: string;
  createdBy?: string;
  ttlMinutes?: number; // age of link
}) {
  const code = nano();
  const expireAt =
    params.ttlMinutes && params.ttlMinutes > 0
      ? new Date(Date.now() + params.ttlMinutes * 60 * 1000)
      : null;

  const row = await prisma.shortLink.create({
    data: {
      code,
      targetUrl: params.targetUrl,
      roomId: params.roomId,
      createdBy: params.createdBy,
      expireAt,
    },
  });
  return row;
}

export async function resolveShortLink(code: string) {
  const link = await prisma.shortLink.findUnique({ where: { code } });
  if (!link) return { ok: false as const, reason: "NOT_FOUND" as const };

  if (link.expireAt && link.expireAt.getTime() < Date.now()) {
    return { ok: false as const, reason: "EXPIRED" as const, link };
  }
  return { ok: true as const, link };
}
