import { auth } from "@/lib/auth";
import { orchestrate } from "@/lib/ai/orchestrator";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const body = (await req.json()) as { message: string };
  const message = body.message;

  if (!message) {
    return new Response("Missing message", { status: 400 });
  }

  try {
    const result = await orchestrate({
      userId: session.user.id,
      latestUserInput: `Generate a short, concise title (max 5 words) for this conversation starter: "${message}"`,
      messages: [{
        id: 'title-gen',
        role: 'user',
        content: `Generate a short, concise title (max 5 words) for this conversation starter: "${message}"`
      }],
      onFinish: async () => {
        // No need to save anything for title generation
      },
    });

    // Get the AI response as text
    const text = await result.text;
    const title = text.trim().slice(0, 50);

    return new Response(JSON.stringify({ title }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error("Error generating title:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate title" }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
