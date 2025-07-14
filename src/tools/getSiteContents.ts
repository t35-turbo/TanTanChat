/**
 * Retrieve the contents of a specific webpage URL using the Exa API.
 * Supports caching for improved performance and pagination for large content.
 *
 * @param url - The URL of the webpage to retrieve contents from.
 * @param links - Number of links to include for the result (default: 1).
 * @param includeSubpages - Number of sub-pages to fetch for each result (default: 0).
 * @param imageLinks - Number of image links to retrieve (default: 0).
 * @param offset - The line offset to start reading from (default: 0).
 * @param numLines - The number of lines to get from the offset (default: 100).
 *
 * @returns The webpage content with total length info and pagination support.
 */
import Exa from "exa-js";
import { z } from "zod/v4";
import { SearchWebArgs } from "./searchWeb";
import { db } from "../db";
import { pageContents } from "../db/schema";
import { eq, gte } from "drizzle-orm";
const REFRESH_PAGE_TIME_DIFF = parseInt(process.env.REFRESH_PAGE_TIME_DIFF ?? "300", 10);

// -------------------- Types --------------------
export interface getSiteContentsQueryArgs {
  /** The URL of the webpage to retrieve contents from. */
  url: string;
  /** The number of links to include for each result (default: 1). */
  links?: number;
  /** The number of subpages to include for each result (default: 0). */
  includeSubpages?: number;
  /** The number of image links to include for each result (default: 0). */
  imageLinks?: number;
  /** The offset on the page (set offset if reading another portion of the page after getting initial top part) (default: 0) */
  offset?: number;
  /** The number of lines to get from the offset (default: 100) */
  numLines?: number;
}

// Zod schema to validate and supply defaults
const searchWebArgsSchema = z.object({
  url: z.string(),
  links: z.number().int().nonnegative().default(1),
  includeSubpages: z.number().int().nonnegative().default(0),
  imageLinks: z.number().int().nonnegative().default(0),
  offset: z.number().int().nonnegative().default(0), // TODO: negative offset support
  numLines: z.number().int().nonnegative().default(100),
});

// Time in milliseconds for how long cached page content is considered fresh

/**
 * Check if a page URL exists in cache and is still fresh based on REFRESH_PAGE_TIME_DIFF
 * @param url - The URL to check in the cache
 * @returns The cached page contents if fresh, null otherwise
 */
async function checkCachedPageContents(url: string) {
  const cutoffTime = new Date(Date.now() - REFRESH_PAGE_TIME_DIFF);

  const cachedPage = await db.select().from(pageContents).where(eq(pageContents.url, url)).limit(1);

  if (cachedPage.length === 0) {
    return null;
  }

  const page = cachedPage[0];
  if (page.modifiedAt >= cutoffTime) {
    return page;
  }

  return null;
}

/**
 * Update or insert page contents in the cache
 * @param url - The URL to cache contents for
 * @param contents - The page contents to cache
 */
async function updateCachedPageContents(url: string, contents: string) {
  const pageInDB = await db.select().from(pageContents).where(eq(pageContents.url, url)).limit(1);

  if (pageInDB.length !== 0) {
    await db.update(pageContents).set({ contents, modifiedAt: new Date() }).where(eq(pageContents.url, url));
  } else {
    await db.insert(pageContents).values({
      url,
      contents,
      createdAt: new Date(),
      modifiedAt: new Date(),
    });
  }
}

export async function toolFunction(rawArgs: getSiteContentsQueryArgs): Promise<any> {
  // Validate and enrich args with defaults
  const { url, links, includeSubpages, imageLinks, offset, numLines } = searchWebArgsSchema.parse(rawArgs);
  let pageContents = await checkCachedPageContents(url);
  let totalLength = 0;
  if (pageContents !== null) {
    totalLength = pageContents.contents.split("\n").length;
    return "Total length: " + totalLength + " Contents: " + pageContents;
  } else {
    const exa = new Exa(process.env.EXASEARCH_API_KEY || "");
    const result = await exa.getContents([url], {
      text: true,
      context: true,
      extras: {
        links: links,
        imageLinks: imageLinks,
      },
    });
    await updateCachedPageContents(url, result.context ?? "");
    // Handle offset and numLines
    let finalContents = result.context ?? "";
    let totalLength = finalContents.split("\n").length;
    console.log(result.statuses);
    if (offset > 0 || numLines < Infinity) {
      const lines = finalContents.split("\n");
      const startLine = Math.min(offset, lines.length);
      const endLine = Math.min(startLine + numLines, lines.length);
      finalContents = lines.slice(startLine, endLine).join("\n");
    }
    if (totalLength > finalContents.split("\n").length) {
      return (
        "Total length: " +
        totalLength +
        ` (Tip): The following text content is truncated due to size (content includes lines ${offset} to lines ${offset + numLines}). Use an offset and the numLines parameter to view more. \n` +
        "Contents: " +
        finalContents
      );
    } else {
      return "Total length: " + totalLength + " Contents: " + finalContents;
    }
  }
  //const exa = new Exa(process.env.EXASEARCH_API_KEY || "");

  //return result.context;
}

// -------------------- OpenAI Tool Definition --------------------
export const definition = {
  type: "function" as const,
  function: {
    name: "getSiteContents",
    description:
      "Retrieves the contents of a specific webpage URL using Exa. Can get cached content or fetch fresh content with links and image links. Supports pagination with offset and line limits.",
    parameters: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The URL of the webpage to retrieve contents from.",
        },
        links: {
          type: "number",
          description:
            "The number of links to include for the result (default: 1). If you need more links, set this to a higher number.",
          default: 1,
        },
        includeSubpages: {
          type: "number",
          description: "The number of subpages to include for the result (default: 0).",
          default: 0,
        },
        imageLinks: {
          type: "number",
          description:
            "The number of image links to include for the result (default: 0). If you need images, set this to a higher number.",
          default: 0,
        },
        offset: {
          type: "number",
          description:
            "The offset on the page (set offset if reading another portion of the page after getting initial top part) (default: 0).",
          default: 0,
        },
        numLines: {
          type: "number",
          description:
            "The number of lines to get from the offset (default: 100). Use this to paginate through long content.",
          default: 100,
        },
      },
      required: ["url"],
    },
  },
} as const;
