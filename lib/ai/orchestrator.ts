import { google } from "@ai-sdk/google";
import { generateObject, streamText } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getConnectorById } from "@/lib/apps/registry";

/**
 * Orchestrator:
 * 1) Load connected apps
 * 2) Ask LLM to classify intent against connected capabilities
 * 3) If match -> call connector.handleIntent
 * 4) Otherwise -> normal streaming response
 */

const IntentSchema = z.object({
  appId: z.string().nullable(),
  capability: z.string().nullable(),
  confidence: z.number().min(0).max(1),
});

export async function orchestrate({
  userId,
  messages,
  latestUserInput,
  onFinish,
}: {
  userId: string;
  messages: any[];
  latestUserInput: string;
  onFinish?: (options: { text: string }) => void | Promise<void>;
}) {
  const connected = await prisma.connectedApp.findMany({
    where: { userId, status: "connected" },
  });

  const apps = connected
    .map((a: any) => {
      const connector = getConnectorById(a.appId);
      if (!connector) return null;
      return {
        id: connector.id,
        name: connector.name,
        capabilities: connector.getCapabilities(),
      };
    })
    .filter(Boolean) as Array<{ id: string; name: string; capabilities: string[] }>;

  // Try with gemini-2.5-flash first, fallback to gemini-2.5-flash if quota exceeded
  let intent;
  let modelUsed = "gemini-2.5-flash";
  
  try {
    intent = apps.length
      ? await generateObject({
          model: google("gemini-2.5-flash"),
          schema: IntentSchema,
          prompt: `You are an intent classifier. The user has connected these apps and capabilities:
${apps
  .map((a) => `- ${a.id} (${a.name}): ${a.capabilities.join(", ")}`)
  .join("\n")}

Given the user message, choose the best matching appId + capability, or null if none apply.
Be conservative; only return a non-null appId when very likely.

User message: ${latestUserInput}`,
        })
      : { object: { appId: null, capability: null, confidence: 0 } };
  } catch (error) {
    console.warn("Failed with gemini-2.5-flash, trying again:", error);
    modelUsed = "gemini-2.5-flash";
    intent = apps.length
      ? await generateObject({
          model: google("gemini-2.5-flash"),
          schema: IntentSchema,
          prompt: `You are an intent classifier. The user has connected these apps and capabilities:
${apps
  .map((a) => `- ${a.id} (${a.name}): ${a.capabilities.join(", ")}`)
  .join("\n")}

Given the user message, choose the best matching appId + capability, or null if none apply.
Be conservative; only return a non-null appId when very likely.

User message: ${latestUserInput}`,
        })
      : { object: { appId: null, capability: null, confidence: 0 } };
  }

  let connectorResult: string | null = null;

  if (intent.object.appId && intent.object.confidence >= 0.75) {
    const connector = getConnectorById(intent.object.appId);
    if (connector) {
      connectorResult = await connector.handleIntent(latestUserInput, userId);
    }
  }

  const system = buildSystemPrompt(apps, connectorResult);

  // Try streaming with the same model logic
  try {
    return streamText({
      model: google(modelUsed),
      system,
      messages,
      onFinish,
      onError: ({ error }) => {
        console.error(`Streaming error with ${modelUsed}:`, error);
        // The error will be handled by the AI SDK and sent to the client
      },
    });
  } catch (error) {
    console.warn(`Failed with ${modelUsed}, trying again:`, error);
    const fallbackModel = "gemini-2.5-flash";
    return streamText({
      model: google(fallbackModel),
      system,
      messages,
      onFinish,
      onError: ({ error }) => {
        console.error(`Streaming error with ${fallbackModel}:`, error);
      },
    });
  }
}

function buildSystemPrompt(
  apps: Array<{ id: string; name: string; capabilities: string[] }>,
  connectorResult: string | null,
) {
  const appList =
    apps.length === 0
      ? "No connected apps."
      : apps
          .map(
            (a) =>
              `- ${a.name} (id: ${a.id}) capabilities: ${a.capabilities.join(", ")}`,
          )
          .join("\n");

  const toolContext = connectorResult
    ? `\n\nA connected app has returned this result:\n${connectorResult}\n\nUse it to answer the user.`
    : "";

  return `You are a helpful assistant in a ChatGPT-style product.

Connected apps:
${appList}

If the user asks for something an app can do, the system may call it. If an app result is provided, incorporate it faithfully.
Keep responses concise and actionable.${toolContext}`;
}


