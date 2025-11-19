import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { withCORS, preflight } from "@/lib/cors";

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return preflight('PUT, OPTIONS', origin);
}

// Validation schema
const UpdateProfileSchema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/).optional(),
  displayName: z.string().min(1).max(50).optional(),
  // Accept either base64 data URI or URL (for backward compatibility)
  profilePicture: z.string().refine(
    (val) => {
      if (!val) return true; // null/empty is OK
      // Check if it's a base64 data URI (data:image/...;base64,...)
      if (val.startsWith('data:image/') && val.includes(';base64,')) return true;
      // Check if it's a URL
      try {
        new URL(val);
        return true;
      } catch {
        return false;
      }
    },
    { message: "profilePicture must be a valid URL or base64 data URI" }
  ).optional().nullable(),
}).strict();

// PUT /api/auth/profile - Update user profile
export async function PUT(req: NextRequest) {
  const origin = req.headers.get('origin');
  
  try {
    const { userId } = await requireAuth(req);

    const json = (await req.json().catch(() => ({}))) as unknown;
    const parsed = UpdateProfileSchema.safeParse(json);
    
    if (!parsed.success) {
      return withCORS(
        NextResponse.json(
          { error: "INVALID_BODY", details: parsed.error.flatten() },
          { status: 400 }
        ),
        origin
      );
    }

    const { username, displayName, profilePicture } = parsed.data;

    // Check if username is taken (if changing username)
    if (username) {
      const existing = await prisma.user.findUnique({
        where: { username },
        select: { id: true }
      });
      
      if (existing && existing.id !== userId) {
        return withCORS(
          NextResponse.json({ error: "USERNAME_TAKEN" }, { status: 409 }),
          origin
        );
      }
    }

    // Update user profile
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(username !== undefined && { username }),
        ...(displayName !== undefined && { displayName }),
        ...(profilePicture !== undefined && { profilePicture }),
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        profilePicture: true,
        role: true
      }
    });

    return withCORS(
      NextResponse.json({ user: updated }, { status: 200 }),
      origin
    );
  } catch (e) {
    const msg = (e as Error)?.message ?? String(e);
    
    if (msg === "UNAUTHENTICATED") {
      return withCORS(
        NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 }),
        origin
      );
    }
    
    return withCORS(
      NextResponse.json(
        { error: "UPDATE_FAILED", details: msg },
        { status: 500 }
      ),
      origin
    );
  }
}

