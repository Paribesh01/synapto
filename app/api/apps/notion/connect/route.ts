import { auth } from "@/lib/auth";
import { generateNotionAuthUrl } from "@/lib/apps/notion/oauth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const authUrl = generateNotionAuthUrl(session.user.id);
  
  return Response.json({ authUrl });
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const authUrl = generateNotionAuthUrl(session.user.id);
  
  return Response.json({ redirectUrl: authUrl });
}
