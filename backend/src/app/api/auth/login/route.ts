// backend/src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import argon2 from 'argon2';
// ปรับให้ตรงโปรเจ็กต์คุณ: ถ้า export default ให้ใช้ `import prisma from '@/lib/db'`
import { prisma } from '@/lib/db';
import { createSession } from '@/lib/session';

const schema = z.object({
  username: z.string().trim().min(3),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  try {
    const { username, password } = schema.parse(await req.json());

    // ดึงรหัสผ่าน (แฮช) มาตรวจ
    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true, username: true, role: true, password: true },
    });

    if (!user?.password) {
      return NextResponse.json({ error: 'INVALID_CREDENTIALS' }, { status: 401 });
    }

    const ok = await argon2.verify(user.password, password);
    if (!ok) {
      return NextResponse.json({ error: 'INVALID_CREDENTIALS' }, { status: 401 });
    }

    // สร้าง response ก่อน แล้วให้ createSession เซ็ต HttpOnly cookie ลงไป
    const res = NextResponse.json(
      { user: { id: user.id, username: user.username, role: user.role } },
      { status: 200 }
    );
    await createSession(res, user.id, req); // <- set-cookie: session=...

    return res;
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', details: err.flatten() },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'LOGIN_FAILED', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
