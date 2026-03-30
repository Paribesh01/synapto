import type { AppConnector } from "@/lib/apps/base";
import { prisma } from "@/lib/db/prisma";
import { generateNotionAuthUrl } from "@/lib/apps/notion/oauth";
import { createPageFromText } from "@/lib/apps/notion/actions";

export const notionConnector: AppConnector = {
  id: "notion",
  name: "Notion",

  async connect(_userId: string) {
    // Connection is initiated by redirecting user to OAuth URL (see /api/apps/notion/connect).
    // This method is kept for interface completeness; actual connect flow is handled in route.
    return;
  },

  async disconnect(userId: string) {
    await prisma.connectedApp.updateMany({
      where: { userId, appId: "notion" },
      data: { status: "disconnected" },
    });
    // Keep credentials so a reconnect can reuse them if desired; in production you may want to revoke + delete.
  },

  getCapabilities() {
    return ["create_page", "search_pages"];
  },

  async handleIntent(input: string, userId: string) {
    const app = await prisma.connectedApp.findUnique({
      where: { userId_appId: { userId, appId: "notion" } },
      include: { credentials: true },
    });

    const isConnected = app?.status === "connected" && app.credentials.length > 0;
    if (!isConnected) return null;

    // Minimal routing. Orchestrator decides "notion intent" vs not; connector decides which action.
    const lower = input.toLowerCase();
    if (
      lower.includes("create") ||
      lower.includes("new") ||
      lower.includes("page") ||
      lower.includes("note")
    ) {
      return createPageFromText({ userId, input });
    }

    return null;
  },
};

export async function getNotionConnectUrl(userId: string) {
  return generateNotionAuthUrl(userId);
}
