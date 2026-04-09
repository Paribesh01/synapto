import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

export async function DELETE(
  req: Request,
  { params }: { params: { chatId: string } },
) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const chat = await prisma.chat.findFirst({
    where: { id: params.chatId, userId: session.user.id },
    select: { id: true },
  });
  if (!chat) return new Response("Chat not found", { status: 404 });

  await prisma.chat.delete({ where: { id: params.chatId } });

  return new Response(null, { status: 204 });
}

export async function PATCH(
  req: Request,
  { params }: { params: { chatId: string } },
) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const chat = await prisma.chat.findFirst({
    where: { id: params.chatId, userId: session.user.id },
    select: { id: true },
  });
  if (!chat) return new Response("Chat not found", { status: 404 });

  const body = (await req.json().catch(() => ({}))) as { title?: string };
  if (!body.title?.trim()) return new Response("Missing title", { status: 400 });

  const updated = await prisma.chat.update({
    where: { id: params.chatId },
    data: { title: body.title.trim() },
    select: { id: true, title: true },
  });

  return Response.json(updated);
}
