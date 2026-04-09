import { auth } from "@/lib/auth";
import { getConnectorById } from "@/lib/apps/registry";
import { prisma } from "@/lib/db/prisma";
import { getGoogleCalendarConnectUrl } from "@/lib/apps/google-calendar";

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

  // Ensure a ConnectedApp row exists so UI can show the app in "disconnected" state
  // until OAuth completes and credentials are saved.
  await prisma.connectedApp.upsert({
    where: { userId_appId: { userId: session.user.id, appId } },
    create: { userId: session.user.id, appId, status: "disconnected" },
    update: { status: "disconnected" },
  });

  if (appId === "google-calendar") {
    const redirectUrl = await getGoogleCalendarConnectUrl(session.user.id);
    return Response.json({ redirectUrl });
  }

  // Generic hook for future apps:
  await connector.connect(session.user.id);
  return Response.json({ redirectUrl: null });
}


