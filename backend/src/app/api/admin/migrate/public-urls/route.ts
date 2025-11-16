import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withCORS, preflight } from "@/lib/cors";
import { requireAuth } from "@/lib/session";

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin");
  return preflight("POST, OPTIONS", origin);
}

/**
 * POST /api/admin/migrate/public-urls
 * Replace old publicUrl base (e.g., http://localhost:4001/api/files) with the current backend origin (/api/files).
 * Updates:
 *  - RatingPhoto.publicUrl
 *  - User.profilePicture
 */
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  try {
    // Ensure requester is authenticated (optionally enforce admin role if available)
    const { userId } = await requireAuth(req);
    void userId;

    const json = await req.json().catch(() => ({}));
    const explicitFrom: string | undefined = json?.from;
    const explicitTo: string | undefined = json?.to;

    const defaultFrom = process.env.PUBLIC_FILES_BASE || "http://localhost:4001/api/files";
    const defaultTo = `${req.nextUrl.origin}/api/files`;

    const from = explicitFrom || defaultFrom;
    const to = explicitTo || defaultTo;

    if (!from || !to || from === to) {
      return withCORS(
        NextResponse.json(
          { error: "INVALID_PARAMS", details: { from, to } },
          { status: 400 }
        ),
        origin
      );
    }

    await prisma.$transaction([
      prisma.ratingPhoto.updateMany({
        where: {
          publicUrl: { startsWith: from },
        },
        data: {
          publicUrl: {
            set: undefined as unknown as string, // placeholder; we cannot dynamic replace in updateMany
          },
        },
      }),
      prisma.user.updateMany({
        where: {
          profilePicture: { startsWith: from },
        },
        data: {
          profilePicture: {
            set: undefined as unknown as string,
          },
        },
      }),
    ]).catch(() => [null, null]); // updateMany can't do string replace; we'll do it per-record below

    // Fallback: read and update per record with string replace (safe for sqlite/postgres)
    const [photos, users] = await Promise.all([
      prisma.ratingPhoto.findMany({
        where: { publicUrl: { startsWith: from } },
        select: { id: true, publicUrl: true },
      }),
      prisma.user.findMany({
        where: { profilePicture: { startsWith: from } },
        select: { id: true, profilePicture: true },
      }),
    ]);

    const newPhotoUrls = photos.map((p) => ({
      id: p.id,
      publicUrl: (p.publicUrl || "").replace(from, to),
    }));
    const newUserPics = users.map((u) => ({
      id: u.id,
      profilePicture: (u.profilePicture || "").replace(from, to),
    }));

    await prisma.$transaction([
      ...newPhotoUrls.map((p) =>
        prisma.ratingPhoto.update({
          where: { id: p.id },
          data: { publicUrl: p.publicUrl },
        })
      ),
      ...newUserPics.map((u) =>
        prisma.user.update({
          where: { id: u.id },
          data: { profilePicture: u.profilePicture },
        })
      ),
    ]);

    return withCORS(
      NextResponse.json(
        {
          ok: true,
          migrated: {
            ratingPhotos: newPhotoUrls.length,
            users: newUserPics.length,
          },
          from,
          to,
        },
        { status: 200 }
      ),
      origin
    );
  } catch (e) {
    const msg = (e as Error)?.message ?? String(e);
    return withCORS(
      NextResponse.json({ error: "MIGRATION_FAILED", details: msg }, { status: 500 }),
      origin
    );
  }
}


