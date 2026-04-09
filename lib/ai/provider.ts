import { google } from "@ai-sdk/google";
import { xai } from "@ai-sdk/xai";

const PROVIDER = (process.env.AI_PROVIDER ?? "gemini") as "gemini" | "grok";

export function getModel() {
  if (PROVIDER === "grok") {
    return xai("grok-4-1-fast-non-reasoning");
  }
  return google("gemini-2.5-flash");
}
