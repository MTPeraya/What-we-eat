import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export async function GET(req: NextRequest) {
  const s = await getSession(req);
  if (!s) return NextResponse.json({ user: null }, { status: 200 });
  const { user } = s;
  return NextResponse.json({ user: { id: user.id, username: user.username, role: user.role } }, { status: 200 });
}
