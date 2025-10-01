import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import argon2 from "argon2";
import prisma from "@/lib/db";
import { createSession } from "@/lib/auth";
import { Role } from "@prisma/client";

const schema = z.object({
  username: z.string().trim().min(3).max(24).regex(/^[a-z0-9_]+$/i),
  password: z.string().min(8).max(100),
});

export async function POST(req: NextRequest) {
  try {
    const { username, password } = schema.parse(await req.json());

    // username ต้อง unique
    const exists = await prisma.user.findUnique({ where: { username } });
    if (exists) {
      return NextResponse.json({ error: "USERNAME_TAKEN" }, { status: 409 });
    }

    const hashed = await argon2.hash(password);

    const user = await prisma.user.create({
      data: { username, password: hashed, role: Role.USER },
      select: { id: true, username: true, role: true, createdAt: true },
    });

    // ออก session cookie
    await createSession({ id: user.id, username: user.username, role: user.role });

    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof ZodError ? err.issues?.[0]?.message ?? "Validation failed" :
      err instanceof Error   ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
