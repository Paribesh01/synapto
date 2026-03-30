import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { exchangeCodeForTokens } from "@/lib/apps/notion/oauth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return new Response(`Notion authorization failed: ${error}`, { status: 400 });
  }

  if (!code) {
    return new Response("Missing authorization code", { status: 400 });
  }

  if (state !== session.user.id) {
    return new Response("Invalid state parameter", { status: 400 });
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    
    // First, ensure the ConnectedApp record exists
    const existingApp = await prisma.connectedApp.findUnique({
      where: { userId_appId: { userId: session.user.id, appId: "notion" } },
    });

    if (!existingApp) {
      // Create the ConnectedApp record first
      await prisma.connectedApp.create({
        data: {
          userId: session.user.id,
          appId: "notion",
          status: "connected",
          credentials: {
            create: [
              {
                type: "access_token",
                encryptedValue: tokens.access_token,
                expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
              },
              {
                type: "refresh_token", 
                encryptedValue: tokens.refresh_token,
                expiresAt: tokens.refresh_expires_in ? new Date(Date.now() + tokens.refresh_expires_in * 1000) : null,
              },
            ],
          },
        },
      });
    } else {
      // Update existing ConnectedApp with new credentials
      await prisma.connectedApp.update({
        where: { userId_appId: { userId: session.user.id, appId: "notion" } },
        data: {
          status: "connected",
          credentials: {
            deleteMany: {}, // Delete existing credentials
            create: [
              {
                type: "access_token",
                encryptedValue: tokens.access_token,
                expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
              },
              {
                type: "refresh_token", 
                encryptedValue: tokens.refresh_token,
                expiresAt: tokens.refresh_expires_in ? new Date(Date.now() + tokens.refresh_expires_in * 1000) : null,
              },
            ],
          },
        },
      });
    }

    // Redirect to chat page
    return new Response(null, { 
      status: 302, 
      headers: { Location: "/chat" }
    });
  } catch (error) {
    console.error("Error exchanging Notion code:", error);
    return new Response("Failed to exchange authorization code", { status: 500 });
  }
}
