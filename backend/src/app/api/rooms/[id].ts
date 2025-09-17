import { prisma } from "@/lib/db";

export async function GET(_: Request, { params }: { params: { id: string }}) {
  const room = await prisma.room.findUnique({ where: { id: params.id }});
  if (!room) return new Response(null, { status: 404 });
  return Response.json(room);
}

export async function PATCH(req: Request, { params }: { params: { id: string }}) {
  const payload = await req.json();
  const room = await prisma.room.update({ where: { id: params.id }, data: payload });
  return Response.json(room);
}

export async function DELETE(_: Request, { params }: { params: { id: string }}) {
  await prisma.room.delete({ where: { id: params.id }});
  return new Response(null, { status: 204 });
}
