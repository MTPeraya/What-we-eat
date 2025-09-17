import { prisma } from "@/lib/db";
import { voteSchema } from "@/lib/validation";

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = voteSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.format() }), { status: 400 });
  }
  const { roomId, restaurantId, decision } = parsed.data;
  const vote = await prisma.vote.upsert({
    where: { roomId_userId_restaurantId: { roomId, userId: "TEMP_USER", restaurantId } },
    update: { decision },
    create: { roomId, userId: "TEMP_USER", restaurantId, decision }
  });
  return Response.json(vote, { status: 201 });
}
