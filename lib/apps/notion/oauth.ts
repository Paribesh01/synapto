import { prisma } from "@/lib/db/prisma";

export function generateNotionAuthUrl(userId: string) {
  const clientId = process.env.NOTION_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/apps/notion/callback`;
  
  if (!clientId || !redirectUri) {
    throw new Error("Missing NOTION_CLIENT_ID or NEXT_PUBLIC_APP_URL");
  }
  
  const authUrl = new URL("https://api.notion.com/v1/oauth/authorize");
  authUrl.searchParams.set("owner", "user");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("state", userId); // Use userId as state for security
  
  return authUrl.toString();
}

export async function exchangeCodeForTokens(code: string) {
  const clientId = process.env.NOTION_CLIENT_ID;
  const clientSecret = process.env.NOTION_CLIENT_SECRET;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/apps/notion/callback`;
  
  const response = await fetch("https://api.notion.com/v1/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code: code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to exchange code for tokens");
  }

  const tokens = await response.json();
  return tokens;
}

export async function getNotionClientForUser(userId: string) {
  const app = await prisma.connectedApp.findUnique({
    where: { userId_appId: { userId, appId: "notion" } },
    include: { credentials: true },
  });

  if (!app || app.status !== "connected" || !app.credentials.length) {
    throw new Error("Notion not connected");
  }

  const accessTokenCredential = app.credentials.find(c => c.type === "access_token");
  if (!accessTokenCredential) {
    throw new Error("No access token found");
  }

  return {
    accessToken: accessTokenCredential.encryptedValue,
  };
}
