// src/services/UserService.ts
import prisma from '@/lib/db';
import argon2 from 'argon2';

import { Prisma, Role } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';


export type PublicUser = Readonly<{
  id: string;
  username: string;
  role: Role;
}>;

export enum UserErrorCode {
  USERNAME_TAKEN = 'USERNAME_TAKEN',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  PASSWORD_TOO_SHORT = 'PASSWORD_TOO_SHORT',
  USERNAME_TOO_SHORT = 'USERNAME_TOO_SHORT',
  INVALID_OLD_PASSWORD = 'INVALID_OLD_PASSWORD',
  PASSWORD_SAME_AS_OLD = 'PASSWORD_SAME_AS_OLD',
  GUEST_CREATE_FAILED = 'GUEST_CREATE_FAILED',
}

export class UserError extends Error {
  constructor(public code: UserErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'UserError';
  }
}

const SELECT_PUBLIC = { id: true, username: true, role: true } as const;

function sanitizeUsername(u: string) {
  return u.trim();
}
function ensureUsername(u: string) {
  const v = sanitizeUsername(u);
  if (v.length < 3) throw new UserError(UserErrorCode.USERNAME_TOO_SHORT);
  return v;
}
function ensurePassword(pw: string) {
  if (!pw || pw.length < 8) throw new UserError(UserErrorCode.PASSWORD_TOO_SHORT);
  return pw;
}
function isUniqueError(e: unknown): e is Prisma.PrismaClientKnownRequestError {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';
}

export class UserService {
  constructor(private readonly db: PrismaClient) {}

  /** Get user by id (excludes password) */
  async getById(id: string): Promise<PublicUser | null> {
    if (!id) return null;
    return this.db.user.findUnique({ where: { id }, select: SELECT_PUBLIC });
  }

  /** Get user by username (excludes password) */
  async getByUsername(username: string): Promise<PublicUser | null> {
    const u = sanitizeUsername(username);
    if (!u) return null;
    return this.db.user.findUnique({ where: { username: u }, select: SELECT_PUBLIC });
  }

  /** Create new user (argon2 hash) */
  async create(input: { username: string; password: string; role?: Role }): Promise<PublicUser> {
    const username = ensureUsername(input.username);
    const password = ensurePassword(input.password);
    const role = input.role ?? 'USER';

    const hash = await argon2.hash(password);
    try {
      return await this.db.user.create({
        data: { username, password: hash, role },
        select: SELECT_PUBLIC,
      });
    } catch (e) {
      if (isUniqueError(e)) throw new UserError(UserErrorCode.USERNAME_TAKEN);
      throw e;
    }
  }

  /** Verify credentials (returns PublicUser if valid, null otherwise) */
  async verifyCredentials(username: string, password: string): Promise<PublicUser | null> {
    const u = ensureUsername(username);
    const pw = ensurePassword(password);

    const user = await this.db.user.findUnique({
      where: { username: u },
      select: { id: true, username: true, role: true, password: true },
    });
    if (!user?.password) return null;

    const ok = await argon2.verify(user.password, pw);
    if (!ok) return null;

    const { id, role } = user;
    return { id, username: user.username, role };
  }

  /** Change password (validates old password first) + optionally delete all old sessions (default = true) */
  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
    opts?: { invalidateSessions?: boolean }
  ): Promise<{ ok: true }> {
    const invalidate = opts?.invalidateSessions ?? true;

    const user = await this.db.user.findUnique({ where: { id: userId }, select: { id: true, password: true } });
    if (!user?.password) throw new UserError(UserErrorCode.USER_NOT_FOUND);

    const okOld = await argon2.verify(user.password, ensurePassword(oldPassword));
    if (!okOld) throw new UserError(UserErrorCode.INVALID_OLD_PASSWORD);

    const newPw = ensurePassword(newPassword);
    if (await argon2.verify(user.password, newPw)) {
      throw new UserError(UserErrorCode.PASSWORD_SAME_AS_OLD);
    }

    const newHash = await argon2.hash(newPw);

    await this.db.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { password: newHash } });
      if (invalidate) {
        await tx.session.deleteMany({ where: { userId } });
      }
    });

    return { ok: true };
  }

  /** Change role (permission check done outside service) */
  async setRole(userId: string, role: Role): Promise<PublicUser> {
    return this.db.user.update({ where: { id: userId }, data: { role }, select: SELECT_PUBLIC });
  }

  /** List users with pagination + search by name (for admin page) */
  async list(params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: Role;
  }): Promise<{ items: PublicUser[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, params?.page ?? 1);
    const limit = Math.min(100, Math.max(1, params?.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};
    if (params?.role) where.role = params.role;
    if (params?.search?.trim()) {
      where.username = { contains: params.search.trim(), mode: 'insensitive' };
    }

    const [items, total] = await Promise.all([
      this.db.user.findMany({ where, select: SELECT_PUBLIC, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      this.db.user.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  /** Create guest user (random username + random password) */
  async createGuest(displayName?: string): Promise<PublicUser> {
    const base = (displayName?.trim().replace(/\s+/g, '-') || 'guest').toLowerCase().slice(0, 16);
    let username = `${base}-${Math.random().toString(36).slice(2, 7)}`;

    for (let i = 0; i < 4; i++) {
      try {
        const hash = await argon2.hash(Math.random().toString(36));
        return await this.db.user.create({
          data: { username, password: hash, role: 'USER' },
          select: SELECT_PUBLIC,
        });
      } catch (e) {
        if (isUniqueError(e)) {
          username = `${base}-${Math.random().toString(36).slice(2, 7)}`;
          continue;
        }
        throw e;
      }
    }
    throw new UserError(UserErrorCode.GUEST_CREATE_FAILED);
  }
}

// Singleton instance for use across project
export const userService = new UserService(prisma);
