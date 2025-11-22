import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withCORS, preflight } from "@/lib/cors";

export async function OPTIONS(req: NextRequest) { 
  const origin = req.headers.get('origin');
  return preflight('GET, OPTIONS', origin);
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const origin = req.headers.get('origin');
  
  try {
    const { id } = await ctx.params;

    const items = await prisma.rating.findMany({
      where: { restaurantId: id },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true, 
        score: true, 
        tags: true, 
        comment: true, 
        createdAt: true,
        status: true, // Include status for verified badge
        user: {
          select: {
            username: true,
            role: true,
            profilePicture: true
          }
        },
        photos: { select: { publicUrl: true, width: true, height: true } },
      },
    });

    // Debug: Log profilePicture data
    items.forEach((item, idx) => {
      console.log(`[restaurants/[id]/ratings] Item ${idx}:`, {
        username: item.user?.username,
        hasProfilePicture: !!item.user?.profilePicture,
        profilePictureType: item.user?.profilePicture 
          ? (item.user.profilePicture.startsWith('data:') ? 'base64' : 'url')
          : 'null'
      });
    });

    return withCORS(NextResponse.json({ items }, { status: 200 }), origin);
  } catch (e) {
    return withCORS(NextResponse.json({ error: "RATINGS_LIST_FAILED", details: String(e) }, { status: 500 }), origin);
  }
}
