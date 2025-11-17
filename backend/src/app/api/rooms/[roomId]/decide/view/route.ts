// backend/src/app/api/rooms/[roomId]/decide/view/route.ts
// API endpoint to mark that host is viewing results (for synchronization)
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/session';
import { withCORS, preflight } from '@/lib/cors';

// Preflight
export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return preflight('POST, GET, OPTIONS', origin);
}

// POST: Mark that host is viewing results
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ roomId: string }> }
) {
  const origin = req.headers.get('origin');
  
  try {
    const { roomId } = await ctx.params;
    const { userId } = await requireAuth(req);

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { id: true, hostId: true, status: true },
    });

    if (!room) {
      return withCORS(NextResponse.json({ error: 'ROOM_NOT_FOUND' }, { status: 404 }), origin);
    }

    if (room.hostId !== userId) {
      return withCORS(NextResponse.json({ error: 'FORBIDDEN_NOT_HOST' }, { status: 403 }), origin);
    }

    // Update room to mark that host is viewing results
    // We'll update the room's updatedAt timestamp as a signal
    // Non-hosts will check this timestamp to know when host clicked "View Results"
    await prisma.room.update({
      where: { id: roomId },
      data: { updatedAt: new Date() },
    });

    return withCORS(
      NextResponse.json({ ok: true, viewedAt: new Date().toISOString() }),
      origin
    );
  } catch (e) {
    return withCORS(
      NextResponse.json(
        { error: 'VIEW_FAILED', details: e instanceof Error ? e.message : String(e) },
        { status: 500 }
      ),
      origin
    );
  }
}

// GET: Check if host has viewed results
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ roomId: string }> }
) {
  const origin = req.headers.get('origin');
  
  try {
    const { roomId } = await ctx.params;

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { id: true, updatedAt: true, status: true },
    });

    if (!room) {
      return withCORS(NextResponse.json({ error: 'ROOM_NOT_FOUND' }, { status: 404 }), origin);
    }

    // Check if host is viewing results
    // We check if room has been updated recently (within last 2 minutes)
    // This indicates that host clicked "View Results"
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const isViewing = room.status === 'STARTED' && room.updatedAt > twoMinutesAgo;

    return withCORS(
      NextResponse.json({ 
        isViewing,
        updatedAt: room.updatedAt.toISOString(),
        status: room.status
      }),
      origin
    );
  } catch (e) {
    return withCORS(
      NextResponse.json(
        { error: 'VIEW_CHECK_FAILED', details: e instanceof Error ? e.message : String(e) },
        { status: 500 }
      ),
      origin
    );
  }
}

