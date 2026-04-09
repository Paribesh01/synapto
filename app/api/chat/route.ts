import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { orchestrate } from "@/lib/ai/orchestrator";

export const runtime = "nodejs";

function errorHandler(error: unknown) {
  if (error == null) {
    return 'unknown error';
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return JSON.stringify(error);
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const body = (await req.json()) as { chatId: string; messages: any[]; regenerate?: boolean };
  const chatId = body.chatId;
  const messages = body.messages ?? [];
  const isRegenerate = body.regenerate === true;

  // Ensure messages is an array and not undefined
  if (!Array.isArray(messages)) {
    return new Response("Invalid messages format", { status: 400 });
  }

  const chat = await prisma.chat.findFirst({
    where: { id: chatId, userId: session.user.id },
  });
  if (!chat) return new Response("Chat not found", { status: 404 });

  const last = messages[messages.length - 1];
  const latestUserInput = last?.parts?.find((part: any) => part.type === "text")?.text ?? "";

  if (!latestUserInput) {
    return new Response("Missing user message", { status: 400 });
  }

  if (isRegenerate) {
    // Delete the last assistant message so we don't accumulate duplicates
    const lastAssistant = await prisma.message.findFirst({
      where: { chatId, role: "assistant" },
      orderBy: { createdAt: "desc" },
    });
    if (lastAssistant) {
      await prisma.message.delete({ where: { id: lastAssistant.id } });
    }
  } else {
    // Save user message to database
    await prisma.message.create({
      data: { chatId, role: "user", content: latestUserInput },
    });
  }

  // The useChat hook sends messages in parts format, convert to content format for orchestrate
  const coreMessages = messages.map((msg: any) => ({
    id: msg.id,
    role: msg.role,
    content: msg.parts?.find((part: any) => part.type === "text")?.text || "",
  }));

  try {
    const result = await orchestrate({
      userId: session.user.id,
      latestUserInput,
      messages: coreMessages,
      onFinish: async ({ text }) => {
        // Save AI response to database when streaming is complete
        if (text && text.trim()) {
          await prisma.message.create({
            data: { chatId, role: "assistant", content: text.trim() },
          });
        }
      },
    });

    // Return the streaming response in format expected by useChat hook
    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Error in chat API:", error);
    
    // For non-streaming errors, return a proper error response
    return new Response(
      JSON.stringify({ 
        error: errorHandler(error)
      }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}


