import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { getNotionClientForUser } from "@/lib/apps/notion/oauth";
import { Client } from "@notionhq/client";

const CreatePageSchema = z.object({
  title: z.string().min(1).default("New Page"),
  content: z.string().optional(),
});

const SearchPagesSchema = z.object({
  query: z.string().min(1).default("search query"),
});

export async function createPageFromText({
  userId,
  input,
}: {
  userId: string;
  input: string;
}) {
  const parsed = await generateObject({
    model: google("gemini-2.5-flash"),
    schema: CreatePageSchema,
    prompt: `Extract page details from user request for creating a Notion page.

User request: ${input}

Extract:
- title: Page title
- content: Page content (optional)`,
  });

  const { accessToken } = await getNotionClientForUser(userId);
  const notion = new Client({ auth: accessToken });

  try {
    // First, let's check if we can access the Notion API
    const user = await notion.users.me({});
    console.log("Notion user info:", user);

    // Search for pages in the user's workspace to find a suitable parent
    const searchResponse = await notion.search({
      filter: {
        property: "object",
        value: "page",
      },
      page_size: 10, // Get first 10 pages
      sort: {
        direction: "descending",
        timestamp: "last_edited_time",
      },
    });
    
    if (searchResponse.results.length === 0) {
      throw new Error("No pages found in your Notion workspace. Please create a page first, then try again.");
    }
    
    // Use the most recently edited page as the parent
    const parentPage = searchResponse.results[0];
    const parentPageId = parentPage.id;
    
    // Type guard to ensure we have a full page object with properties
    let parentPageTitle = "Untitled";
    if ('properties' in parentPage && parentPage.properties?.title) {
      const titleProperty = parentPage.properties.title as any;
      if (titleProperty?.title?.[0]?.text?.content) {
        parentPageTitle = titleProperty.title[0].text.content;
      }
    }
    
    console.log("Using parent page:", parentPageId, parentPageTitle);

    // Create the page in Notion
    const response = await notion.pages.create({
      parent: { type: "page_id", page_id: parentPageId },
      properties: {
        title: {
          title: [
            {
              text: {
                content: parsed.object.title,
              },
            },
          ],
        },
      },
      children: parsed.object.content
        ? [
            {
              object: "block",
              type: "paragraph",
              paragraph: {
                rich_text: [
                  {
                    type: "text",
                    text: {
                      content: parsed.object.content,
                    },
                  },
                ],
              },
            },
          ]
        : [],
    });

    console.log("Created Notion page:", response);
    return `✅ Created page **${parsed.object.title}** in Notion (under "${parentPageTitle}")!`;
  } catch (error) {
    console.error("Error creating Notion page:", error);
    
    // More detailed error messages
    if (error instanceof Error) {
      if (error.message.includes("unauthorized") || error.message.includes("authentication")) {
        return "❌ Failed to create page: Notion authentication error. Please reconnect your Notion account.";
      } else if (error.message.includes("permission") || error.message.includes("forbidden")) {
        return "❌ Failed to create page: Insufficient permissions. Please make sure your Notion integration has access to create pages.";
      } else if (error.message.includes("not found") || error.message.includes("No pages found")) {
        return "❌ Failed to create page: No pages found in your Notion workspace. Please create a page first, then try again.";
      }
    }
    
    return "❌ Failed to create page in Notion. Please check your Notion connection and permissions.";
  }
}

export async function searchPagesFromText({
  userId,
  input,
}: {
  userId: string;
  input: string;
}) {
  const parsed = await generateObject({
    model: google("gemini-2.5-flash"),
    schema: SearchPagesSchema,
    prompt: `Extract search query from user request for searching Notion pages.

User request: ${input}

Extract:
- query: Search term for pages`,
  });

  const { accessToken } = await getNotionClientForUser(userId);
  const notion = new Client({ auth: accessToken });

  try {
    // Search for pages in Notion
    const response = await notion.search({
      query: parsed.object.query,
      filter: {
        property: "object",
        value: "page",
      },
    });

    if (response.results.length === 0) {
      return `No pages found matching: **${parsed.object.query}**`;
    }

    const pageTitles = response.results
      .map((page: any) => {
        const title = page.properties?.title?.title?.[0]?.text?.content || "Untitled";
        return `• ${title}`;
      })
      .join("\n");

    return `Found ${response.results.length} page(s) matching **${parsed.object.query}**:\n\n${pageTitles}`;
  } catch (error) {
    console.error("Error searching Notion pages:", error);
    return "Failed to search pages. Please check your Notion connection and permissions.";
  }
}
