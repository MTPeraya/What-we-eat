// backend/src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import argon2 from 'argon2';
import prisma from '@/lib/db';                 // ← ปรับให้ตรงโปรเจ็กต์ถ้าคุณ export เป็น { prisma }
import { createSession } from '@/lib/session'; // ← ถ้ายังใช้ '@/lib/auth' ให้เปลี่ยน path นี้
import { Prisma, Role } from '@prisma/client';

// === CORS ===
// ถ้า FE คนละ origin (เช่น Vite dev 5173) ให้ตั้ง env FRONTEND_ORIGIN
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173';

// ใส่ CORS headers ให้ทุกรายการตอบ
function withCORS(res: NextResponse) {
  res.headers.set('Access-Control-Allow-Origin', FRONTEND_ORIGIN);
  res.headers.set('Vary', 'Origin');
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.headers.set('Access-Control-Allow-Credentials', 'true'); // ต้องเปิดถ้าจะส่ง cookie ข้าม origin
  return res;
}

// รองรับ preflight (OPTIONS)
export async function OPTIONS() {
  return withCORS(new NextResponse(null, { status: 204 }));
}

// === Validation ===
const schema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(24)
    .regex(/^[a-z0-9_]+$/i, 'username must be alphanumeric/underscore'),
  password: z.string().min(4).max(12),
});

// === Handler ===
export async function POST(req: NextRequest) {
  try {
    const { username, password } = schema.parse(await req.json());

    // ตรวจซ้ำแบบเร็ว (กัน UX ไม่ดี) — กัน race ด้วย try/catch P2002 ด้านล่างอีกชั้น
    const exists = await prisma.user.findUnique({ where: { username } });
    if (exists) {
      return withCORS(NextResponse.json({ error: 'USERNAME_TAKEN' }, { status: 409 }));
    }

    const hash = await argon2.hash(password);

    // สร้างผู้ใช้
    const user = await prisma.user.create({
      data: { username, password: hash, role: Role.USER },
      select: { id: true, username: true, role: true, createdAt: true },
    });

    // สร้าง response + ออก session cookie (HttpOnly)
    const res = NextResponse.json({ user }, { status: 201 });
    await createSession(res, user.id, req); // ← ตั้งคุกกี้ลงใน res นี้

    // NOTE: ถ้า FE/BE คนละ origin และต้องการส่ง cookie จริง ๆ
    // ให้ตั้ง createSession() ให้ใช้ SameSite: 'none' ด้วย (และต้องเป็น https → secure:true)
    return withCORS(res);
  } catch (err) {
    // จัดการ unique constraint จาก Prisma (กัน race ในการสมัคร)
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return withCORS(NextResponse.json({ error: 'USERNAME_TAKEN' }, { status: 409 }));
    }

    if (err instanceof ZodError) {
      return withCORS(
        NextResponse.json(
          { error: 'VALIDATION_ERROR', details: err.flatten() },
          { status: 400 },
        ),
      );
    }

    return withCORS(
      NextResponse.json(
        { error: 'REGISTER_FAILED', details: err instanceof Error ? err.message : String(err) },
        { status: 500 },
      ),
    );
  }
}
