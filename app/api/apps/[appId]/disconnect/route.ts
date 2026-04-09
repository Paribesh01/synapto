import { auth } from "@/lib/auth";
import { getConnectorById } from "@/lib/apps/registry";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ appId: string }> },
) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { appId } = await params;
  const connector = getConnectorById(appId);
  if (!connector) return new Response("Unknown app", { status: 404 });

  await connector.disconnect(session.user.id);
  return Response.json({ ok: true });
}


