import { google as googleApis } from "googleapis";
import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { getGoogleOAuthClientForUser } from "@/lib/apps/google-calendar/oauth";

/**
 * Google Calendar actions:
 * - keep HTTP + OAuth concerns in `oauth.ts`
 * - keep "intent parsing from natural language" here (LLM structured extraction)
 */

const CreateEventSchema = z.object({
  title: z.string().min(1).default("Meeting"),
  startISO: z.string().describe("Event start time in ISO 8601"),
  endISO: z.string().describe("Event end time in ISO 8601"),
  description: z.string().optional(),
});

export async function createEventFromText({
  userId,
  input,
}: {
  userId: string;
  input: string;
}) {
  const parsed = await generateObject({
    model: google("gemini-2.5-flash"),
    schema: CreateEventSchema,
    prompt: `Extract calendar event details from user request. If duration is not specified, use 30 minutes.

User request: ${input}`,
  });

  const oauth2 = await getGoogleOAuthClientForUser(userId);
  const calendar = googleApis.calendar({ version: "v3", auth: oauth2 });

  const event = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: parsed.object.title,
      description: parsed.object.description,
      start: { dateTime: parsed.object.startISO },
      end: { dateTime: parsed.object.endISO },
    },
  });

  const link = event.data.htmlLink ?? "Created.";
  return `Created event **${event.data.summary ?? parsed.object.title}**. ${link}`;
}

export async function listUpcomingEventsFromText({
  userId,
  input,
}: {
  userId: string;
  input: string;
}) {
  const RangeSchema = z.object({
    timeMinISO: z.string().describe("ISO 8601"),
    timeMaxISO: z.string().describe("ISO 8601"),
  });

  const range = await generateObject({
    model: google("gemini-2.5-flash"),
    schema: RangeSchema,
    prompt: `Given the user request, choose a reasonable time range for listing upcoming events.
If the user doesn't specify a range, list next 7 days.

User request: ${input}`,
  });

  const oauth2 = await getGoogleOAuthClientForUser(userId);
  const calendar = googleApis.calendar({ version: "v3", auth: oauth2 });

  const res = await calendar.events.list({
    calendarId: "primary",
    timeMin: range.object.timeMinISO,
    timeMax: range.object.timeMaxISO,
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 10,
  });

  const items = res.data.items ?? [];
  if (items.length === 0) return "No upcoming events found in that range.";

  const lines = items.map((e) => {
    const start = e.start?.dateTime ?? e.start?.date ?? "unknown time";
    return `- ${e.summary ?? "Untitled"} (${start})`;
  });

  return `Here are your upcoming events:\n${lines.join("\n")}`;
}


