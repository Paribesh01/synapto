import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

export async function GET(
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

  const messages = await prisma.message.findMany({
    where: { chatId: params.chatId },
    orderBy: { createdAt: "asc" },
    select: { id: true, role: true, content: true, createdAt: true },
  });

  return Response.json({ messages });
}

export async function POST(
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

  const body = await req.json();
  const { role, content } = body;

  if (!role || !content) {
    return new Response("Missing role or content", { status: 400 });
  }

  const message = await prisma.message.create({
    data: {
      chatId: params.chatId,
      role,
      content,
    },
    select: { id: true, role: true, content: true, createdAt: true },
  });

  return Response.json({ message });
}


